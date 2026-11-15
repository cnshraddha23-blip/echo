import re
from typing import Dict, Any, Optional
from datetime import datetime

from backend.database.db_service import db
from backend.automation.app_launcher import app_automation
from backend.services.system_service import safe_eval_math, get_system_telemetry
from backend.services.info_service import get_weather, quick_translate
from backend.services.ai_service import ai_service
from backend.config import settings

class CommandRouter:
    """
    High-performance deterministic command router with bilingual (English & Kannada) support.
    Routes to local tools first for zero-latency, falling back to generative AI when appropriate.
    """

    async def execute_command(self, query: str, conversation_id: str = "default", language: str = "en-IN") -> Dict[str, Any]:
        raw_query = query.strip()
        q = raw_query.lower()

        # 1. System / Exit / Stop Speaking commands
        if any(w in q for w in ["stop speaking", "be quiet", "shut up", "ಮಾತನಾಡಬೇಡ", "ನಿಲ್ಲಿಸು"]):
            db.log_command(raw_query, "voice_control", "success", "stopped speaking")
            return {
                "action": "stop_speaking",
                "response": "I have stopped speaking.",
                "response_kn": "ನಾನು ಮಾತನಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇನೆ.",
                "type": "control"
            }

        # 2. Mathematical Calculations (e.g. "calculate 25 * 4", "what is 500 / 5", "50 + 20")
        calc_match = re.search(r'(?:calculate|what is|compute|solve)?\s*([0-9\.\s\+\-\*\/\^\(\)\%\,]|sqrt|sin|cos|tan)+', q)
        if any(math_word in q for math_word in ["calculate", "compute", "solve", "divided by", "multiplied by", "plus", "minus"]) or (calc_match and any(op in q for op in ["+", "-", "*", "/", "^"])):
            try:
                # Clean up query into expression
                expr = q.replace("calculate", "").replace("what is", "").replace("compute", "").replace("solve", "")
                expr = expr.replace("multiplied by", "*").replace("times", "*").replace("divided by", "/").replace("plus", "+").replace("minus", "-")
                res = safe_eval_math(expr)
                db.log_command(raw_query, "calculator", "success", f"result: {res}")
                return {
                    "action": "calculate",
                    "response": f"The answer is {res}.",
                    "response_kn": f"ಉತ್ತರ {res}.",
                    "data": {"expression": expr.strip(), "result": res},
                    "type": "calculator"
                }
            except Exception:
                pass # Proceed to other handlers if not a valid math expression

        # 3. Application Launching (e.g. "open notepad", "launch calculator", "open vs code")
        open_match = re.search(r'(?:open|launch|start|ತೆರೆ|ಪ್ರಾರಂಭಿಸು)\s+([a-zA-Z\s]+)', q)
        if open_match:
            app_target = open_match.group(1).strip()
            # Clean common filler words
            app_target = app_target.replace("the ", "").replace("application", "").replace("app", "").strip()
            res = app_automation.launch_app(app_target)
            if res.get("success"):
                db.log_command(raw_query, "app_launch", "success", app_target)
                db.log_app_action(app_target, "launched")
                return {
                    "action": "app_launch",
                    "response": res.get("message", f"Opened {app_target}."),
                    "response_kn": f"{app_target} ಅನ್ನು ತೆರೆಯಲಾಗಿದೆ.",
                    "data": res,
                    "type": "automation"
                }

        # 4. Application Closing (e.g. "close notepad", "terminate calc")
        close_match = re.search(r'(?:close|exit|terminate|ಮುಚ್ಚು)\s+([a-zA-Z\s]+)', q)
        if close_match:
            app_target = close_match.group(1).strip().replace("the ", "").replace("application", "").replace("app", "").strip()
            res = app_automation.close_app(app_target)
            if res.get("success"):
                db.log_command(raw_query, "app_close", "success", app_target)
                db.log_app_action(app_target, "closed")
                return {
                    "action": "app_close",
                    "response": res.get("message", f"Closed {app_target}."),
                    "response_kn": f"{app_target} ಅನ್ನು ಮುಚ್ಚಲಾಗಿದೆ.",
                    "data": res,
                    "type": "automation"
                }

        # 5. Web Searches (Google / YouTube)
        if q.startswith("search for") or q.startswith("google") or "ಹುಡುಕು" in q:
            search_term = q.replace("search for", "").replace("google", "").replace("ಹುಡುಕು", "").strip()
            res = app_automation.open_web_search(search_term)
            db.log_command(raw_query, "web_search", "success", search_term)
            return {
                "action": "web_search",
                "response": f"Searching Google for '{search_term}'",
                "response_kn": f"Google ನಲ್ಲಿ '{search_term}' ಗಾಗಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ",
                "data": res,
                "type": "web"
            }

        if "youtube" in q and ("play" in q or "search" in q or "open" in q):
            search_term = q.replace("play", "").replace("search", "").replace("youtube", "").replace("on", "").strip()
            if search_term:
                res = app_automation.open_youtube_search(search_term)
                db.log_command(raw_query, "youtube_search", "success", search_term)
                return {
                    "action": "youtube_search",
                    "response": f"Searching YouTube for '{search_term}'",
                    "response_kn": f"YouTube ನಲ್ಲಿ '{search_term}' ಗಾಗಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ",
                    "data": res,
                    "type": "web"
                }

        # 6. System Status / Telemetry
        if any(w in q for w in ["system status", "battery", "cpu", "memory", "ram", "hardware", "ಗಣಕಯಂತ್ರ ಸ್ಥಿತಿ"]):
            telemetry = get_system_telemetry()
            cpu = telemetry.get("cpu", {}).get("usage_percent", 0)
            ram = telemetry.get("memory", {}).get("percent", 0)
            bat = telemetry.get("battery", {})
            bat_str = f", Battery is at {bat['percent']}%" if bat else ""
            msg = f"System CPU usage is at {cpu}%, RAM is at {ram}%{bat_str}."
            return {
                "action": "system_info",
                "response": msg,
                "response_kn": f"CPU ಬಳಕೆ {cpu}%, RAM ಬಳಕೆ {ram}%.",
                "data": telemetry,
                "type": "system"
            }

        # 7. Weather Info
        if "weather" in q or "ಹವಾಮಾನ" in q:
            city_match = re.search(r'(?:in|for|at|ನಗರದ)\s+([a-zA-Z]+)', q)
            city = city_match.group(1) if city_match else "Bengaluru"
            weather_data = get_weather(city)
            if weather_data.get("success"):
                temp = weather_data.get("temp_c")
                cond = weather_data.get("condition")
                return {
                    "action": "weather",
                    "response": f"The weather in {city.capitalize()} is currently {cond} with a temperature of {temp}°C.",
                    "response_kn": f"{city} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ {cond} ಮತ್ತು ತಾಪಮಾನ {temp}°C ಆಗಿದೆ.",
                    "data": weather_data,
                    "type": "weather"
                }

        # 8. Time and Date
        if any(w in q for w in ["what time is it", "current time", "what is the date", "today's date", "ಸಮಯ ಎಷ್ಟು", "ದಿನಾಂಕ"]):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            date_str = now.strftime("%A, %B %d, %Y")
            return {
                "action": "time_date",
                "response": f"It is currently {time_str} on {date_str}.",
                "response_kn": f"ಪ್ರಸ್ತುತ ಸಮಯ {time_str}, ದಿನಾಂಕ {date_str}.",
                "data": {"time": time_str, "date": date_str},
                "type": "info"
            }

        # 9. Notes Quick Command
        if q.startswith("note:") or q.startswith("save note") or q.startswith("take a note"):
            note_content = q.replace("save note", "").replace("take a note", "").replace("note:", "").strip()
            if note_content:
                created = db.create_note(title=f"Note from {datetime.now().strftime('%b %d, %H:%M')}", content=note_content)
                db.log_command(raw_query, "create_note", "success", note_content)
                return {
                    "action": "create_note",
                    "response": f"Note saved successfully: '{note_content}'",
                    "response_kn": f"ಟಿಪ್ಪಣಿ ಉಳಿಸಲಾಗಿದೆ: '{note_content}'",
                    "data": created,
                    "type": "productivity"
                }

        # 10. Study Mode (Workflow activation)
        if "study mode" in q or "ಅಭ್ಯಾಸ ವಿಧಾನ" in q:
            # Open configured study tools (Notepad, Browser, Calculator)
            app_automation.launch_app("notepad")
            app_automation.launch_app("calculator")
            pending_tasks = db.get_tasks(status="pending")
            return {
                "action": "study_mode",
                "response": f"Study Mode activated! Opened your digital notepad and calculator. You have {len(pending_tasks)} pending tasks to review.",
                "response_kn": f"ಅಭ್ಯಾಸ ವಿಧಾನ ಸಕ್ರಿಯಗೊಂಡಿದೆ! ನಿಮ್ಮ ನೋಟ್‌ಪ್ಯಾಡ್ ಮತ್ತು ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ.",
                "data": {"pending_tasks_count": len(pending_tasks)},
                "type": "study_mode"
            }

        # 11. Conversational Fallback to AI Service
        history = db.get_messages(conversation_id, limit=6)
        ai_resp = await ai_service.generate_response(raw_query, conversation_history=history, language=language)
        
        db.log_command(raw_query, "ai_chat", ai_resp.get("status", "success"), ai_resp.get("provider", "gemini"))
        return {
            "action": "ai_chat",
            "response": ai_resp.get("response", "I could not formulate a response."),
            "data": ai_resp,
            "type": "ai"
        }

command_router = CommandRouter()
