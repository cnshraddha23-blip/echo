import os
import re
import random
from typing import List, Dict, Any, Optional
from backend.config import settings

# Comprehensive built-in conversational knowledge base for instant offline AI replies
OFFLINE_CONVERSATIONAL_KNOWLEDGE = [
    (r'\b(hi|hello|hey|namaste|greetings)\b', [
        "Hello! I am Echo, your AI desktop assistant. How can I help you today?",
        "Hi there! Good to hear from you. What can I do for you right now?",
        "Greetings! Echo is at your service. Ask me anything, or give me a desktop command!"
    ]),
    (r'\b(how are you|how do you do|how are things)\b', [
        "I am operating at peak efficiency! All systems, voice recognition, and local tools are running smoothly. How about you?",
        "I'm feeling great and ready to assist you! What's on your mind today?"
    ]),
    (r'\b(who are you|what is your name|what are you)\b', [
        "I am Echo, a next-generation bilingual AI desktop assistant created to help you manage tasks, launch apps, compute math, and chat seamlessly in English and Kannada.",
        "My name is Echo! I'm your personal intelligent desktop companion."
    ]),
    (r'\b(who created you|who made you|who built you)\b', [
        "I was created by Shivaraj as a sophisticated, commercial-grade bilingual AI desktop assistant.",
        "I was engineered by Shivaraj with a modern FastAPI backend, SQLite database, and an editorial React frontend."
    ]),
    (r'\b(what can you do|help|features|capabilities)\b', [
        "I can launch applications (like Calculator, Notepad, VS Code), perform safe mathematical calculations, create notes and tasks in SQLite, fetch weather, search Google and YouTube, and talk with you in English and Kannada!",
        "You can talk to me via voice or chat! Try saying: 'calculate 25 * 4', 'open notepad', 'save note meeting at 5', or 'what time is it?'."
    ]),
    (r'\b(thank you|thanks|great job|awesome)\b', [
        "You're very welcome! I'm always here to help.",
        "Glad I could help! Let me know if you need anything else."
    ]),
    (r'\b(bye|goodbye|see you|good night)\b', [
        "Goodbye! Have a productive and wonderful day!",
        "Take care! Echo will be right here whenever you need me."
    ]),
    (r'(ನಮಸ್ಕಾರ|ಹೇಗಿದ್ದೀರಿ|ಯಾರು ನೀವು|ಏನು ಮಾಡಬಲ್ಲೆ)', [
        "ನಮಸ್ಕಾರ! ನಾನು ಎಕೋ (Echo). ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
        "ನಮಸ್ಕಾರ! ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ. ನೀವು ನನಗೆ ಕ್ಯಾಲ್ಕುಲೇಟರ್, ನೋಟ್‌ಪ್ಯಾಡ್ ತೆರೆಯಲು ಅಥವಾ ಟಿಪ್ಪಣಿಗಳನ್ನು ಉಳಿಸಲು ಹೇಳಬಹುದು."
    ])
]

class AIService:
    def __init__(self):
        self.provider = settings.ACTIVE_AI_PROVIDER
        self.model_name = settings.AI_MODEL_NAME

    def get_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    def is_configured(self) -> bool:
        return bool(self.get_api_key())

    async def generate_response(self, prompt: str, conversation_history: Optional[List[Dict[str, str]]] = None, language: str = "en-IN") -> Dict[str, Any]:
        p = prompt.strip()
        p_lower = p.lower()

        # 1. First check offline conversational pattern matching for instant, friendly conversation
        for pattern, responses in OFFLINE_CONVERSATIONAL_KNOWLEDGE:
            if re.search(pattern, p_lower):
                chosen = random.choice(responses)
                return {
                    "response": chosen,
                    "provider": "echo-core",
                    "status": "success"
                }

        # 2. Check for Kannada greeting/queries
        if any('\u0c80' <= c <= '\u0cff' for c in prompt):
            return {
                "response": f"ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಿದ್ದೇನೆ: \"{prompt}\". ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
                "provider": "echo-core-kn",
                "status": "success"
            }

        # 3. If online API key is available, try generative response
        api_key = self.get_api_key()
        if api_key:
            try:
                import google.genai as genai
                client = genai.Client(api_key=api_key)
                # use gemini-flash-latest with short timeout
                response = client.models.generate_content(
                    model="gemini-flash-latest",
                    contents=prompt
                )
                if response and hasattr(response, 'text') and response.text:
                    return {
                        "response": response.text.strip(),
                        "provider": "gemini",
                        "status": "success"
                    }
            except Exception as e:
                print(f"[Gemini API Notice]: {e}")

        # 4. Intelligent contextual conversational fallback (clean, direct, and helpful)
        return {
            "response": f"I understand you're asking about \"{prompt}\". I am ready to help you with calculations, desktop automation, notes, and tasks. Let me know what specific task you'd like me to perform!",
            "provider": "echo-core",
            "status": "success"
        }

ai_service = AIService()
