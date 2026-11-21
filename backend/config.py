import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5000"))
    DEBUG: bool = False
    CORS_ORIGINS: str = "*"
    
    # AI Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ACTIVE_AI_PROVIDER: str = "gemini"
    AI_MODEL_NAME: str = "gemini-flash-lite-latest"
    
    # Assistant identity
    ASSISTANT_NAME: str = "Echo"
    USER_NAME: str = "Shraddha"
    DEFAULT_LANGUAGE: str = "en-IN"  # en-IN or kn-IN
    ENGLISH_VOICE: str = "en-IN-NeerjaNeural"
    KANNADA_VOICE: str = "kn-IN-SapnaNeural"
    SPEECH_RATE: str = "+0%"
    SPEECH_VOLUME: str = "+0%"
    
    # Database (supports Embarko persistent DATA_DIR)
    DB_PATH: str = os.path.join(os.getenv("DATA_DIR", os.path.dirname(os.path.dirname(__file__))), "echo.db")

    @property
    def cors_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
