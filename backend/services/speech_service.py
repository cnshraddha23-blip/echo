import os
import re
import threading
import time
from typing import Optional, Callable, Dict, Any
try:
    import pyttsx3
except ImportError:
    pyttsx3 = None
try:
    import speech_recognition as sr
except ImportError:
    sr = None
from backend.config import settings

class SpeechService:
    def __init__(self):
        if sr is not None:
            self.recognizer = sr.Recognizer()
            self.recognizer.energy_threshold = 300
            self.recognizer.dynamic_energy_threshold = True
            self.recognizer.pause_threshold = 0.8
        else:
            self.recognizer = None
        
        self.is_listening = False
        self.is_speaking = False
        self.stop_requested = False
        self.active_language = settings.DEFAULT_LANGUAGE
        self._status_callbacks = []

    def register_status_callback(self, cb: Callable[[str, Dict[str, Any]], None]):
        self._status_callbacks.append(cb)

    def _notify(self, event: str, data: Dict[str, Any]):
        for cb in self._status_callbacks:
            try:
                cb(event, data)
            except Exception as e:
                print(f"[SpeechService Callback Error]: {e}")

    def stop_speech(self):
        self.stop_requested = True
        self.is_speaking = False
        self._notify("assistant_stopped", {"status": "idle"})

    def speak(self, text: str, language: Optional[str] = None):
        """Asynchronously speak via Windows SAPI / pyttsx3."""
        thread = threading.Thread(target=self._speak_sync, args=(text, language), daemon=True)
        thread.start()

    def _speak_sync(self, text: str, language: Optional[str] = None):
        if not text or not text.strip():
            return

        clean_text = text.replace("*", "").replace("`", "").replace("#", "").strip()
        clean_text = re.sub(r'[\U00010000-\U0010ffff]', '', clean_text)

        self.is_speaking = True
        self.stop_requested = False
        self._notify("assistant_speaking", {"text": clean_text})

        try:
            if pyttsx3 is not None:
                engine = pyttsx3.init()
                engine.setProperty('rate', 170)
                engine.say(clean_text)
                engine.runAndWait()
        except Exception as err:
            print(f"[SpeechService pyttsx3 error]: {err}")
        finally:
            self.is_speaking = False
            self._notify("assistant_status", {"status": "idle"})

    def capture_audio(self, timeout: int = 5, phrase_time_limit: int = 10, language: Optional[str] = None) -> Dict[str, Any]:
        if not sr or not self.recognizer:
            return {"success": False, "error": "Microphone audio recognition not available on cloud host"}

        lang = language or self.active_language
        self.is_listening = True
        self._notify("microphone_status", {"status": "listening", "language": lang})

        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)

            self._notify("processing_started", {"status": "processing"})
            text = self.recognizer.recognize_google(audio, language=lang)
            text_clean = text.strip()
            self._notify("speech_recognized", {"text": text_clean, "language": lang})
            return {"success": True, "text": text_clean, "language": lang}
        except Exception as e:
            self._notify("microphone_status", {"status": "idle"})
            return {"success": False, "error": str(e)}
        finally:
            self.is_listening = False

speech_service = SpeechService()
