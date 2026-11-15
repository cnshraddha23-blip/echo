import os
import json
from typing import List, Dict, Any, Optional
import google.genai as genai
from backend.config import settings

class AIService:
    def __init__(self):
        self.provider = settings.ACTIVE_AI_PROVIDER
        self.model_name = settings.AI_MODEL_NAME
        self.system_prompt = (
            f"You are {settings.ASSISTANT_NAME}, a world-class, sophisticated bilingual AI desktop assistant created by {settings.USER_NAME}. "
            "You are fluent in both English and Kannada. Your responses are clear, intelligent, articulate, and direct. "
            "When spoken to in Kannada (ಕನ್ನಡ), reply gracefully in natural Kannada script. "
            "When spoken to in English, reply in polished English. "
            "For voice suitability, keep conversational responses concise (under 3-4 sentences) unless asked for an in-depth explanation or code."
        )

    def get_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    def is_configured(self) -> bool:
        return bool(self.get_api_key())

    async def generate_response(self, prompt: str, conversation_history: Optional[List[Dict[str, str]]] = None, language: str = "en-IN") -> Dict[str, Any]:
        api_key = self.get_api_key()
        
        # If no API key configured, provide an intelligent deterministic fallback with clear instructions
        if not api_key:
            if "kn" in language.lower() or any('\u0c80' <= c <= '\u0cff' for c in prompt):
                return {
                    "response": f"ನಮಸ್ಕಾರ {settings.USER_NAME}! ನಾನು ಎಕೋ (Echo). ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಆದರೆ ಸಂಪೂರ್ಣ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI) ಉತ್ತರಗಳನ್ನು ಪಡೆಯಲು ದಯವಿಟ್ಟು Settings ನಲ್ಲಿ ನಿಮ್ಮ Google Gemini API Key ಅನ್ನು ನಮೂದಿಸಿ.",
                    "provider": "offline-fallback",
                    "status": "missing_api_key"
                }
            return {
                "response": f"Hello {settings.USER_NAME}, I am {settings.ASSISTANT_NAME}. I received your prompt: \"{prompt}\". To enable full conversational generative AI capabilities, please add your Google Gemini API Key in the Settings panel or .env file.",
                "provider": "offline-fallback",
                "status": "missing_api_key"
            }

        try:
            client = genai.Client(api_key=api_key)
            
            # Format context with history
            contents = []
            if conversation_history:
                for msg in conversation_history[-6:]:  # last 6 messages for context
                    role = "user" if msg.get("role") == "user" else "model"
                    contents.append(f"{role}: {msg.get('content')}")
            contents.append(f"user: {prompt}")
            
            full_prompt = f"{self.system_prompt}\n\nContext:\n" + "\n".join(contents)

            # Gemini call
            response = client.models.generate_content(
                model=self.model_name or "gemini-2.5-flash",
                contents=full_prompt
            )

            text_resp = response.text if response and hasattr(response, 'text') else "I processed your request, but received an empty response."
            return {
                "response": text_resp.strip(),
                "provider": "gemini",
                "model": self.model_name or "gemini-2.5-flash",
                "status": "success"
            }
        except Exception as e:
            err_msg = str(e)
            print(f"[AI Service Error]: {err_msg}")
            return {
                "response": f"I encountered an error communicating with the AI service: {err_msg}. Please check your API key and connection.",
                "provider": "gemini",
                "error": err_msg,
                "status": "error"
            }

ai_service = AIService()
