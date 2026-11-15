import os
import requests
from typing import Dict, Any, Optional

def get_weather(city: str = "Bengaluru", api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch live weather data from OpenWeatherMap or wttr.in fallback.
    No crash if key is missing; uses reliable JSON fallback.
    """
    key = api_key or os.getenv("OPENWEATHER_API_KEY", "")
    if key:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={key}&units=metric"
            resp = requests.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "city": data.get("name", city),
                    "temp_c": round(data["main"]["temp"], 1),
                    "condition": data["weather"][0]["description"].capitalize(),
                    "humidity": data["main"]["humidity"],
                    "wind_kmh": round(data["wind"]["speed"] * 3.6, 1),
                    "source": "OpenWeatherMap"
                }
        except Exception as e:
            pass

    # Free fallback via wttr.in format=j1
    try:
        fallback_url = f"https://wttr.in/{city}?format=j1"
        resp = requests.get(fallback_url, headers={"User-Agent": "curl/7.68.0"}, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            current = data["current_condition"][0]
            return {
                "success": True,
                "city": city.capitalize(),
                "temp_c": float(current["temp_C"]),
                "condition": current["weatherDesc"][0]["value"],
                "humidity": int(current["humidity"]),
                "wind_kmh": float(current["windspeedKmph"]),
                "source": "wttr.in"
            }
    except Exception as e:
        pass

    return {
        "success": False,
        "city": city,
        "message": "Weather service is currently unavailable. Check internet connectivity or configure OPENWEATHER_API_KEY."
    }

# Bilingual offline dictionary mapping for common English <-> Kannada phrases
_EN_TO_KN_QUICK = {
    "hello": "ನಮಸ್ಕಾರ (Namaskara)",
    "how are you": "ನೀವು ಹೇಗಿದ್ದೀರಿ? (Neevu hegiddiri?)",
    "thank you": "ಧನ್ಯವಾದಗಳು (Dhanyavadagalu)",
    "good morning": "ಶುಭೋದಯ (Shubhodaya)",
    "good night": "ಶುಭ ರಾತ್ರಿ (Shubha Ratri)",
    "what is your name": "ನಿಮ್ಮ ಹೆಸರೇನು? (Nimma hesarenu?)",
    "welcome": "ಸ್ವಾಗತ (Swagata)",
    "yes": "ಹೌದು (Haudu)",
    "no": "ಇಲ್ಲ (Illa)",
    "good": "ಒಳ್ಳೆಯದು (Olleya)",
    "help": "ಸಹಾಯ (Sahaya)"
}

_KN_TO_EN_QUICK = {
    "ನಮಸ್ಕಾರ": "Hello / Greetings",
    "ಹೇಗಿದ್ದೀರಿ": "How are you",
    "ಧನ್ಯವಾದಗಳು": "Thank you",
    "ಶುಭೋದಯ": "Good morning",
    "ಶುಭ ರಾತ್ರಿ": "Good night",
    "ಹೌದು": "Yes",
    "ಇಲ್ಲ": "No",
    "ಸಹಾಯ": "Help"
}

def quick_translate(text: str, source_lang: str = "en", target_lang: str = "kn") -> Dict[str, Any]:
    text_clean = text.lower().strip()
    if source_lang.startswith("en") and target_lang.startswith("kn"):
        if text_clean in _EN_TO_KN_QUICK:
            return {"translated": _EN_TO_KN_QUICK[text_clean], "source": source_lang, "target": target_lang}
        return {"translated": f"[Kannada translation placeholder for: '{text}'] - Configure Gemini API for full generative translation", "source": source_lang, "target": target_lang}
    elif source_lang.startswith("kn") and target_lang.startswith("en"):
        for k, v in _KN_TO_EN_QUICK.items():
            if k in text_clean:
                return {"translated": v, "source": source_lang, "target": target_lang}
        return {"translated": f"[English translation placeholder for: '{text}'] - Configure Gemini API for full generative translation", "source": source_lang, "target": target_lang}
    return {"translated": text, "source": source_lang, "target": target_lang}
