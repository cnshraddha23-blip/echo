import asyncio
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Header, BackgroundTasks

from backend.api.schemas import (
    RegisterRequest, LoginRequest, AuthResponse,
    ChatRequest, ChatResponse, ConversationCreate,
    PairClaimRequest, DevicePermissionsUpdate, RemoteCommandRequest,
    WorkflowCreate, MemoryCreate, ResearchQuery,
    NoteCreate, NoteUpdate, TaskCreate, TaskUpdate, ReminderCreate, ReminderUpdate,
    SettingsUpdate, ComputerToolExecuteRequest, VisualInspectRequest, VisualLoopRequest
)
from backend.services.computer_control import computer_control
from backend.services.visual_interaction import visual_engine
from backend.database.db_service import db
from backend.services.auth_service import auth_service
from backend.services.agent_orchestrator import agent_orchestrator
from backend.services.device_service import device_service
from backend.services.workflow_service import workflow_service
from backend.services.research_service import research_service
from backend.services.file_service import file_service
from backend.services.speech_service import speech_service
from backend.services.system_service import get_system_telemetry
from backend.automation.app_launcher import app_automation

router = APIRouter(prefix="/api")

_sio_emitter = None

def set_sio_emitter(emitter_fn):
    global _sio_emitter
    _sio_emitter = emitter_fn
    agent_orchestrator.set_emitter(emitter_fn)
    workflow_service.set_emitter(emitter_fn)

def emit_event(event: str, data: dict):
    if _sio_emitter:
        try:
            _sio_emitter(event, data)
        except Exception as e:
            print(f"[Emit Error] {e}")

# Helper to extract authenticated user
def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = auth_service.get_current_user(token)
        if user:
            return user["id"]
    return 1 # Fallback to default owner

# ================= AUTHENTICATION =================
@router.post("/auth/register", response_model=AuthResponse)
def register_user(req: RegisterRequest):
    success, msg, data = auth_service.register(req.username, req.password, req.display_name, req.email)
    if not success:
        return AuthResponse(success=False, message=msg)
    return AuthResponse(success=True, message=msg, token=data["token"], user=data["user"])

@router.post("/auth/login", response_model=AuthResponse)
def login_user(req: LoginRequest):
    success, msg, data = auth_service.login(req.username, req.password)
    if not success:
        return AuthResponse(success=False, message=msg)
    return AuthResponse(success=True, message=msg, token=data["token"], user=data["user"])

@router.get("/auth/me")
def get_profile(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    user = db.get_user_by_id(uid)
    if not user:
        return {"id": 1, "username": "shraddha", "display_name": "Shraddha", "role": "admin"}
    return {k: v for k, v in user.items() if k != "password_hash"}

# ================= SYSTEM HEALTH & STATUS =================
@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "Echo Multi-Agent Ecosystem Brain",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/system/info")
def get_sys_info():
    return get_system_telemetry()

@router.get("/status")
def get_assistant_status(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    prefs = db.get_preferences()
    devices = db.get_devices(user_id=uid)
    online_count = sum(1 for d in devices if d.get("status") == "online")
    return {
        "assistant_name": prefs.get("assistant_name", "Echo"),
        "user_name": prefs.get("user_name", "Shraddha"),
        "is_listening": speech_service.is_listening,
        "is_speaking": speech_service.is_speaking,
        "active_language": prefs.get("language", "en-IN"),
        "connected_devices": len(devices),
        "online_devices": online_count,
        "theme": prefs.get("theme", "light")
    }

# ================= AI CHAT & AGENT ORCHESTRATION =================
@router.post("/chat", response_model=ChatResponse)
async def process_chat(req: ChatRequest, background_tasks: BackgroundTasks, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    emit_event("processing_started", {"query": req.message})

    # Save to history if text chat
    should_save = not req.is_voice and req.conversation_id != "voice-session"
    if should_save:
        db.add_message(req.conversation_id, "user", req.message, language=req.language)

    # Route through Multi-Agent Orchestrator
    agent_res = await agent_orchestrator.route_and_execute(
        query=req.message,
        user_id=uid,
        language=req.language,
        target_device_id=req.target_device_id
    )

    resp_text = agent_res.get("response", "")
    if should_save:
        db.add_message(req.conversation_id, "assistant", resp_text, language=req.language)

    emit_event("assistant_response", {
        "response": resp_text,
        "agent": agent_res.get("agent"),
        "tools_used": agent_res.get("tools_used"),
        "data": agent_res.get("result_payload")
    })

    if req.speak_response:
        background_tasks.add_task(speech_service.speak, resp_text, req.language)

    emit_event("processing_finished", {"status": "idle"})

    return ChatResponse(
        response=resp_text,
        action="agent_executed",
        type="multi_agent",
        data=agent_res.get("result_payload"),
        agent=agent_res.get("agent"),
        language=req.language
    )

# ================= DEDICATED VOICE ENDPOINT =================
@router.post("/voice/command")
async def process_voice_command(req: ChatRequest, background_tasks: BackgroundTasks, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    emit_event("processing_started", {"query": req.message, "mode": "voice"})
    
    agent_res = await agent_orchestrator.route_and_execute(
        query=req.message,
        user_id=uid,
        language=req.language,
        target_device_id=req.target_device_id
    )
    resp_text = agent_res.get("response", "")

    emit_event("assistant_response", {
        "response": resp_text,
        "agent": agent_res.get("agent"),
        "data": agent_res.get("result_payload")
    })

    if req.speak_response:
        background_tasks.add_task(speech_service.speak, resp_text, req.language)

    emit_event("processing_finished", {"status": "idle"})

    return {
        "response": resp_text,
        "action": "voice_command_executed",
        "agent": agent_res.get("agent"),
        "data": agent_res.get("result_payload"),
        "language": req.language
    }

# ================= DEVICE MANAGEMENT & PAIRING =================
@router.get("/devices")
def list_devices(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    devices = db.get_devices(user_id=uid)
    for d in devices:
        # Check active socket session
        d["is_connected"] = device_service.is_device_online(d["id"])
        if d["is_connected"]:
            d["status"] = "online"
    return devices

@router.post("/devices/pairing-code")
def generate_pairing_code(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.generate_pairing_code(user_id=uid)

@router.post("/devices/pair")
def claim_pairing_code(req: PairClaimRequest):
    result = db.claim_pairing_code(
        pairing_code=req.pairing_code,
        device_name=req.device_name,
        os_name=req.os_name,
        companion_version=req.companion_version,
        capabilities=req.capabilities
    )
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired pairing code.")
    return result

@router.delete("/devices/{device_id}")
def remove_device(device_id: str, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    success = db.delete_device(device_id, user_id=uid)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found.")
    return {"success": True, "message": "Device removed."}

@router.put("/devices/{device_id}/permissions")
def update_permissions(device_id: str, req: DevicePermissionsUpdate):
    success = db.update_device_permissions(device_id, req.permissions)
    return {"success": success}

@router.post("/devices/command")
async def dispatch_device_command(req: RemoteCommandRequest, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return await device_service.dispatch_command(
        user_id=uid,
        target_device_id=req.target_device_id,
        command_type=req.command_type,
        payload=req.payload,
        timeout_seconds=req.timeout_seconds
    )

# ================= SPECIALIZED AGENTS =================
@router.get("/agents")
def get_agents():
    return agent_orchestrator.get_registered_agents()

@router.get("/agents/executions")
def get_agent_executions(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.get_agent_executions(user_id=uid)

# ================= WORKFLOWS =================
@router.get("/workflows")
def list_workflows(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.get_workflows(user_id=uid)

@router.post("/workflows")
def create_new_workflow(req: WorkflowCreate, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.create_workflow(
        user_id=uid,
        name=req.name,
        description=req.description,
        steps=req.steps,
        trigger_type=req.trigger_type,
        trigger_value=req.trigger_value
    )

@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return await workflow_service.execute_workflow(workflow_id, user_id=uid)

@router.get("/workflows/executions")
def get_workflow_executions(authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.get_workflow_executions(user_id=uid)

# ================= BROWSER RESEARCH =================
@router.post("/research")
def conduct_research(req: ResearchQuery):
    return research_service.generate_research_report(req.topic, language=req.language)

# ================= FILE MANAGEMENT =================
@router.get("/files")
def list_files(dir: str = ""):
    return file_service.list_files(dir)

@router.get("/files/read")
def read_file(path: str):
    res = file_service.read_file_content(path)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Cannot read file"))
    return res

@router.post("/files/summarize")
def summarize_file(path: str = Query(...)):
    return file_service.summarize_document(path)

@router.get("/files/search")
def search_files(keyword: str = Query(...)):
    return file_service.search_files(keyword)

# ================= COMPUTER CONTROL & VISUAL INTERACTION =================
@router.get("/computer/tools")
def get_computer_tools():
    return computer_control.get_tool_registry()

@router.post("/computer/execute")
async def execute_computer_tool(req: ComputerToolExecuteRequest, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    if req.target_device_id:
        cmd_res = await device_service.dispatch_command(
            uid, req.target_device_id, req.tool_name, req.parameters or {}
        )
        return cmd_res
    return computer_control.execute_tool(req.tool_name, req.parameters or {})

@router.post("/visual/screenshot")
def capture_visual_screen():
    return visual_engine.capture_screen_base64()

@router.post("/visual/inspect")
async def inspect_screen(req: VisualInspectRequest):
    shot = visual_engine.capture_screen_base64()
    if not shot.get("success"):
        return {"success": False, "error": shot.get("error")}
    analysis = await visual_engine.analyze_screen(shot.get("base64"), req.user_goal or "Inspect interface")
    return {
        "success": True,
        "screenshot_url": shot.get("image_url"),
        "width": shot.get("width"),
        "height": shot.get("height"),
        "analysis": analysis
    }

@router.post("/visual/loop")
async def trigger_visual_loop(req: VisualLoopRequest):
    return await visual_engine.execute_visual_loop(req.goal, max_steps=req.max_steps or 3)

@router.post("/visual/cancel")
def cancel_visual_task():
    visual_engine.cancel_active_task()
    speech_service.stop_speech()
    return {"status": "cancelled", "message": "Visual task and audio playback terminated."}

# ================= PERSISTENT MEMORY =================
@router.get("/memories")
def list_memories(category: Optional[str] = None, search: Optional[str] = None, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.get_memories(user_id=uid, category=category, search=search)

@router.post("/memories")
def add_memory(req: MemoryCreate, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    return db.create_memory(
        user_id=uid,
        key=req.key,
        value=req.value,
        category=req.category,
        importance=req.importance
    )

@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, authorization: Optional[str] = Header(None)):
    uid = get_current_user_id(authorization)
    success = db.delete_memory(memory_id, user_id=uid)
    return {"success": success}

# ================= CONVERSATIONS =================
@router.get("/conversations")
def list_conversations():
    return db.get_conversations()

@router.post("/conversations")
def create_new_conversation(req: ConversationCreate):
    return db.create_conversation(req.id, req.title, req.folder or "Echo Assistant")

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
    return {"status": "deleted"}

# ================= PRODUCTIVITY (NOTES, TASKS, REMINDERS) =================
@router.get("/notes")
def get_notes(category: Optional[str] = None, search: Optional[str] = None):
    return db.get_notes(category=category, search=search)

@router.post("/notes")
def create_note(req: NoteCreate):
    return db.create_note(req.title, req.content, req.category, req.is_pinned)

@router.put("/notes/{note_id}")
def update_note(note_id: int, req: NoteUpdate):
    note = db.update_note(note_id, req.title, req.content, req.category, req.is_pinned)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.delete("/notes/{note_id}")
def delete_note(note_id: int):
    success = db.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted"}

@router.get("/tasks")
def get_tasks(status: Optional[str] = None):
    return db.get_tasks(status=status)

@router.post("/tasks")
def create_task(req: TaskCreate):
    return db.create_task(req.title, req.description, req.due_date, req.priority)

@router.put("/tasks/{task_id}")
def update_task(task_id: int, req: TaskUpdate):
    task = db.update_task(task_id, req.title, req.description, req.due_date, req.priority, req.status)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    success = db.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}

@router.get("/reminders")
def get_reminders(status: Optional[str] = None):
    return db.get_reminders(status=status)

@router.post("/reminders")
def create_reminder(req: ReminderCreate):
    return db.create_reminder(req.title, req.remind_at)

@router.put("/reminders/{rem_id}")
def update_reminder(rem_id: int, req: ReminderUpdate):
    rem = db.update_reminder(rem_id, req.title, req.remind_at, req.status)
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return rem

@router.delete("/reminders/{rem_id}")
def delete_reminder(rem_id: int):
    success = db.delete_reminder(rem_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "deleted"}

# ================= SETTINGS =================
@router.get("/settings")
def get_settings():
    return db.get_preferences()

@router.put("/settings")
def update_settings(req: SettingsUpdate):
    for k, v in req.dict(exclude_unset=True).items():
        if v is not None:
            db.update_preference(k, str(v))
    return db.get_preferences()
