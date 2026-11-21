import asyncio
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from backend.database.db_service import db
from backend.automation.app_launcher import app_automation
from backend.services.info_service import get_weather
from backend.services.system_service import get_system_telemetry

class WorkflowService:
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

    async def execute_workflow(self, workflow_id: str, user_id: int = 1) -> Dict[str, Any]:
        """Executes a multi-step workflow sequentially and records audit and execution logs."""
        wf = db.get_workflow_by_id(workflow_id)
        if not wf:
            return {"success": False, "error": f"Workflow '{workflow_id}' not found."}

        steps = wf.get("steps", [])
        exec_id = f"wfx_{int(time.time())}"
        self._notify("workflow_started", {"workflow_id": workflow_id, "name": wf["name"], "steps_count": len(steps)})

        step_results = []
        overall_success = True

        for idx, step in enumerate(steps):
            action = step.get("action")
            desc = step.get("desc", f"Step {idx + 1}")
            self._notify("workflow_progress", {
                "workflow_id": workflow_id,
                "step_index": idx,
                "step_desc": desc,
                "status": "executing"
            })

            result = {"action": action, "desc": desc, "status": "success"}

            try:
                if action == "open_app":
                    target = step.get("target", "calc")
                    app_res = app_automation.launch_app(target)
                    result["details"] = app_res
                elif action == "get_weather":
                    city = step.get("city", "Bengaluru")
                    weather_res = get_weather(city)
                    result["details"] = weather_res
                elif action == "get_telemetry":
                    telemetry = get_system_telemetry()
                    result["details"] = telemetry
                elif action == "read_tasks" or action == "get_tasks":
                    tasks = db.get_tasks(status="pending")
                    result["details"] = {"count": len(tasks), "tasks": tasks[:5]}
                elif action == "create_reminder":
                    title = step.get("title", "Workflow Alert")
                    mins = step.get("minutes", 30)
                    remind_time = (datetime.now() + timedelta(minutes=mins)).isoformat()
                    rem_res = db.create_reminder(title, remind_time)
                    result["details"] = rem_res
                elif action == "create_note":
                    title = step.get("title", "Workflow Output")
                    content = step.get("content", "Automated entry")
                    note_res = db.create_note(title, content, category="workflow")
                    result["details"] = note_res
                else:
                    result["details"] = {"info": "Step completed"}
                
                # Brief pause for animation pacing
                await asyncio.sleep(0.3)
            except Exception as e:
                result["status"] = "failed"
                result["error"] = str(e)
                overall_success = False

            step_results.append(result)

        status_str = "completed" if overall_success else "partial_failure"
        summary = f"Executed {len(step_results)} steps. Success: {overall_success}."
        db.log_workflow_execution(workflow_id, user_id, status_str, summary)
        db.log_audit(user_id, "execute_workflow", "workflow", workflow_id, summary)

        self._notify("workflow_completed", {
            "workflow_id": workflow_id,
            "status": status_str,
            "results": step_results
        })

        return {
            "success": overall_success,
            "workflow_id": workflow_id,
            "name": wf["name"],
            "status": status_str,
            "steps": step_results
        }

workflow_service = WorkflowService()
