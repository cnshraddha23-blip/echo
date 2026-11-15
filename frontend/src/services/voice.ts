// Robust Web Speech API implementation for Chrome, Edge, and all Chromium browsers
export class BrowserVoiceRecognition {
  private recognition: any = null;
  public isListening = false;

  constructor() {
    this.init();
  }

  private init() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
      } catch (e) {
        console.error("[Voice Init Error]:", e);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(
    language: string,
    onResult: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      this.init();
    }

    if (!this.recognition) {
      onError(new Error("Microphone speech recognition is not supported in this browser. Please use Chrome or Edge."));
      return;
    }

    // Abort any existing session cleanly
    try {
      this.recognition.abort();
    } catch (e) {}

    this.recognition.lang = language || 'en-IN';
    this.isListening = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log("[Web Speech API] Listening started...");
    };

    this.recognition.onresult = (event: any) => {
      this.isListening = false;
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        console.log("[Web Speech API Result]:", transcript);
        if (transcript && transcript.trim()) {
          onResult(transcript.trim());
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      console.warn("[Web Speech API Error Event]:", event.error);
      onError(event.error || "Speech recognition error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log("[Web Speech API] Listening ended.");
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      console.error("[Web Speech API Start Exception]:", e);
      onError(e);
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        try {
          this.recognition.abort();
        } catch (err) {}
      }
    }
  }
}

export const browserVoice = new BrowserVoiceRecognition();

export function speakBrowserSpeech(text: string, language = 'en-IN'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const clean = text.replace(/[*`_#]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = language;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => v.lang.includes(language.split('-')[0]) || v.lang.includes('IN'));
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn("[SpeechSynthesisUtterance Error]:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("[Speech Error]:", e);
      resolve();
    }
  });
}
