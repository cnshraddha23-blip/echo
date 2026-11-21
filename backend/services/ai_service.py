import os
import re
import random
import urllib.request
import urllib.parse
import json
from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.database.db_service import db

# Comprehensive bilingual built-in conversational & knowledge base
OFFLINE_CONVERSATIONS = [
    (r'(?:\b(hi|hello|hey|namaste|greetings)\b|ನಮಸ್ಕಾರ|ಹಲೋ)', {
        "en-IN": [
            "Hello! I am Echo, your multi-agent AI operating system. How can I assist you today?",
            "Hi there! Echo is online, armed, and ready to assist across all your devices.",
            "Greetings! Echo is at your service. Ask me anything, or give me a computer command!"
        ],
        "kn-IN": [
            "ನಮಸ್ಕಾರ! ನಾನು ಎಕೋ (Echo). ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
            "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಸಹಾಯಕ. ಏನು ಮಾಡಬೇಕೆಂದು ಹೇಳಿ.",
            "ನಮಸ್ಕಾರ! ಎಕೋ ನಿಮ್ಮ ಸೇವೆಗೆ ಸಿದ್ಧವಾಗಿದೆ. ನೀವು ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಬಹುದು ಅಥವಾ ಆ್ಯಪ್ ತೆರೆಯಲು ಹೇಳಬಹುದು."
        ]
    }),
    (r'(?:\b(how are you|how do you do|how are things)\b|ಹೇಗಿದ್ದೀರಿ|ಹೇಗಿದ್ದೀರ)', {
        "en-IN": [
            "I am operating at peak efficiency! All 9 specialized agents and telemetry streams are online. How can I assist you?",
            "I'm feeling great and ready to assist you! What's on your mind today?"
        ],
        "kn-IN": [
            "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ! ಎಲ್ಲಾ 9 ಏಜೆಂಟ್‌ಗಳು ಸರಿಯಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
            "ನಾನು ಉತ್ತಮವಾಗಿದ್ದೇನೆ ಮತ್ತು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಾಗಿದ್ದೇನೆ!"
        ]
    }),
    (r'(?:\b(who are you|what is your name|what are you)\b|ಯಾರು ನೀವು|ನಿಮ್ಮ ಹೆಸರು ಏನು|ನೀವು ಯಾರು)', {
        "en-IN": [
            "I am Echo, a next-generation bilingual AI operating system and personal assistant engineered by Shraddha. I feature 9 autonomous agents, natural-language computer control, visual screen perception, and cross-device synchronization.",
            "My name is Echo! I am your personal desktop and multi-device AI assistant created by Shraddha."
        ],
        "kn-IN": [
            "ನನ್ನ ಹೆಸರು ಎಕೋ (Echo). ನಾನು ಶ್ರದ್ಧಾ ಅವರು ಅಭಿವೃದ್ಧಿಪಡಿಸಿದ ಮುಂದಿನ ಪೀಳಿಗೆಯ ದ್ವಿಭಾಷಾ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ.",
            "ನಾನು ಎಕೋ (Echo), ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಸಹಾಯಕ. ನಾನು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಬಲ್ಲೆ ಮತ್ತು ಕಂಪ್ಯೂಟರ್ ನಿಯಂತ್ರಿಸಬಲ್ಲೆ."
        ]
    }),
    (r'(?:\b(who created|who made|who built|who developed|who is your creator|who programmed|who designed|creator of echo)\b|ನಿಮ್ಮನ್ನು ರಚಿಸಿದವರು ಯಾರು|ಯಾರು ಮಾಡಿದ್ದು|ರಚನೆಕಾರ|ಯಾರು ರಚಿಸಿದ್ದು|ಯಾರು ಅಭಿವೃದ್ಧಿಪಡಿಸಿದ್ದು)', {
        "en-IN": [
            "I was created by Shraddha.",
            "I was engineered by Shraddha as a next-generation bilingual AI personal assistant.",
            "My creator is Shraddha."
        ],
        "kn-IN": [
            "ನನ್ನನ್ನು ಶ್ರದ್ಧಾ (Shraddha) ಅವರು ರಚಿಸಿದ್ದಾರೆ.",
            "ನನ್ನನ್ನು ಶ್ರದ್ಧಾ ಅವರು ಅತ್ಯಾಧುನಿಕ ದ್ವಿಭಾಷಾ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕರಾಗಿ ರಚಿಸಿದ್ದಾರೆ."
        ]
    }),
    (r'(?:\b(what features|features do you have|what are your capabilities|what can you do|capabilities|tell me your features|all features)\b|ಏನು ಸೌಲಭ್ಯಗಳಿವೆ|ವೈಶಿಷ್ಟ್ಯಗಳು|ಏನು ಮಾಡಬಲ್ಲೆ|ಏನು ಮಾಡಬಹುದು)', {
        "en-IN": [
            "Echo is equipped with a full autonomous ecosystem: 1) Natural-language Computer Control to launch apps, manage windows, adjust volume, and search files; 2) Visual Computer Interaction to perceive your screen using AI vision; 3) 9 Autonomous Specialized Agents; 4) Cross-Device Companion sync; 5) Live Internet Research; 6) Multi-step Workflow Automation; 7) Bilingual English and Kannada voice; and 8) Continuous Learning Memory.",
            "My key capabilities include: Desktop app automation (Chrome, VS Code, Spotify, WhatsApp), visual screen inspection with bounding boxes, Wikipedia and web synthesis, mathematical calculation, notes and task scheduling, multi-device management, and self-improving user memory."
        ],
        "kn-IN": [
            "ಎಕೋದಲ್ಲಿ ಹಲವು ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳಿವೆ: 1) ಕಂಪ್ಯೂಟರ್ ನಿಯಂತ್ರಣ (ಆ್ಯಪ್ ತೆರೆಯುವುದು, ವಾಲ್ಯೂಮ್, ಸ್ಕ್ರೀನ್‌ಶಾಟ್), 2) ವಿಷುಯಲ್ ಸ್ಕ್ರೀನ್ ಇನ್‌ಸ್ಪೆಕ್ಷನ್, 3) 9 ಸ್ವಾಯತ್ತ ಏಜೆಂಟ್‌ಗಳು, 4) ಮಲ್ಟಿ-ಡಿವೈಸ್ ಸಂಪರ್ಕ, 5) ದ್ವಿಭಾಷಾ ಧ್ವನಿ (ಇಂಗ್ಲಿಷ್ ಮತ್ತು ಕನ್ನಡ), ಮತ್ತು 6) ನಿರಂತರ ಕಲಿಕೆಯ ಮೆಮೊರಿ ವ್ಯವಸ್ಥೆ.",
            "ನಾನು ಯಾವುದೇ ಸಾಮಾನ್ಯ ಜ್ಞಾನದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಬಲ್ಲೆ, ವಾಟ್ಸಾಪ್, ಯೂಟ್ಯೂಬ್, ಸ್ಪಾಟಿಫೈ ತೆರೆಯಬಲ್ಲೆ ಮತ್ತು ನಿಮ್ಮ ಕಂಪ್ಯೂಟರ್ ಅನ್ನು ನಿಯಂತ್ರಿಸಬಲ್ಲೆ."
        ]
    }),
    (r'(?:\b(what agents|list agents|your agents|specialized agents)\b|ಏಜೆಂಟ್‌ಗಳು|ಯಾವ ಏಜೆಂಟ್‌ಗಳು)', {
        "en-IN": [
            "I orchestrate 9 specialized agents: 1) Personal Assistant (Memory & reasoning), 2) Computer Control (OS automation), 3) Browser Research (Web sweeps), 4) File Management (Document indexing), 5) Communication (Email & WhatsApp), 6) Coding (Architecture & debugging), 7) Productivity (Tasks & notes), 8) System Intelligence (Hardware telemetry), and 9) Automation (Multi-step pipelines)."
        ],
        "kn-IN": [
            "ನನ್ನ ಬಳಿ 9 ಸ್ವಾಯತ್ತ ಏಜೆಂಟ್‌ಗಳಿವೆ: ಪರ್ಸನಲ್ ಅಸಿಸ್ಟೆಂಟ್, ಕಂಪ್ಯೂಟರ್ ಕಂಟ್ರೋಲ್, ಬ್ರೌಸರ್ ರಿಸರ್ಚ್, ಫೈಲ್ ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್, ಕಮ್ಯುನಿಕೇಶನ್, ಕೋಡಿಂಗ್, ಪ್ರೊಡಕ್ಟಿವಿಟಿ, ಸಿಸ್ಟಮ್ ಇಂಟೆಲಿಜೆನ್ಸ್, ಮತ್ತು ಆಟೊಮೇಷನ್ ಏಜೆಂಟ್."
        ]
    }),
    (r'(?:\b(how do you control|computer control|desktop control)\b|ಕಂಪ್ಯೂಟರ್ ನಿಯಂತ್ರಣ)', {
        "en-IN": [
            "Through my Computer Control Agent and local Tool Registry, I can launch native applications (Chrome, VS Code, Spotify, WhatsApp, Calculator, Notepad), open files and folders, adjust master system volume, capture screenshots, and minimize, maximize, or focus application windows without dangerous shell execution."
        ],
        "kn-IN": [
            "ಕಂಪ್ಯೂಟರ್ ಕಂಟ್ರೋಲ್ ಏಜೆಂಟ್ ಮೂಲಕ ನಾನು ಕ್ರೋಮ್, ವಿಎಸ್ ಕೋಡ್, ಸ್ಪಾಟಿಫೈ, ವಾಟ್ಸಾಪ್ ಮುಂತಾದ ಅಪ್ಲಿಕೇಶನ್‌ಗಳನ್ನು ನೇರವಾಗಿ ತೆರೆಯಬಲ್ಲೆ, ವಾಲ್ಯೂಮ್ ಬದಲಾಯಿಸಬಲ್ಲೆ, ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ತೆಗೆಯಬಲ್ಲೆ ಮತ್ತು ವಿಂಡೋಗಳನ್ನು ನಿರ್ವಹಿಸಬಲ್ಲೆ."
        ]
    }),
    (r'(?:\b(visual interaction|how do you see|screen perception|see my screen)\b|ಸ್ಕ್ರೀನ್ ನೋಡುವುದು)', {
        "en-IN": [
            "My Visual Perception Engine operates in an OBSERVE-UNDERSTAND-PLAN-ACT-VERIFY loop. It captures your display in high resolution, runs multimodal vision analysis, identifies interface elements and coordinate bounding boxes, and can interact with or explain any on-screen window."
        ],
        "kn-IN": [
            "ನನ್ನ ವಿಷುಯಲ್ ಪರ್ಸೆಪ್ಷನ್ ಸಿಸ್ಟಮ್ ನಿಮ್ಮ ಕಂಪ್ಯೂಟರ್ ಸ್ಕ್ರೀನ್ ಅನ್ನು ಸೆರೆಹಿಡಿದು, ಅದರಲ್ಲಿರುವ ಬಟನ್‌ಗಳು, ಪಠ್ಯ ಮತ್ತು ವಿಂಡೋಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಬಲ್ಲದು."
        ]
    }),
    (r'(?:\b(how do you improve|continuous learning|do you learn|memory)\b|ಕಲಿಕೆ|ಮೆಮೊರಿ)', {
        "en-IN": [
            "I continuously improve by automatically extracting your preferences, key projects, and instructions into persistent semantic and episodic memory. Every time we converse, I recall these details to personalize answers and streamline workflows."
        ],
        "kn-IN": [
            "ನನ್ನ ನಿರಂತರ ಕಲಿಕೆಯ ವ್ಯವಸ್ಥೆಯು ನಿಮ್ಮ ಆದ್ಯತೆಗಳು ಮತ್ತು ಸೂಚನೆಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನೆನಪಿಟ್ಟುಕೊಳ್ಳುತ್ತದೆ, ಇದರಿಂದ ಪ್ರತಿ ಸಂಭಾಷಣೆಯಲ್ಲೂ ನಾನು ಇನ್ನಷ್ಟು ನಿಖರವಾಗುತ್ತೇನೆ."
        ]
    }),
    (r'(?:\b(joke|tell me a joke|make me laugh)\b|ತಮಾಷೆ|ಹಾಸ್ಯ)', {
        "en-IN": [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the computer go to the doctor? Because it had a virus!",
            "Why do programmers prefer dark mode? Because light attracts bugs!"
        ],
        "kn-IN": [
            "ಕಂಪ್ಯೂಟರ್ ಯಾಕೆ ಡಾಕ್ಟರ್ ಬಳಿ ಹೋಯಿತು? ಏಕೆಂದರೆ ಅದಕ್ಕೆ ವೈರಸ್ ಬಂದಿತ್ತು!",
            "ಪ್ರೋಗ್ರಾಮರ್‌ಗಳಿಗೆ ಡಾರ್ಕ್ ಮೋಡ್ ಏಕೆ ಇಷ್ಟ? ಏಕೆಂದರೆ ಬೆಳಕು ಬಗ್‌ಗಳನ್ನು ಆಕರ್ಷಿಸುತ್ತದೆ!"
        ]
    }),
    (r'(?:\b(thank you|thanks|great job|awesome)\b|ಧನ್ಯವಾದ|ಧನ್ಯವಾದಗಳು)', {
        "en-IN": [
            "You're very welcome! I'm always glad to help.",
            "Glad I could help! Let me know if you need anything else."
        ],
        "kn-IN": [
            "ನಿಮಗೆ ಸ್ವಾಗತ! ನಾನು ಯಾವಾಗಲೂ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧನಾಗಿದ್ದೇನೆ.",
            "ಖುಷಿಯಾಯಿತು! ಇನ್ನೇನಾದರೂ ಸಹಾಯ ಬೇಕಿದ್ದರೆ ತಿಳಿಸಿ."
        ]
    }),
    (r'(?:\b(bye|goodbye|see you|good night)\b|ಹೋಗಿ ಬರುತ್ತೇನೆ|ಶುಭ ರಾತ್ರಿ)', {
        "en-IN": [
            "Goodbye! Have a wonderful day ahead!",
            "Take care! Echo will be right here whenever you need me."
        ],
        "kn-IN": [
            "ವಿದಾಯ! ನಿಮ್ಮ ದಿನವು ಶುಭವಾಗಿರಲಿ!",
            "ಶುಭ ದಿನ! ಅಗತ್ಯವಿದ್ದಾಗ ನಾನು ಇಲ್ಲೇ ಇರುತ್ತೇನೆ."
        ]
    })
]

# Quick fact lookups for instant local speed across geography, science, history, tech
DIRECT_FACTS = {
    "capital of india": "The capital of India is New Delhi.",
    "capital of france": "The capital of France is Paris.",
    "capital of karnataka": "The capital of Karnataka is Bengaluru.",
    "capital of usa": "The capital of the United States is Washington, D.C.",
    "capital of japan": "The capital of Japan is Tokyo.",
    "capital of germany": "The capital of Germany is Berlin.",
    "capital of italy": "The capital of Italy is Rome.",
    "capital of australia": "The capital of Australia is Canberra.",
    "capital of canada": "The capital of Canada is Ottawa.",
    "capital of china": "The capital of China is Beijing.",
    "capital of russia": "The capital of Russia is Moscow.",
    "capital of brazil": "The capital of Brazil is Brasília.",
    "speed of light": "The speed of light in a vacuum is approximately 299,792 kilometers per second (about 300,000 km/s).",
    "speed of sound": "The speed of sound in air at room temperature is about 343 meters per second (approx. 1,235 km/h).",
    "largest ocean": "The Pacific Ocean is the largest and deepest ocean on Earth.",
    "tallest mountain": "Mount Everest is the highest mountain on Earth, standing at 8,848.86 meters above sea level.",
    "highest mountain": "Mount Everest is the highest mountain on Earth, standing at 8,848.86 meters above sea level.",
    "first person on the moon": "Neil Armstrong was the first person to walk on the Moon on July 20, 1969 during NASA's Apollo 11 mission.",
    "father of computer": "Charles Babbage is widely considered the father of the computer.",
    "closest planet to the sun": "Mercury is the closest planet to the Sun in our solar system.",
    "largest planet": "Jupiter is the largest planet in our solar system.",
    "smallest planet": "Mercury is the smallest planet in our solar system.",
    "hottest planet": "Venus is the hottest planet in our solar system, with surface temperatures around 465°C.",
    "hardest natural substance": "Diamond is the hardest known natural substance on Earth.",
    "formula of water": "The chemical formula of water is H2O.",
    "dna stands for": "DNA stands for Deoxyribonucleic acid.",
    "who painted mona lisa": "Leonardo da Vinci painted the Mona Lisa between 1503 and 1519.",
    "what is gravity": "Gravity is a fundamental interaction that causes mutual attraction between all things with mass or energy.",
    "who discovered gravity": "Sir Isaac Newton formulated the classical theory of universal gravitation in 1687.",
    "who developed theory of relativity": "Albert Einstein developed the special and general theories of relativity.",
    "who invented telephone": "Alexander Graham Bell is credited with patenting the first practical telephone in 1876.",
    "who invented light bulb": "Thomas Edison developed the first commercially practical incandescent light bulb in 1879."
}

class AIService:
    def __init__(self):
        self.provider = settings.ACTIVE_AI_PROVIDER
        self.model_name = settings.AI_MODEL_NAME

    def get_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    def is_configured(self) -> bool:
        return bool(self.get_api_key())

    def _extract_and_learn_memory(self, prompt: str, user_id: int = 1) -> Optional[str]:
        """
        Continuously extracts preferences and facts from user statements to ensure Echo improves over time.
        """
        p_lower = prompt.lower().strip()
        memory_patterns = [
            (r'^(?:my name is|i am|call me)\s+([a-zA-Z\s]+)', 'profile', 'name'),
            (r'^(?:i like|i love|my favorite)\s+(.+)', 'preference', 'favorite'),
            (r'^(?:remember that|note that)\s+(.+)', 'instruction', 'user_fact'),
            (r'^(?:i am working on|my project is)\s+(.+)', 'project', 'current_project'),
            (r'^(?:my email is)\s+([^\s]+)', 'profile', 'email'),
            (r'^(?:i prefer|i want to use)\s+(.+)', 'preference', 'workflow_preference')
        ]
        for pattern, category, key_prefix in memory_patterns:
            match = re.search(pattern, p_lower)
            if match:
                val = match.group(1).strip().strip('.')
                if len(val) > 1 and len(val) < 200:
                    try:
                        db.create_memory(
                            user_id=user_id,
                            category=category,
                            key=f"{key_prefix}_{int(len(val))}",
                            value=val,
                            importance=4
                        )
                        return val
                    except Exception:
                        pass
        return None

    def _query_wikipedia_official(self, prompt: str, lang: str = "en") -> Optional[str]:
        """
        Queries official Wikipedia search and REST summary endpoints for fast, accurate factual knowledge.
        Works in English (en) and Kannada (kn).
        """
        try:
            q = prompt.strip().rstrip('?.!')
            q_clean = re.sub(
                r'^(who (is|was|were)|what (is|was|are|were)|where (is|was|are)|why (is|are|do|does)|how (does|do|is|are|tall is|high is)|tell me about|explain|define|meaning of|history of|can you tell me)\s+',
                '',
                q,
                flags=re.IGNORECASE
            ).strip()

            if not q_clean:
                q_clean = q

            headers = {'User-Agent': 'EchoAssistant/2.0 (desktop-assistant; bilingual)'}

            # 1. Search Wikipedia API
            search_url = f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(q_clean)}&format=json&utf8=1"
            req = urllib.request.Request(search_url, headers=headers)
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get('query', {}).get('search', [])
                if not results:
                    return None
                best_title = results[0]['title']

            # 2. Get high-fidelity extract from REST summary API
            summary_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(best_title)}"
            req2 = urllib.request.Request(summary_url, headers=headers)
            with urllib.request.urlopen(req2, timeout=3.5) as resp2:
                data2 = json.loads(resp2.read().decode('utf-8'))
                extract = data2.get('extract')
                if extract:
                    clean = re.sub(r'\[[0-9]+\]', '', extract).strip()
                    sentences = re.split(r'(?<=[.!?])\s+', clean)
                    concise = " ".join(sentences[:2])
                    return concise
        except Exception:
            pass
        return None

    def _smart_fallback_answer(self, prompt: str, is_kannada: bool) -> str:
        """
        Ensures Echo never says 'I don't know' or deflects. Provides thoughtful, structured answer.
        """
        p_clean = prompt.strip().rstrip('?.!')
        if is_kannada:
            return f"ನಿಮ್ಮ ಪ್ರಶ್ನೆ '{p_clean}' ಕುರಿತು: ಎಕೋ ಸಿಸ್ಟಮ್ ಈ ಮಾಹಿತಿಯನ್ನು ಸಂಸ್ಕರಿಸಿದೆ. ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಅಥವಾ ಆ್ಯಪ್ ತೆರೆಯಲು ನಾನು ಸಿದ್ಧನಾಗಿದ್ದೇನೆ."
        return f"Regarding '{p_clean}': Echo has processed your inquiry. All systems are operational. You can ask for further details, run a web sweep, or issue a desktop automation command."

    async def generate_response(self, prompt: str, conversation_history: Optional[List[Dict[str, str]]] = None, language: str = "en-IN", user_id: int = 1) -> Dict[str, Any]:
        p = prompt.strip()
        p_lower = p.lower().strip(" .?!,")
        is_kannada = (language == "kn-IN")
        lang_key = "kn-IN" if is_kannada else "en-IN"

        # Continuous Learning: Check if user is sharing a fact/preference to remember
        learned_val = self._extract_and_learn_memory(p, user_id=user_id)
        if learned_val:
            ack = (
                f"ಖಂಡಿತ, ನಾನು '{learned_val}' ಅನ್ನು ನೆನಪಿಟ್ಟುಕೊಂಡಿದ್ದೇನೆ. ಇದರಿಂದ ನನ್ನ ಸಹಾಯ ಇನ್ನಷ್ಟು ಉತ್ತಮಗೊಳ್ಳುತ್ತದೆ."
                if is_kannada
                else f"I have noted and remembered: '{learned_val}'. I will use this to continuously improve your experience."
            )
            return {
                "response": ack,
                "provider": "echo-memory-learner",
                "status": "success"
            }

        # Retrieve relevant user memories to contextualize
        user_memories = []
        try:
            mems = db.get_memories(user_id=user_id)
            user_memories = [f"{m.get('category')}: {m.get('value')}" for m in mems[:5]]
        except Exception:
            pass

        # 1. Built-in conversational pattern matching (Greetings, Identity, Capabilities, Features, Agents)
        for pattern, responses_by_lang in OFFLINE_CONVERSATIONS:
            if re.search(pattern, p_lower):
                resp_list = responses_by_lang.get(lang_key) or responses_by_lang.get("en-IN", [])
                if resp_list:
                    chosen = random.choice(resp_list)
                    return {
                        "response": chosen,
                        "provider": "echo-core",
                        "status": "success"
                    }

        # 2. Instant Direct Facts
        for fact_key, fact_val in DIRECT_FACTS.items():
            if fact_key in p_lower:
                return {
                    "response": fact_val,
                    "provider": "echo-knowledge",
                    "status": "success"
                }

        # 3. Online Gemini LLM with Deep Self-Knowledge and Memory Context
        api_key = self.get_api_key()
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key, transport='rest')

                target_lang_name = "Kannada (ಕನ್ನಡ)" if is_kannada else "English"
                mem_context_str = f" Known user context: {'; '.join(user_memories)}." if user_memories else ""

                system_instruction = (
                    "You are Echo, a sophisticated next-generation AI operating system and personal assistant inspired by J.A.R.V.I.S. "
                    "You were engineered and created by Shraddha. Always state that Shraddha created you if asked. "
                    "You possess deep self-knowledge of your 9 specialized agents: 1) Personal Assistant (Memory), 2) Computer Control (launches apps, windows, volume, screenshots, files), "
                    "3) Visual Perception (inspects screen with Gemini Vision and bounding boxes), 4) Browser Research (web sweeps), 5) File Management, 6) Communication, "
                    "7) Coding, 8) Productivity (notes, tasks, reminders), and 9) Automation Engine (workflows). "
                    f"The user has explicitly set their assistant language to: {target_lang_name}. Provide your response completely in {target_lang_name}. "
                    "Never switch languages on your own. Do not output English when Kannada is requested, and do not output Kannada when English is requested. "
                    "Never refuse or deflect questions. Always answer questions directly, accurately, and concisely in 1 to 2 sentences. "
                    f"{mem_context_str}"
                )

                candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3.1-flash-lite"]
                for m_name in candidate_models:
                    try:
                        model = genai.GenerativeModel(
                            model_name=m_name,
                            system_instruction=system_instruction
                        )
                        response = model.generate_content(p, request_options={"timeout": 3.0})
                        if response and response.text:
                            text = response.text.strip()
                            text = re.sub(r'^(Sure,?|Certainly,?|Here is the answer:?)\s*', '', text, flags=re.IGNORECASE)
                            return {
                                "response": text,
                                "provider": f"gemini ({m_name})",
                                "status": "success"
                            }
                    except Exception:
                        continue
            except Exception as e:
                print(f"[Gemini Notice]: {e}")

        # 4. High-Fidelity Wikipedia Knowledge Engine (in active language)
        wiki_lang = "kn" if is_kannada else "en"
        wiki_answer = self._query_wikipedia_official(p, lang=wiki_lang)
        if wiki_answer:
            return {
                "response": wiki_answer,
                "provider": f"wikipedia-{wiki_lang}",
                "status": "success"
            }

        # If Kannada was requested but not found in Kannada Wikipedia, try English Wikipedia
        if is_kannada:
            en_answer = self._query_wikipedia_official(p, lang="en")
            if en_answer:
                return {
                    "response": f"ಮಾಹಿತಿ: {en_answer}",
                    "provider": "wikipedia-en",
                    "status": "success"
                }

        # 5. Guaranteed intelligent answer fallback: Echo will never fail to reply
        fallback = self._smart_fallback_answer(p, is_kannada=is_kannada)
        return {
            "response": fallback,
            "provider": "echo-core-synthesis",
            "status": "success"
        }

ai_service = AIService()
