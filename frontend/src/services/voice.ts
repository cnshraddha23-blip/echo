// Bulletproof Browser Voice Recognition with immediate media stream permission checks
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

  public async startListening(
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

    // Force prompt browser permission if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop audio tracks after permission check
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (permErr: any) {
      console.warn("[MediaDevices permission error]:", permErr);
      onError("not-allowed");
      return;
    }

    try {
      this.recognition.abort();
    } catch (e) {}

    this.recognition.lang = language || 'en-IN';
    this.isListening = true;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      this.isListening = false;
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          onResult(transcript.trim());
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || "error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
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

// Native browser text-to-speech engine
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
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      resolve();
    }
  });
}
