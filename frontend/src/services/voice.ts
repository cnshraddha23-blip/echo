// Web Speech API helper for direct browser microphone capture (Zero mic contention)
export class BrowserVoiceRecognition {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true; // show words as spoken
      this.recognition.maxAlternatives = 1;
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public startListening(
    language: string,
    onInterim: (text: string) => void,
    onResult: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError(new Error("Web Speech API not supported in this browser."));
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }

    this.recognition.lang = language || 'en-IN';
    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        onInterim(interim);
      }
      if (final) {
        this.isListening = false;
        onResult(final.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      console.warn("[Web Speech Error]:", event.error);
      onError(event.error);
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
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export const browserVoice = new BrowserVoiceRecognition();

// Native browser text-to-speech fallback (guarantees voice response in any browser without lag)
export function speakBrowserSpeech(text: string, language = 'en-IN'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // stop previous speech

    const clean = text.replace(/[*`_#]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick Indian English / Kannada voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.includes(language.split('-')[0]) || v.lang.includes('IN'));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
