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

# Create python-socketio async server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print(f"[*] Starting {settings.ASSISTANT_NAME} Backend Engine...")
    reminder_scheduler.start()
    
    def on_reminder_triggered(reminder):
        asyncio.create_task(sio.emit("reminder_triggered", reminder))
    reminder_scheduler.register_trigger_callback(on_reminder_triggered)
    
    def on_speech_event(event, data):
        asyncio.create_task(sio.emit(event, data))
    speech_service.register_status_callback(on_speech_event)

    yield
    print(f"[*] Shutting down {settings.ASSISTANT_NAME} Backend Engine...")
    reminder_scheduler.stop()
    speech_service.stop_speech()

app = FastAPI(
    title=f"{settings.ASSISTANT_NAME} AI Assistant",
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

# Connect Socket.IO emitter to API routes
def sio_emitter_adapter(event: str, data: dict):
    try:
        asyncio.create_task(sio.emit(event, data))
    except Exception as e:
        print(f"[SocketIO Emitter Exception]: {e}")

set_sio_emitter(sio_emitter_adapter)

# Mount REST API Routes
app.include_router(api_router)

# Mount Static Frontend Build if present
dist_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(dist_folder):
    app.mount("/", StaticFiles(directory=dist_folder, html=True), name="frontend")

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

if __name__ == "__main__":
    uvicorn.run("backend.main:combined_asgi_app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
