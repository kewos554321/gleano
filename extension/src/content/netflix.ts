import type { SubtitleCapturedPayload, SubtitleStatusPayload } from '@gleano/shared';

class NetflixSubtitleCapture {
  private observer: MutationObserver | null = null;
  private capturedText: string[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSentText: string = '';
  private retryCount: number = 0;
  private maxRetries: number = 10;
  private subtitleCheckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Wait for video player to load
    this.waitForPlayer();
  }

  private sendStatus(status: SubtitleStatusPayload['status'], message: string) {
    const payload: SubtitleStatusPayload = {
      status,
      source: 'netflix',
      message,
      retryCount: this.retryCount,
    };
    chrome.runtime.sendMessage({ type: 'SUBTITLE_STATUS', payload });
  }

  private waitForPlayer() {
    this.sendStatus('searching', '正在尋找 Netflix 播放器...');

    const checkPlayer = setInterval(() => {
      const player = document.querySelector('.watch-video');
      if (player) {
        clearInterval(checkPlayer);
        this.startObserving();
        console.log('[Gleano] Netflix player found, starting subtitle capture');
      }
    }, 1000);
  }

  private startObserving() {
    // Observe the entire video container for subtitle changes
    // Note: waitForPlayer ensures .watch-video exists before this is called
    const container = document.querySelector('.watch-video')!;

    this.sendStatus('found', '已找到播放器，等待字幕...');

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Check for subtitles after a delay
    this.subtitleCheckTimer = setTimeout(() => {
      this.checkSubtitleAvailability();
    }, 5000);
  }

  private checkSubtitleAvailability() {
    const subtitleContainer = document.querySelector('.player-timedtext');
    if (!subtitleContainer) {
      this.retryCount++;
      if (this.retryCount >= this.maxRetries) {
        this.sendStatus('not_found', '找不到字幕，請確認已開啟字幕設定');
      } else {
        this.sendStatus('retrying', `正在尋找字幕... (${this.retryCount}/${this.maxRetries})`);
        this.subtitleCheckTimer = setTimeout(() => {
          this.checkSubtitleAvailability();
        }, 2000);
      }
    }
  }

  private handleMutations(_mutations: MutationRecord[]) {
    // Netflix uses player-timedtext or similar for subtitles
    const subtitleContainer = document.querySelector('.player-timedtext');
    if (!subtitleContainer) return;

    const spans = subtitleContainer.querySelectorAll('span');
    const text = Array.from(spans)
      .map((span) => span.textContent?.trim())
      .filter(Boolean)
      .join(' ');

    if (text && text !== this.lastSentText) {
      this.capturedText.push(text);
      this.debounceSend();
    }
  }

  private debounceSend() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendCapturedText();
    }, 3000); // Collect subtitles for 3 seconds before sending
  }

  private sendCapturedText() {
    /* c8 ignore next */
    if (this.capturedText.length === 0) return;

    const fullText = this.capturedText.join(' ').trim();
    /* c8 ignore next */
    if (fullText === this.lastSentText) return;

    this.lastSentText = fullText;

    // Get title from Netflix page
    const titleElement = document.querySelector('.video-title h4') ||
      document.querySelector('[data-uia="video-title"]') ||
      document.querySelector('.ellipsize-text');
    const title = titleElement?.textContent || 'Netflix Video';

    const payload: SubtitleCapturedPayload = {
      text: fullText,
      source: 'netflix',
      url: window.location.href,
      title,
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage({
      type: 'SUBTITLE_CAPTURED',
      payload,
    });

    // Keep only recent text for context
    if (this.capturedText.length > 20) {
      this.capturedText = this.capturedText.slice(-10);
    }
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.subtitleCheckTimer) {
      clearTimeout(this.subtitleCheckTimer);
    }
  }
}

// Initialize
const capture = new NetflixSubtitleCapture();

// Cleanup on page unload
window.addEventListener('unload', () => {
  capture.destroy();
});

export {};
