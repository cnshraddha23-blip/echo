import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio
import uvicorn
from contextlib import asynccontextmanager
import asyncio

from backend.config import settings
from backend.api.routes import router as api_router, set_sio_emitter
from backend.services.speech_service import speech_service
from backend.services.scheduler_service import reminder_scheduler
from backend.services.device_service import device_service

# Create python-socketio async server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Main asyncio event loop reference
_main_loop = None

def sio_emitter_adapter(event: str, data: dict):
    global _main_loop
    if _main_loop and not _main_loop.is_closed():
        try:
            asyncio.run_coroutine_threadsafe(sio.emit(event, data), _main_loop)
        except Exception as e:
            print(f"[SocketIO Emitter Threadsafe Exception]: {e}")
    else:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(sio.emit(event, data))
        except RuntimeError:
            pass

set_sio_emitter(sio_emitter_adapter)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    device_service.set_sio(sio)
    
    print(f"[*] Starting {settings.ASSISTANT_NAME} Multi-Agent Cloud Brain on main event loop...")
    reminder_scheduler.start()
    
    def on_reminder_triggered(reminder):
        sio_emitter_adapter("reminder_triggered", reminder)
    reminder_scheduler.register_trigger_callback(on_reminder_triggered)
    
    def on_speech_event(event, data):
        sio_emitter_adapter(event, data)
    speech_service.register_status_callback(on_speech_event)

    from backend.services.visual_interaction import visual_engine
    visual_engine.set_emitter(sio_emitter_adapter)

    yield
    print(f"[*] Shutting down {settings.ASSISTANT_NAME} Engine...")
    reminder_scheduler.stop()
    speech_service.stop_speech()
    visual_engine.cancel_active_task()

app = FastAPI(
    title=f"{settings.ASSISTANT_NAME} AI Multi-Agent Operating System",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routes
app.include_router(api_router)

# Mount Static Frontend Build if present
static_folder = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_folder):
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(static_folder):
    app.mount("/", StaticFiles(directory=static_folder, html=True), name="frontend")

# Mount Socket.IO to ASGI application
combined_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

@sio.event
async def connect(sid, environ):
    print(f"[Socket.IO] Client connected: {sid}")
    await sio.emit("system_status", {
        "connected": True,
        "assistant_name": settings.ASSISTANT_NAME,
        "language": settings.DEFAULT_LANGUAGE
    }, to=sid)

@sio.event
async def disconnect(sid):
    print(f"[Socket.IO] Client disconnected: {sid}")
    device_service.on_device_disconnect(sid)

@sio.on("companion_handshake")
async def on_companion_handshake(sid, data):
    """Authenticated Companion registers its socket connection."""
    device_id = data.get("device_id", f"dev_{sid[:8]}")
    name = data.get("name", "Companion Device")
    os_name = data.get("os", "Windows")
    capabilities = data.get("capabilities", [])
    version = data.get("version", "2.0.0")
    device_service.on_device_connect(sid, device_id, name, os_name, capabilities, version)
    await sio.emit("companion_ack", {"status": "authenticated", "device_id": device_id}, to=sid)

@sio.on("companion_command_result")
async def on_companion_command_result(sid, data):
    cmd_id = data.get("command_id")
    status = data.get("status", "completed")
    result = data.get("result", {})
    device_service.handle_command_result(cmd_id, status, result)

@sio.on("cancel_task")
async def on_cancel_task(sid, data=None):
    from backend.services.visual_interaction import visual_engine
    print(f"[Socket.IO] Interrupt/Cancel requested from client {sid}")
    speech_service.stop_speech()
    visual_engine.cancel_active_task()
    await sio.emit("task_cancelled", {"status": "cancelled", "by": sid})

@sio.on("start_visual_loop")
async def on_start_visual_loop(sid, data):
    from backend.services.visual_interaction import visual_engine
    goal = data.get("goal", "Inspect current computer screen")
    max_steps = data.get("max_steps", 3)
    print(f"[Socket.IO] Starting visual interaction loop for goal: '{goal}'")
    asyncio.create_task(visual_engine.execute_visual_loop(goal, max_steps=max_steps))

if __name__ == "__main__":
    uvicorn.run("backend.main:combined_asgi_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
