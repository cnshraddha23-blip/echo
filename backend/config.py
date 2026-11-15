import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 5000
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000"
    
    # AI Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ACTIVE_AI_PROVIDER: str = "gemini"
    AI_MODEL_NAME: str = "gemini-2.5-flash"
    
    # Assistant identity
    ASSISTANT_NAME: str = "Echo"
    USER_NAME: str = "Shivaraj"
    DEFAULT_LANGUAGE: str = "en-IN"  # en-IN or kn-IN
    ENGLISH_VOICE: str = "en-IN-NeerjaNeural"
    KANNADA_VOICE: str = "kn-IN-SapnaNeural"
    SPEECH_RATE: str = "+0%"
    SPEECH_VOLUME: str = "+0%"
    
    # Database
    DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "echo.db")

    @property
    def cors_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
