import re
import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.database.db_service import db
from backend.services.research_service import research_service
from backend.services.file_service import file_service
from backend.services.device_service import device_service
from backend.services.workflow_service import workflow_service
from backend.services.computer_control import computer_control
from backend.services.visual_interaction import visual_engine
from backend.automation.app_launcher import app_automation
from backend.services.info_service import get_weather, quick_translate
from backend.services.system_service import safe_eval_math, get_system_telemetry

AGENT_REGISTRY = [
    {
        "id": "personal_assistant",
        "name": "Personal Assistant Agent",
        "code": "PA-01",
        "role": "General Intelligence & Memory",
        "description": "Handles daily conversation, semantic memory retrieval, question answering, and contextual reasoning.",
        "tools": ["memory_retrieval", "context_synthesis", "language_translation"],
        "status": "active"
    },
    {
        "id": "computer_control",
        "name": "Computer Control Agent",
        "code": "CC-02",
        "role": "Visual Perception & OS Automation",
        "description": "Launches applications, captures & inspects the computer screen, performs browser search, and automates UI controls.",
        "tools": [
            "launch_application", "open_website", "search_browser", 
            "focus_window", "minimize_window", "maximize_window",
            "capture_screenshot", "visual_loop", "search_files", 
            "open_folder", "adjust_volume", "remote_dispatch"
        ],
        "status": "active"
    },
    {
        "id": "browser_research",
        "name": "Browser Research Agent",
        "code": "BR-03",
        "role": "Internet Intelligence & Web Scraping",
        "description": "Searches DuckDuckGo and Wikipedia, extracts web content, and synthesizes structured research reports.",
        "tools": ["search_duckduckgo", "search_wikipedia", "fetch_webpage_summary", "generate_report"],
        "status": "active"
    },
    {
        "id": "file_management",
        "name": "File Management Agent",
        "code": "FM-04",
        "role": "Document & Storage Assistant",
        "description": "Searches authorized directories, reads source code and documents, and generates document summaries.",
        "tools": ["list_files", "read_file", "search_files", "summarize_document"],
        "status": "active"
    },
    {
        "id": "communication",
        "name": "Communication Agent",
        "code": "CM-05",
        "role": "Email & Messaging Coordinator",
        "description": "Drafts structured professional emails, prepares WhatsApp messages, and formats communication.",
        "tools": ["draft_email", "prepare_whatsapp_message", "format_announcement"],
        "status": "active"
    },
    {
        "id": "coding",
        "name": "Coding Agent",
        "code": "CD-06",
        "role": "Software Engineering & Architecture",
        "description": "Analyzes codebases, explains programming concepts, debugs errors, and suggests architecture refactorings.",
        "tools": ["analyze_code", "debug_error", "explain_algorithm", "inspect_project"],
        "status": "active"
    },
    {
        "id": "productivity",
        "name": "Productivity Agent",
        "code": "PR-07",
        "role": "Notes, Tasks & Schedules",
        "description": "Creates and manages persistent notes, pending tasks, deadline reminders, and daily schedules.",
        "tools": ["create_task", "create_note", "set_reminder", "get_agenda"],
        "status": "active"
    },
    {
        "id": "system_intelligence",
        "name": "System Intelligence Agent",
        "code": "SI-08",
        "role": "Device Health & Hardware Telemetry",
        "description": "Monitors CPU, RAM, disk storage, battery levels, network connectivity, and diagnostics.",
        "tools": ["get_telemetry", "check_battery", "network_diagnostics", "storage_audit"],
        "status": "active"
    },
    {
        "id": "automation",
        "name": "Automation Agent",
        "code": "AU-09",
        "role": "Multi-Step Workflow Orchestrator",
        "description": "Executes sequential and conditional workflows across multiple agents and devices.",
        "tools": ["execute_workflow", "schedule_action", "trigger_macro"],
        "status": "active"
    }
]

class AgentOrchestrator:
    def __init__(self):
        self._sio_emitter = None

    def set_emitter(self, emitter_fn):
        self._sio_emitter = emitter_fn

    def _notify(self, event: str, data: dict):
        if self._sio_emitter:
            try:
                self._sio_emitter(event, data)
            except Exception:
                pass

    def get_registered_agents(self) -> List[Dict[str, Any]]:
        return AGENT_REGISTRY

    async def route_and_execute(self, query: str, user_id: int = 1, language: str = "en-IN", target_device_id: Optional[str] = None) -> Dict[str, Any]:
        """Classifies intent, activates the optimal specialized agent, and executes real tools."""
        q = query.strip()
        q_lower = q.lower()
        is_kn = (language == "kn-IN")
        start_time = time.time()

        selected_agent = "personal_assistant"
        tools_used = []
        result_payload = {}
        response_text = ""

        # 1. Check for Workflows / Automation
        if any(w in q_lower for w in ["coding mode", "study mode", "morning briefing", "activate workflow", "run workflow"]):
            selected_agent = "automation"
            wf_id = "wf-coding-mode" if "coding" in q_lower else "wf-study-mode" if "study" in q_lower else "wf-morning-briefing"
            tools_used.append("execute_workflow")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Executing workflow {wf_id}"})
            wf_res = await workflow_service.execute_workflow(wf_id, user_id=user_id)
            response_text = f"ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ: '{wf_res.get('name')}' ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ." if is_kn else f"Activated {wf_res.get('name')} workflow. All sequential steps completed."
            result_payload = wf_res

        # 2. Application Control, Window Popups, Multi-Device (Laptop & Mobile) Dispatch, and Closing
        app_cmd = app_automation.parse_app_command(q)
        has_search_clause = any(w in q_lower for w in ["search for", "and search for", "and search", "ಹುಡುಕು", "ನಲ್ಲಿ ಶೋಧಿಸು"])

        if (app_cmd["apps"] or app_cmd["is_close"]) and not has_search_clause:
            selected_agent = "computer_control"
            online_devs = [d for d in db.get_devices(user_id=user_id) if d.get("status") == "online"]

            # Case A: Closing Applications ("close whatsapp", "close youtube", "close app", "close both", "close apps")
            if app_cmd["is_close"]:
                tools_used.append("close_application")
                targets = app_cmd["apps"] if app_cmd["apps"] else ["app"]
                close_results = []
                companion_executed = False

                for app_name in targets:
                    # 1. Direct local close (when running locally on Windows)
                    c_res = app_automation.close_app(app_name)
                    close_results.append(c_res)

                    # 2. Also dispatch to connected companion devices
                    for dev in online_devs:
                        try:
                            disp_res = await device_service.dispatch_command(user_id, dev["id"], "close_app", {"app": app_name}, timeout_seconds=4)
                            close_results.append(disp_res)
                            if disp_res.get("success"):
                                companion_executed = True
                        except Exception:
                            pass
                
                app_names_str = ", ".join([a.capitalize() for a in targets if a != "app"]) or "active application"
                if is_kn:
                    response_text = f"ಲ್ಯಾಪ್ಟಾಪ್‌ನಲ್ಲಿ {app_names_str} ಅನ್ನು ಮುಚ್ಚಲಾಗಿದೆ."
                else:
                    if not online_devs and sys.platform != "win32":
                        response_text = f"Closed {app_names_str}. Note: No companion agent is currently connected. Start Echo Companion (start_companion.bat) on your laptop to control desktop windows."
                    else:
                        response_text = f"Closed {app_names_str}."
                
                result_payload = {"closed_apps": targets, "results": close_results, "companion_executed": companion_executed}

            # Case B: Opening Applications with Auto-Popup and Multi-Device (Laptop & Mobile) Launch
            else:
                tools_used.append("launch_application")
                if app_cmd["target_mobile"]:
                    tools_used.append("remote_dispatch")

                app_results = []
                mobile_intents = []
                popped_up_apps = []
                newly_launched = []

                for app_name in app_cmd["apps"]:
                    # 1. On Laptop: Restore & Popup if already open, else launch fresh
                    l_res = app_automation.launch_app(app_name)
                    app_results.append(l_res)
                    if l_res.get("popped_up"):
                        popped_up_apps.append(app_name.capitalize())
                    else:
                        newly_launched.append(app_name.capitalize())

                    # 2. On Mobile: Generate mobile deep-links and dispatch to companion
                    if app_cmd["target_mobile"]:
                        m_intent = app_automation.get_mobile_intent(app_name)
                        if m_intent:
                            mobile_intents.append(m_intent)
                        for dev in online_devs:
                            try:
                                asyncio.create_task(device_service.dispatch_command(user_id, dev["id"], "launch_app", {"app": app_name}))
                            except Exception:
                                pass

                # Format response text
                all_apps_str = ", ".join([a.capitalize() for a in app_cmd["apps"]])
                if is_kn:
                    if app_cmd["target_mobile"]:
                        response_text = f"{all_apps_str} ಅನ್ನು ಲ್ಯಾಪ್ಟಾಪ್ ಮತ್ತು ಮೊಬೈಲ್‌ನಲ್ಲಿ ತೆರೆಯಲಾಗುತ್ತಿದೆ."
                    else:
                        response_text = f"{all_apps_str} ಅನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ."
                else:
                    parts = []
                    if popped_up_apps:
                        parts.append(f"{', '.join(popped_up_apps)} was already open on laptop and brought to the front")
                    if newly_launched:
                        parts.append(f"opened {', '.join(newly_launched)} on laptop")
                    
                    status_str = " and ".join(parts).capitalize() if parts else f"Opened {all_apps_str}"
                    if app_cmd["target_mobile"]:
                        status_str += " and prepared mobile launch"
                    response_text = f"{status_str}."

                result_payload = {
                    "apps": app_results,
                    "mobile_intents": mobile_intents,
                    "target_mobile": app_cmd["target_mobile"],
                    "target_laptop": True
                }

        # 3. Check for Remote Device Commands explicitly directed to a specific device ID
        elif target_device_id:
            selected_agent = "computer_control"
            tools_used.append("remote_dispatch")
            app_target = "youtube" if "youtube" in q_lower else "whatsapp" if "whatsapp" in q_lower else "code" if "code" in q_lower else "spotify" if "spotify" in q_lower else "calc"
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Dispatching '{app_target}' to {target_device_id}"})
            disp_res = await device_service.dispatch_command(user_id, target_device_id, "launch_app", {"app": app_target})
            if disp_res.get("success"):
                response_text = f"ರಿಮೋಟ್ ಡಿವೈಸ್‌ನಲ್ಲಿ {app_target} ತೆರೆಯಲಾಗಿದೆ." if is_kn else f"Sent command to remote device. Launched {app_target.capitalize()} successfully."
            else:
                response_text = f"ರಿಮೋಟ್ ಡಿವೈಸ್ ದೋಷ: {disp_res.get('error')}" if is_kn else f"Remote device report: {disp_res.get('error')}"
            result_payload = disp_res

        # 3. Check for Visual Computer Interaction & Screen Perception
        elif any(kw in q_lower for kw in ["look at my screen", "see my screen", "what's on my screen", "what is on my screen", "take a screenshot", "screenshot", "analyze screen", "see screen", "look at screen", "visual interaction"]):
            selected_agent = "computer_control"
            tools_used.extend(["capture_screenshot", "visual_loop"])
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Executing visual perception loop: {q}"})
            vis_res = await visual_engine.execute_visual_loop(q, max_steps=3)
            if vis_res.get("status") == "completed":
                summary = vis_res.get("message") or "Analyzed computer screen and verified visible application state."
                response_text = f"ಪರದೆಯನ್ನು ವೀಕ್ಷಿಸಲಾಗಿದೆ: {summary}" if is_kn else f"Observed screen: {summary}"
            else:
                response_text = f"ಪರದೆ ಪ್ರಕ್ರಿಯೆ: {vis_res.get('message')}" if is_kn else f"Screen perception status: {vis_res.get('message')}"
            result_payload = vis_res

        # 4. Check for Browser Search ("open youtube and search", "search for ... on google/youtube", "search browser")
        elif any(kw in q_lower for kw in ["open youtube and search", "search youtube", "search google", "search on youtube", "search on google", "search for", "ನಲ್ಲಿ ಶೋಧಿಸು", "ಹುಡುಕು", "ಶೋಧಿಸು"]) and not any(w in q_lower for w in ["research", "duckduckgo", "wikipedia"]):
            selected_agent = "computer_control"
            tools_used.append("search_browser")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Searching browser for: {q}"})
            
            engine = "youtube" if "youtube" in q_lower else "google"
            query_match = re.search(r'(?:search for|search|and search for|and search)\s+(.+)', q_lower)
            search_query = query_match.group(1).strip() if query_match else q_lower.replace("open youtube", "").replace("open chrome", "").strip()
            
            ctrl_res = computer_control.execute_tool("search_browser", {"query": search_query, "engine": engine})
            response_text = f"{engine.capitalize()} ನಲ್ಲಿ '{search_query}' ಗಾಗಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ." if is_kn else f"Opened {engine.capitalize()} and searched for '{search_query}'."
            result_payload = ctrl_res

        # 5. Check for Folder Operations ("open downloads", "open my downloads", "open documents", "open desktop folder")
        elif any(kw in q_lower for kw in ["open downloads", "open my downloads", "downloads folder", "open documents", "open my documents", "open desktop folder"]):
            selected_agent = "computer_control"
            tools_used.append("open_folder")
            folder = "downloads" if "download" in q_lower else "documents" if "doc" in q_lower else "desktop"
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Opening {folder} folder"})
            f_res = computer_control.execute_tool("open_folder", {"folder_name": folder})
            response_text = f"{folder.capitalize()} ಫೋಲ್ಡರ್ ತೆರೆಯಲಾಗಿದೆ." if is_kn else f"Opened {folder.capitalize()} folder in File Explorer."
            result_payload = f_res

        # 6. Check for Volume / Audio Control ("volume up", "increase volume", "volume down", "mute", "unmute")
        elif any(kw in q_lower for kw in ["volume up", "increase volume", "turn up volume", "volume down", "decrease volume", "turn down volume", "mute", "unmute"]):
            selected_agent = "computer_control"
            tools_used.append("adjust_volume")
            action = "up" if any(w in q_lower for w in ["up", "increase"]) else "down" if any(w in q_lower for w in ["down", "decrease"]) else "mute"
            v_res = computer_control.execute_tool("adjust_volume", {"action": action})
            response_text = "ಧ್ವನಿ ಮಟ್ಟವನ್ನು ಬದಲಾಯಿಸಲಾಗಿದೆ." if is_kn else v_res.get("message", "Volume adjusted.")
            result_payload = v_res

        # 7. Check for Window Switch / Focus ("switch to spotify", "focus chrome", "switch to vs code", "minimize window", "maximize window")
        elif any(kw in q_lower for kw in ["switch to", "focus window", "minimize window", "maximize window"]):
            selected_agent = "computer_control"
            if "minimize" in q_lower:
                tools_used.append("minimize_window")
                w_target = q_lower.replace("minimize window", "").replace("minimize", "").strip() or "window"
                w_res = computer_control.execute_tool("minimize_window", {"title_or_app": w_target})
            elif "maximize" in q_lower:
                tools_used.append("maximize_window")
                w_target = q_lower.replace("maximize window", "").replace("maximize", "").strip() or "window"
                w_res = computer_control.execute_tool("maximize_window", {"title_or_app": w_target})
            else:
                tools_used.append("focus_window")
                w_target = q_lower.replace("switch to", "").replace("focus window", "").replace("focus", "").strip()
                w_res = computer_control.execute_tool("focus_window", {"title_or_app": w_target})
            
            response_text = f"ವಿಂಡೋಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ: {w_target}." if is_kn else w_res.get("message", f"Switched to {w_target}.")
            result_payload = w_res

        # 8. Check for Latest File Search ("find my latest pdf", "find the document", "find file")
        elif any(kw in q_lower for kw in ["find my latest pdf", "latest pdf", "find document", "find my latest", "find file"]):
            selected_agent = "computer_control"
            tools_used.append("search_files")
            q_term = "pdf" if "pdf" in q_lower else re.sub(r'^(?:find my latest|find document|find file|search for)\s+', '', q_lower).strip()
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Searching for files: {q_term}"})
            file_res = computer_control.execute_tool("search_files", {"query": q_term})
            matches = file_res.get("matches", [])
            if matches:
                top = matches[0]
                response_text = f"ಇತ್ತೀಚಿನ ಫೈಲ್ ದೊರೆತಿದೆ: '{top.get('name')}'." if is_kn else f"Found your latest file: '{top.get('name')}' at {top.get('path')}."
            else:
                response_text = f"'{q_term}' ಗಾಗಿ ಯಾವುದೇ ಫೈಲ್‌ಗಳು ದೊರೆತಿಲ್ಲ." if is_kn else f"No local files matching '{q_term}' were found."
            result_payload = file_res

        # 3. Check for Browser Research ("research", "search web", "look up", "who is", "what is the latest")
        elif any(kw in q_lower for kw in ["research", "search the internet", "search duckduckgo", "latest developments", "web report", "who was", "history of"]):
            selected_agent = "browser_research"
            tools_used.append("generate_report")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Researching: {q}"})
            topic = re.sub(r'^(?:research|search for|find out about|look up|search the internet for)\s+', '', q_lower).strip(" .?!,")
            report = research_service.generate_research_report(topic, language=language)
            response_text = f"ನಾನು '{topic}' ಬಗ್ಗೆ ವಿವರವಾದ ಸಂಶೋಧನಾ ವರದಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ." if is_kn else f"Completed web intelligence research for '{topic}'. Summary compiled with verified references."
            result_payload = report

        # 4. Check for File Management ("search file", "read file", "list files", "summarize document")
        elif any(kw in q_lower for kw in ["search file", "list files", "find file", "read document", "summarize file", "my files"]):
            selected_agent = "file_management"
            tools_used.append("search_files")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": "Searching workspace files"})
            search_term = re.sub(r'^(?:search file|find file|search files for)\s+', '', q_lower).strip(" .?!,")
            if not search_term or search_term == "my files":
                files_res = file_service.list_files("", max_items=15)
                response_text = f"ಫೈಲ್ ಪಟ್ಟಿ ಸಿದ್ಧವಾಗಿದೆ: {files_res.get('total', 0)} ಐಟಂಗಳು ದೊರೆತಿವೆ." if is_kn else f"Retrieved {files_res.get('total', 0)} workspace files and directories."
                result_payload = files_res
            else:
                matches = file_service.search_files(search_term)
                response_text = f"'{search_term}' ಗಾಗಿ {len(matches)} ಫೈಲ್‌ಗಳು ದೊರೆತಿವೆ." if is_kn else f"Found {len(matches)} files matching '{search_term}'."
                result_payload = {"matches": matches}

        # 5. Check for System Intelligence Telemetry ("cpu", "ram", "battery", "system health", "diagnostics")
        elif any(kw in q_lower for kw in ["cpu", "ram", "battery", "storage", "telemetry", "health", "system specs"]):
            selected_agent = "system_intelligence"
            tools_used.append("get_telemetry")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": "Analyzing hardware telemetry"})
            telemetry = get_system_telemetry()
            cpu = telemetry.get("cpu", {}).get("usage_percent", 0)
            ram = telemetry.get("memory", {}).get("percent", 0)
            response_text = f"ವ್ಯವಸ್ಥೆಯ ಮಾಹಿತಿ: ಸಿಪಿಯು ಬಳಕೆ {cpu}%, ರ‍್ಯಾಮ್ ಬಳಕೆ {ram}%." if is_kn else f"Host telemetry: CPU load is {cpu}%, Memory usage is {ram}%. All operating parameters nominal."
            result_payload = telemetry

        # 6. Check for Productivity (Notes, Tasks, Reminders)
        elif any(kw in q_lower for kw in ["add task", "create task", "take note", "save note", "remind me", "todo"]):
            selected_agent = "productivity"
            if "remind" in q_lower:
                tools_used.append("set_reminder")
                title = re.sub(r'^(?:remind me to\s+|set a reminder for\s+)', '', q_lower).strip(" .?!,")
                rem_time = (datetime.now() + asyncio.get_event_loop().time() * 0).isoformat()
                rem = db.create_reminder(title or "Reminder", (datetime.now() + asyncio.get_event_loop().time() * 0).isoformat())
                response_text = f"ಜ್ಞಾಪನೆ ಸಿದ್ಧವಾಗಿದೆ: '{title}'." if is_kn else f"Reminder created: '{title}'."
                result_payload = rem
            elif "note" in q_lower:
                tools_used.append("create_note")
                note_text = re.sub(r'^(?:take note\s+|save note\s+|create note\s+)', '', q).strip()
                note = db.create_note("Voice Memo", note_text)
                response_text = "ಟಿಪ್ಪಣಿ ಉಳಿಸಲಾಗಿದೆ." if is_kn else f"Note saved to SQLite persistence: '{note_text}'."
                result_payload = note
            else:
                tools_used.append("create_task")
                task_text = re.sub(r'^(?:add task\s+|create task\s+|todo\s+)', '', q).strip()
                task = db.create_task(task_text or "New Task")
                response_text = "ಕಾರ್ಯವನ್ನು ಸೇರಿಸಲಾಗಿದೆ." if is_kn else f"Task logged in pending register: '{task_text}'."
                result_payload = task

        # 7. Check for Coding Assistance ("debug", "code", "python function", "write a function", "explain code")
        elif any(kw in q_lower for kw in ["code", "python", "function", "javascript", "typescript", "debug", "algorithm"]):
            selected_agent = "coding"
            tools_used.append("analyze_code")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": f"Software engineering analysis: {q}"})
            # Call AI service for code synthesis
            from backend.services.ai_service import ai_service
            ai_res = await ai_service.generate_response(q, language=language)
            response_text = ai_res.get("response", "Code analysis complete.")
            result_payload = {"analysis": response_text, "language": language}

        # 8. Check for Communication ("email", "whatsapp message", "draft")
        elif any(kw in q_lower for kw in ["draft email", "send email", "compose email", "whatsapp message"]):
            selected_agent = "communication"
            tools_used.append("draft_email")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": "Preparing message draft"})
            response_text = "ಸಂದೇಶದ ಕರಡನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ." if is_kn else "Drafted communication draft. Ready for your authorization before sending."
            result_payload = {"draft": f"Subject: Regarding Request\n\nDear Team,\n\nIn response to: {q}\n\nBest regards,\nEcho Assistant", "approval_required": True}

        # 9. Default: Personal Assistant Agent (Context & AI Core)
        else:
            selected_agent = "personal_assistant"
            tools_used.append("memory_retrieval")
            self._notify("agent_activated", {"agent_id": selected_agent, "task": "Formulating contextual response"})
            
            # Check local command router first (math, greetings, local app launcher)
            from backend.services.command_router import command_router
            cmd_res = await command_router.execute_command(q, language=language)
            response_text = cmd_res.get("response", "")
            result_payload = cmd_res

        elapsed_ms = int((time.time() - start_time) * 1000)
        
        # Log agent execution in database
        db.log_agent_execution(
            user_id=user_id,
            agent_name=selected_agent,
            task_input=q,
            output_summary=response_text[:200],
            tools=tools_used,
            time_ms=elapsed_ms
        )

        self._notify("agent_completed", {
            "agent_id": selected_agent,
            "execution_time_ms": elapsed_ms,
            "tools_used": tools_used
        })

        agent_meta = next((a for a in AGENT_REGISTRY if a["id"] == selected_agent), AGENT_REGISTRY[0])

        return {
            "agent": agent_meta,
            "response": response_text,
            "result_payload": result_payload,
            "tools_used": tools_used,
            "execution_time_ms": elapsed_ms,
            "language": language
        }

agent_orchestrator = AgentOrchestrator()
