from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Chat & AI Schemas ---
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: str = "default"
    language: str = "en-IN"
    speak_response: bool = False

class ChatResponse(BaseModel):
    response: str
    action: str
    type: str
    data: Optional[Dict[str, Any]] = None
    language: str = "en-IN"

# --- Voice Schemas ---
class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: Optional[str] = "en-IN"

class VoiceListenRequest(BaseModel):
    timeout: int = 5
    phrase_time_limit: int = 15
    language: Optional[str] = "en-IN"

# --- Notes Schemas ---
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

# --- Tasks Schemas ---
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

# --- Reminders Schemas ---
class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    remind_at: str  # ISO string or YYYY-MM-DDTHH:MM

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    remind_at: Optional[str] = None
    status: Optional[str] = None

# --- App Automation Schemas ---
class AppActionRequest(BaseModel):
    app_key: str

# --- Settings Schemas ---
class SettingsUpdate(BaseModel):
    preferences: Dict[str, str]

# --- Math & Translate Schemas ---
class MathRequest(BaseModel):
    expression: str

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "kn"
