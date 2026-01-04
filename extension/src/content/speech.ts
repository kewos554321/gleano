import type { SubtitleCapturedPayload } from '@gleano/shared';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

class SpeechCapture {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private capturedText: string[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private targetLanguage: string = 'en-US';

  constructor() {
    this.init();
  }

  private init() {
    // Check if Web Speech API is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('[Gleano] Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.targetLanguage;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event: Event) => {
      console.error('[Gleano] Speech recognition error:', event);
    };

    this.recognition.onend = () => {
      // Restart if we're still supposed to be listening
      if (this.isListening) {
        this.recognition?.start();
      }
    };

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'START_SPEECH_RECOGNITION') {
        this.start(message.payload?.language);
      } else if (message.type === 'STOP_SPEECH_RECOGNITION') {
        this.stop();
      }
    });
  }

  private handleResult(event: SpeechRecognitionEvent) {
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      }
    }

    if (finalTranscript) {
      this.capturedText.push(finalTranscript);
      this.debounceSend();
    }
  }

  private debounceSend() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendCapturedText();
    }, 3000);
  }

  private sendCapturedText() {
    /* c8 ignore next */
    if (this.capturedText.length === 0) return;

    const fullText = this.capturedText.join(' ').trim();

    const payload: SubtitleCapturedPayload = {
      text: fullText,
      source: 'speech',
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage({
      type: 'SUBTITLE_CAPTURED',
      payload,
    });

    // Keep only recent text
    if (this.capturedText.length > 20) {
      this.capturedText = this.capturedText.slice(-10);
    }
  }

  public start(language?: string) {
    if (this.isListening || !this.recognition) return;

    if (language) {
      this.recognition.lang = language;
      this.targetLanguage = language;
    }

    this.isListening = true;
    this.recognition.start();
    console.log('[Gleano] Speech recognition started');
  }

  public stop() {
    if (!this.isListening || !this.recognition) return;

    this.isListening = false;
    this.recognition.stop();
    console.log('[Gleano] Speech recognition stopped');
  }

  public destroy() {
    this.stop();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// Initialize
const speechCapture = new SpeechCapture();

// Cleanup on page unload
window.addEventListener('unload', () => {
  speechCapture.destroy();
});

export {};
