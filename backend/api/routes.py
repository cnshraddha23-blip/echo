import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from backend.api.schemas import (
    ChatRequest, ChatResponse, SpeakRequest, VoiceListenRequest,
    NoteCreate, NoteUpdate, TaskCreate, TaskUpdate,
    ReminderCreate, ReminderUpdate, AppActionRequest,
    SettingsUpdate, MathRequest, TranslateRequest
)
from backend.database.db_service import db
from backend.services.command_router import command_router
from backend.services.speech_service import speech_service
from backend.services.system_service import safe_eval_math, get_system_telemetry
from backend.services.info_service import get_weather, quick_translate
from backend.automation.app_launcher import app_automation

router = APIRouter(prefix="/api")

# Reference to the SocketIO server emitter function
_sio_emitter = None

def set_sio_emitter(emitter_fn):
    global _sio_emitter
    _sio_emitter = emitter_fn

def emit_event(event: str, data: dict):
    if _sio_emitter:
        try:
            _sio_emitter(event, data)
        except Exception as e:
            print(f"[Emit Error] {e}")

# ================= SYSTEM ENDPOINTS =================
@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "Echo Assistant Backend",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/system/info")
def get_sys_info():
    return get_system_telemetry()

@router.get("/status")
def get_assistant_status():
    prefs = db.get_preferences()
    return {
        "assistant_name": prefs.get("assistant_name", "Echo"),
        "user_name": prefs.get("user_name", "Shivaraj"),
        "is_listening": speech_service.is_listening,
        "is_speaking": speech_service.is_speaking,
        "active_language": prefs.get("language", "en-IN"),
        "theme": prefs.get("theme", "light")
    }

# ================= AI & CHAT ENDPOINTS =================
@router.post("/chat", response_model=ChatResponse)
async def process_chat(req: ChatRequest, background_tasks: BackgroundTasks):
    emit_event("processing_started", {"query": req.message})
    
    # Store user message in history
    db.add_message(req.conversation_id, "user", req.message, language=req.language)
    
    # Execute through CommandRouter
    cmd_res = await command_router.execute_command(req.message, conversation_id=req.conversation_id, language=req.language)
    resp_text = cmd_res.get("response", "")
    
    # Store assistant message in history
    db.add_message(req.conversation_id, "assistant", resp_text, language=req.language)
    
    emit_event("assistant_response", {
        "response": resp_text,
        "action": cmd_res.get("action"),
        "type": cmd_res.get("type"),
        "data": cmd_res.get("data")
    })
    
    # Speak only if explicitly requested by client call (speak_response=True)
    if req.speak_response:
        background_tasks.add_task(speech_service.speak, resp_text, req.language)
        
    emit_event("processing_finished", {"status": "idle"})

    return ChatResponse(
        response=resp_text,
        action=cmd_res.get("action", "chat"),
        type=cmd_res.get("type", "chat"),
        data=cmd_res.get("data"),
        language=req.language
    )

@router.get("/conversations")
def list_conversations():
    return db.get_conversations()

@router.get("/conversations/{conv_id}")
def get_conversation_messages(conv_id: str, limit: int = Query(50, ge=1, le=200)):
    return {
        "conversation_id": conv_id,
        "messages": db.get_messages(conv_id, limit=limit)
    }

@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    success = db.delete_conversation(conv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "message": f"Conversation {conv_id} deleted."}

# ================= VOICE ENDPOINTS =================
@router.post("/voice/start")
def start_voice_listening(req: VoiceListenRequest):
    """Trigger microphone capture in a background-friendly way."""
    def _listen():
        res = speech_service.capture_audio(timeout=req.timeout, phrase_time_limit=req.phrase_time_limit, language=req.language)
        if res.get("success"):
            emit_event("speech_recognized", {"text": res["text"], "language": res["language"]})
        else:
            emit_event("microphone_error", {"error": res.get("error")})

    import threading
    t = threading.Thread(target=_listen, daemon=True)
    t.start()
    return {"success": True, "message": "Microphone listening started"}

@router.post("/voice/stop")
def stop_voice_listening():
    speech_service.is_listening = False
    emit_event("microphone_status", {"status": "idle"})
    return {"success": True, "message": "Voice listening stopped"}

@router.post("/voice/speak")
def speak_text(req: SpeakRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(speech_service.speak, req.text, req.language)
    return {"success": True, "message": f"Speaking: '{req.text[:40]}...'"}

@router.post("/voice/stop-speaking")
def stop_speaking():
    speech_service.stop_speech()
    emit_event("assistant_stopped", {"status": "idle"})
    return {"success": True, "message": "Speech playback stopped"}

# ================= NOTES ENDPOINTS =================
@router.get("/notes")
def list_notes(search: Optional[str] = None):
    return db.get_notes(search=search)

@router.post("/notes")
def create_note(note: NoteCreate):
    created = db.create_note(title=note.title, content=note.content, category=note.category, is_pinned=note.is_pinned)
    emit_event("notes_updated", {"action": "created", "note": created})
    return created

@router.put("/notes/{note_id}")
def update_note(note_id: int, note: NoteUpdate):
    updated = db.update_note(note_id, title=note.title, content=note.content, category=note.category, is_pinned=note.is_pinned)
    if not updated:
        raise HTTPException(status_code=404, detail="Note not found")
    emit_event("notes_updated", {"action": "updated", "note": updated})
    return updated

@router.delete("/notes/{note_id}")
def delete_note(note_id: int):
    success = db.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    emit_event("notes_updated", {"action": "deleted", "id": note_id})
    return {"success": True, "message": f"Note {note_id} deleted."}

# ================= TASKS ENDPOINTS =================
@router.get("/tasks")
def list_tasks(status: Optional[str] = None):
    return db.get_tasks(status=status)

@router.post("/tasks")
def create_task(task: TaskCreate):
    created = db.create_task(title=task.title, description=task.description, due_date=task.due_date, priority=task.priority)
    emit_event("tasks_updated", {"action": "created", "task": created})
    return created

@router.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    updated = db.update_task(task_id, title=task.title, description=task.description, due_date=task.due_date, priority=task.priority, status=task.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    emit_event("tasks_updated", {"action": "updated", "task": updated})
    return updated

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    success = db.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    emit_event("tasks_updated", {"action": "deleted", "id": task_id})
    return {"success": True, "message": f"Task {task_id} deleted."}

# ================= REMINDERS ENDPOINTS =================
@router.get("/reminders")
def list_reminders(status: Optional[str] = None):
    return db.get_reminders(status=status)

@router.post("/reminders")
def create_reminder(reminder: ReminderCreate):
    created = db.create_reminder(title=reminder.title, remind_at=reminder.remind_at)
    emit_event("reminders_updated", {"action": "created", "reminder": created})
    return created

@router.put("/reminders/{rem_id}")
def update_reminder(rem_id: int, reminder: ReminderUpdate):
    updated = db.update_reminder(rem_id, title=reminder.title, remind_at=reminder.remind_at, status=reminder.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Reminder not found")
    emit_event("reminders_updated", {"action": "updated", "reminder": updated})
    return updated

@router.delete("/reminders/{rem_id}")
def delete_reminder(rem_id: int):
    success = db.delete_reminder(rem_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    emit_event("reminders_updated", {"action": "deleted", "id": rem_id})
    return {"success": True, "message": f"Reminder {rem_id} deleted."}

# ================= APPLICATION AUTOMATION =================
@router.get("/apps")
def list_apps():
    return app_automation.get_allowed_apps()

@router.post("/apps/launch")
def launch_application(req: AppActionRequest):
    res = app_automation.launch_app(req.app_key)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to launch application"))
    db.log_app_action(req.app_key, "launched")
    return res

@router.post("/apps/close")
def close_application(req: AppActionRequest):
    res = app_automation.close_app(req.app_key)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to close application"))
    db.log_app_action(req.app_key, "closed")
    return res

# ================= TOOLS: CALCULATOR, WEATHER, TRANSLATE =================
@router.post("/tools/calculate")
def calculate_expression(req: MathRequest):
    try:
        val = safe_eval_math(req.expression)
        return {"expression": req.expression, "result": val}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tools/weather")
def fetch_weather(city: str = Query("Bengaluru")):
    res = get_weather(city)
    return res

@router.post("/tools/translate")
def translate_text(req: TranslateRequest):
    res = quick_translate(req.text, req.source_lang, req.target_lang)
    return res

# ================= SETTINGS & PREFERENCES =================
@router.get("/settings")
def get_settings():
    return db.get_preferences()

@router.put("/settings")
def update_settings(req: SettingsUpdate):
    for k, v in req.preferences.items():
        db.update_preference(k, str(v))
    emit_event("settings_updated", req.preferences)
    return {"success": True, "preferences": db.get_preferences()}
