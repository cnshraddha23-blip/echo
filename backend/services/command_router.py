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
    Strictly adheres to manual active language selection:
    If English (en-IN), speaks and responds in English.
    If Kannada (kn-IN), speaks and responds in Kannada.
    Never switches languages automatically.
    """

    async def execute_command(self, query: str, conversation_id: str = "default", language: str = "en-IN") -> Dict[str, Any]:
        raw_query = query.strip()
        # Clean punctuation from end of speech recognition transcripts (e.g. "Open WhatsApp.")
        q = raw_query.lower().strip(" .?!,:;\"'\n\r\t")
        # Normalize common voice speech variations
        q = q.replace("whats app", "whatsapp").replace("you tube", "youtube").replace("insta gram", "instagram")
        is_kn = (language == "kn-IN")

        # 1. System / Exit / Stop Speaking commands
        if any(w in q for w in ["stop speaking", "be quiet", "shut up", "ಮಾತನಾಡಬೇಡ", "ನಿಲ್ಲಿಸು"]):
            db.log_command(raw_query, "voice_control", "success", "stopped speaking")
            resp = "ನಾನು ಮಾತನಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇನೆ." if is_kn else "I have stopped speaking."
            return {
                "action": "stop_speaking",
                "response": resp,
                "response_kn": "ನಾನು ಮಾತನಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇನೆ.",
                "type": "control"
            }

        # 2. Mathematical Calculations (e.g. "calculate 25 * 4", "what is 500 / 5", "50 + 20")
        calc_match = re.search(r'(?:calculate|what is|compute|solve)?\s*([0-9\.\s\+\-\*\/\^\(\)\%\,]|sqrt|sin|cos|tan)+', q)
        if any(math_word in q for math_word in ["calculate", "compute", "solve", "divided by", "multiplied by", "plus", "minus"]) or (calc_match and any(op in q for op in ["+", "-", "*", "/", "^"])):
            try:
                expr = q.replace("calculate", "").replace("what is", "").replace("compute", "").replace("solve", "")
                expr = expr.replace("multiplied by", "*").replace("times", "*").replace("divided by", "/").replace("plus", "+").replace("minus", "-")
                res = safe_eval_math(expr)
                db.log_command(raw_query, "calculator", "success", f"result: {res}")
                resp = f"ಉತ್ತರ {res}." if is_kn else f"The answer is {res}."
                return {
                    "action": "calculate",
                    "response": resp,
                    "response_kn": f"ಉತ್ತರ {res}.",
                    "data": {"expression": expr.strip(), "result": res},
                    "type": "calculator"
                }
            except Exception:
                pass

        # 3. Application & Platform Launching and Closing (Supports multi-app, popup, close)
        app_cmd = app_automation.parse_app_command(q)
        has_search_kw = any(w in q for w in ["search for", "and search for", "and search", "google for", "play", "ಹುಡುಕು"])

        if (app_cmd["apps"] or app_cmd["is_close"]) and not has_search_kw:
            if app_cmd["is_close"]:
                targets = app_cmd["apps"] if app_cmd["apps"] else ["app"]
                for t in targets:
                    res = app_automation.close_app(t)
                    db.log_command(raw_query, "app_close", "success", t)
                    db.log_app_action(t, "closed")
                
                app_names = ", ".join([a.capitalize() for a in targets if a != "app"]) or "active application"
                resp = f"{app_names} ಅನ್ನು ಮುಚ್ಚಲಾಗಿದೆ." if is_kn else f"Closed {app_names}."
                return {
                    "action": "app_close",
                    "response": resp,
                    "response_kn": f"{app_names} ಅನ್ನು ಮುಚ್ಚಲಾಗಿದೆ.",
                    "data": {"closed_apps": targets},
                    "type": "automation"
                }
            else:
                app_results = []
                popped_apps = []
                new_apps = []
                for t in app_cmd["apps"]:
                    res = app_automation.launch_app(t)
                    app_results.append(res)
                    db.log_command(raw_query, "app_launch", "success", t)
                    db.log_app_action(t, "launched")
                    if res.get("popped_up"):
                        popped_apps.append(t.capitalize())
                    else:
                        new_apps.append(t.capitalize())

                all_apps = ", ".join([a.capitalize() for a in app_cmd["apps"]])
                if is_kn:
                    resp = f"{all_apps} ಅನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ."
                else:
                    if popped_apps and not new_apps:
                        resp = f"{', '.join(popped_apps)} was already running; brought to front."
                    elif popped_apps and new_apps:
                        resp = f"Brought {', '.join(popped_apps)} to the front and opening {', '.join(new_apps)}."
                    else:
                        resp = f"Opening {all_apps}."
                
                return {
                    "action": "app_launch",
                    "response": resp,
                    "response_kn": f"{all_apps} ಅನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
                    "data": {"apps": app_results, "mobile_intents": [app_automation.get_mobile_intent(a) for a in app_cmd["apps"] if app_automation.get_mobile_intent(a)]},
                    "type": "automation"
                }

        # 5. Web Searches (Google / YouTube)
        if q.startswith("search for") or q.startswith("google") or "ಹುಡುಕು" in q:
            search_term = q.replace("search for", "").replace("google", "").replace("ಹುಡುಕು", "").strip(" .?!,")
            res = app_automation.open_web_search(search_term)
            db.log_command(raw_query, "web_search", "success", search_term)
            resp = f"Google ನಲ್ಲಿ '{search_term}' ಹುಡುಕಲಾಗುತ್ತಿದೆ." if is_kn else f"Searching Google for '{search_term}'."
            return {
                "action": "web_search",
                "response": resp,
                "response_kn": f"Google ನಲ್ಲಿ '{search_term}' ಹುಡುಕಲಾಗುತ್ತಿದೆ.",
                "data": res,
                "type": "web"
            }

        if "youtube" in q and any(w in q for w in ["play", "search"]):
            search_term = q.replace("play", "").replace("search", "").replace("youtube", "").replace("on", "").replace("for", "").strip(" .?!,")
            if search_term:
                res = app_automation.open_youtube_search(search_term)
                db.log_command(raw_query, "youtube_search", "success", search_term)
                resp = f"YouTube ನಲ್ಲಿ '{search_term}' ಹುಡುಕಲಾಗುತ್ತಿದೆ." if is_kn else f"Playing '{search_term}' on YouTube."
                return {
                    "action": "youtube_search",
                    "response": resp,
                    "response_kn": f"YouTube ನಲ್ಲಿ '{search_term}' ಹುಡುಕಲಾಗುತ್ತಿದೆ.",
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
            resp = f"CPU ಬಳಕೆ {cpu}%, RAM ಬಳಕೆ {ram}%." if is_kn else f"System CPU usage is at {cpu}%, RAM is at {ram}%{bat_str}."
            return {
                "action": "system_info",
                "response": resp,
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
                resp = f"{city} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ {cond} ಮತ್ತು ತಾಪಮಾನ {temp}°C ಆಗಿದೆ." if is_kn else f"The weather in {city.capitalize()} is currently {cond} with a temperature of {temp}°C."
                return {
                    "action": "weather",
                    "response": resp,
                    "response_kn": f"{city} ನಲ್ಲಿ ಪ್ರಸ್ತುತ ಹವಾಮಾನ {cond} ಮತ್ತು ತಾಪಮಾನ {temp}°C ಆಗಿದೆ.",
                    "data": weather_data,
                    "type": "weather"
                }

        # 8. Time and Date
        if any(w in q for w in ["what time is it", "current time", "what is the date", "today's date", "ಸಮಯ ಎಷ್ಟು", "ದಿನಾಂಕ"]):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            date_str = now.strftime("%A, %B %d, %Y")
            resp = f"ಪ್ರಸ್ತುತ ಸಮಯ {time_str}, ದಿನಾಂಕ {date_str}." if is_kn else f"It is currently {time_str} on {date_str}."
            return {
                "action": "time_date",
                "response": resp,
                "response_kn": f"ಪ್ರಸ್ತುತ ಸಮಯ {time_str}, ದಿನಾಂಕ {date_str}.",
                "data": {"time": time_str, "date": date_str},
                "type": "info"
            }

        # 9. Notes Quick Command
        if q.startswith("note:") or q.startswith("save note") or q.startswith("take a note"):
            note_content = q.replace("save note", "").replace("take a note", "").replace("note:", "").strip(" .?!,")
            if note_content:
                created = db.create_note(title=f"Note from {datetime.now().strftime('%b %d, %H:%M')}", content=note_content)
                db.log_command(raw_query, "create_note", "success", note_content)
                resp = f"ಟಿಪ್ಪಣಿ ಉಳಿಸಲಾಗಿದೆ: '{note_content}'" if is_kn else f"Note saved successfully: '{note_content}'"
                return {
                    "action": "create_note",
                    "response": resp,
                    "response_kn": f"ಟಿಪ್ಪಣಿ ಉಳಿಸಲಾಗಿದೆ: '{note_content}'",
                    "data": created,
                    "type": "productivity"
                }

        # 10. Study Mode
        if "study mode" in q or "ಅಭ್ಯಾಸ ವಿಧಾನ" in q:
            app_automation.launch_app("notepad")
            app_automation.launch_app("calculator")
            pending_tasks = db.get_tasks(status="pending")
            resp = f"ಅಭ್ಯಾಸ ವಿಧಾನ ಸಕ್ರಿಯಗೊಂಡಿದೆ! ನಿಮ್ಮ ನೋಟ್‌ಪ್ಯಾಡ್ ಮತ್ತು ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ." if is_kn else f"Study Mode activated! Opened your digital notepad and calculator. You have {len(pending_tasks)} pending tasks to review."
            return {
                "action": "study_mode",
                "response": resp,
                "response_kn": f"ಅಭ್ಯಾಸ ವಿಧಾನ ಸಕ್ರಿಯಗೊಂಡಿದೆ! ನಿಮ್ಮ ನೋಟ್‌ಪ್ಯಾಡ್ ಮತ್ತು ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ.",
                "data": {"pending_tasks_count": len(pending_tasks)},
                "type": "study_mode"
            }

        # 11. Conversational Fallback to AI Service (Strict manual active language)
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
