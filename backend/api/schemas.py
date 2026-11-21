from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Authentication Schemas ---
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    display_name: Optional[str] = "User"
    email: Optional[str] = ""

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

# --- Chat & AI Schemas ---
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: str = "default"
    language: str = "en-IN"
    speak_response: bool = False
    is_voice: bool = False
    target_device_id: Optional[str] = None

class ConversationCreate(BaseModel):
    id: str
    title: str
    folder: Optional[str] = "Echo Assistant"

class ChatResponse(BaseModel):
    response: str
    action: str
    type: str
    data: Optional[Dict[str, Any]] = None
    agent: Optional[Dict[str, Any]] = None
    language: str = "en-IN"

# --- Device Schemas ---
class PairClaimRequest(BaseModel):
    pairing_code: str = Field(..., min_length=6, max_length=10)
    device_name: str = "Desktop Device"
    os_name: str = "Windows"
    companion_version: str = "2.0.0"
    capabilities: Optional[List[str]] = None

class DevicePermissionsUpdate(BaseModel):
    permissions: List[str]

class RemoteCommandRequest(BaseModel):
    target_device_id: str
    command_type: str = "launch_app" # 'launch_app', 'close_app', 'get_telemetry', 'search_files', 'ping'
    payload: Dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: int = 15

# --- Workflows Schemas ---
class WorkflowStep(BaseModel):
    action: str
    target: Optional[str] = None
    desc: Optional[str] = None
    city: Optional[str] = None
    minutes: Optional[int] = None

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    trigger_type: str = "manual"
    trigger_value: str = ""
    steps: List[Dict[str, Any]]

# --- Memory Schemas ---
class MemoryCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=1000)
    category: str = "preference" # 'preference', 'fact', 'project', 'productivity'
    importance: int = Field(default=3, ge=1, le=5)

# --- Research & File Schemas ---
class ResearchQuery(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    language: str = "en-IN"

class FileReadQuery(BaseModel):
    path: str

class FileSearchQuery(BaseModel):
    keyword: str

# --- Notes, Tasks, Reminders ---
class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    category: str = "general"
    is_pinned: bool = False

class NoteUpdate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    is_pinned: Optional[bool] = None

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    due_date: Optional[str] = None
    priority: str = "medium"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    remind_at: str

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    remind_at: Optional[str] = None
    status: Optional[str] = None

class SettingsUpdate(BaseModel):
    assistant_name: Optional[str] = None
    user_name: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    speech_rate: Optional[str] = None
    auto_speak_responses: Optional[str] = None
    wake_word_enabled: Optional[str] = None
    active_ai_provider: Optional[str] = None
    gemini_api_key: Optional[str] = None

# --- Computer Control & Visual Perception Schemas ---
class ComputerToolExecuteRequest(BaseModel):
    tool_name: str
    parameters: Optional[Dict[str, Any]] = None
    target_device_id: Optional[str] = None

class VisualInspectRequest(BaseModel):
    user_goal: Optional[str] = "Inspect active desktop controls"
    target_device_id: Optional[str] = None

class VisualLoopRequest(BaseModel):
    goal: str = Field(..., min_length=2)
    max_steps: Optional[int] = 5
    target_device_id: Optional[str] = None

