import asyncio
import os
import re
import tempfile
import threading
import time
from typing import Optional, Callable, Dict, Any
import edge_tts
import pygame
import speech_recognition as sr
import pyttsx3

from backend.config import settings

class SpeechService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
        self.recognizer.non_speaking_duration = 0.5
        
        self.is_listening = False
        self.is_speaking = False
        self.stop_requested = False
        self.active_language = settings.DEFAULT_LANGUAGE  # 'en-IN' or 'kn-IN'
        self._shared_mic = None
        self._status_callbacks = []

    def register_status_callback(self, cb: Callable[[str, Dict[str, Any]], None]):
        self._status_callbacks.append(cb)

    def _notify(self, event: str, data: Dict[str, Any]):
        for cb in self._status_callbacks:
            try:
                cb(event, data)
            except Exception:
                pass

    def get_shared_mic(self) -> Optional[sr.Microphone]:
        if self._shared_mic is None:
            try:
                self._shared_mic = sr.Microphone()
            except Exception as e:
                print(f"[SpeechService] Microphone init error: {e}")
        return self._shared_mic

    def stop_speech(self):
        """Immediately interrupts any playing speech audio."""
        self.stop_requested = True
        try:
            if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
                pygame.mixer.music.stop()
                pygame.mixer.music.unload()
        except Exception as e:
            print(f"[SpeechService] stop_speech error: {e}")
        self.is_speaking = False
        self._notify("assistant_stopped", {"status": "idle"})

    def speak(self, text: str, language: Optional[str] = None):
        """Asynchronously speak the text in a separate background thread so GUI never freezes."""
        thread = threading.Thread(target=self._speak_sync, args=(text, language), daemon=True)
        thread.start()

    def _speak_sync(self, text: str, language: Optional[str] = None):
        if not text or not text.strip():
            return

        lang = language or self.active_language
        clean_text = text.replace("*", "").replace("`", "").strip()
        clean_text = re.sub(r'[\U00010000-\U0010ffff]', '', clean_text)  # Strip emojis for cleaner audio

        self.is_speaking = True
        self.stop_requested = False
        self._notify("assistant_speaking", {"text": clean_text, "language": lang})

        voice_name = settings.KANNADA_VOICE if "kn" in lang.lower() else settings.ENGLISH_VOICE
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_path = temp_file.name

        try:
            # 1. Edge-TTS Generation
            async def generate_audio():
                communicate = edge_tts.Communicate(clean_text, voice_name, rate=settings.SPEECH_RATE, volume=settings.SPEECH_VOLUME)
                await communicate.save(temp_path)

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(asyncio.wait_for(generate_audio(), timeout=6.0))
            finally:
                loop.close()

            # 2. Pygame Audio Playback
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)

            pygame.mixer.music.load(temp_path)
            pygame.mixer.music.play()

            while pygame.mixer.music.get_busy():
                if self.stop_requested:
                    pygame.mixer.music.stop()
                    break
                time.sleep(0.05)

            pygame.mixer.music.unload()

        except Exception as edge_err:
            print(f"[SpeechService] EdgeTTS failed, attempting Windows SAPI fallback: {edge_err}")
            # Fallback to local offline pyttsx3 engine
            try:
                engine = pyttsx3.init()
                engine.setProperty('rate', 170)
                engine.say(clean_text)
                engine.runAndWait()
            except Exception as sapi_err:
                print(f"[SpeechService] SAPI fallback failed: {sapi_err}")
        finally:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            self.is_speaking = False
            self._notify("assistant_status", {"status": "idle"})

    def capture_audio(self, timeout: int = 5, phrase_time_limit: int = 15, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Record and transcribe audio.
        Uses language 'en-IN' or 'kn-IN'.
        """
        lang = language or self.active_language
        mic = self.get_shared_mic()
        if not mic:
            return {"success": False, "error": "No microphone available or accessible."}

        self.is_listening = True
        self._notify("microphone_status", {"status": "listening", "language": lang})

        try:
            with mic as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)

            self._notify("processing_started", {"status": "processing"})
            
            # Google Speech Recognition for en-IN or kn-IN
            text = self.recognizer.recognize_google(audio, language=lang)
            text_clean = text.strip()
            
            self._notify("speech_recognized", {"text": text_clean, "language": lang})
            return {"success": True, "text": text_clean, "language": lang}

        except sr.WaitTimeoutError:
            self._notify("microphone_status", {"status": "idle"})
            return {"success": False, "error": "Listening timed out - no speech detected."}
        except sr.UnknownValueError:
            self._notify("microphone_status", {"status": "idle"})
            return {"success": False, "error": "Could not understand the audio clearly."}
        except Exception as e:
            self._notify("microphone_status", {"status": "idle"})
            return {"success": False, "error": f"Speech capture error: {str(e)}"}
        finally:
            self.is_listening = False

speech_service = SpeechService()
