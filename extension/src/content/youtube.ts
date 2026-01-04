import type { SubtitleCapturedPayload, SubtitleStatusPayload } from '@gleano/shared';

class YouTubeSubtitleCapture {
  private observer: MutationObserver | null = null;
  private capturedText: string[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSentText: string = '';
  private retryCount: number = 0;
  private maxRetries: number = 10;

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
      source: 'youtube',
      message,
      retryCount: this.retryCount,
    };
    chrome.runtime.sendMessage({ type: 'SUBTITLE_STATUS', payload });
  }

  private waitForPlayer() {
    this.sendStatus('searching', '正在尋找 YouTube 播放器...');

    const checkPlayer = setInterval(() => {
      const player = document.querySelector('.html5-video-player');
      if (player) {
        clearInterval(checkPlayer);
        this.startObserving();
        console.log('[Gleano] YouTube player found, starting subtitle capture');
      }
    }, 1000);
  }

  private startObserving() {
    // Observe caption container
    const captionContainer = document.querySelector('.ytp-caption-window-container');

    if (captionContainer) {
      this.sendStatus('found', '已找到字幕容器，等待字幕...');

      this.observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      this.observer.observe(captionContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } else {
      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        this.sendStatus('not_found', '找不到字幕，請確認影片已開啟字幕 (按 C 鍵)');
        console.log('[Gleano] Subtitle container not found after max retries');
      } else {
        this.sendStatus('retrying', `正在尋找字幕... (${this.retryCount}/${this.maxRetries})`);
        // Caption container not found, try again later
        setTimeout(() => this.startObserving(), 2000);
      }
    }

    // Also observe for dynamic caption container creation
    const playerContainer = document.querySelector('.html5-video-player');
    if (playerContainer) {
      const containerObserver = new MutationObserver(() => {
        const newCaptionContainer = document.querySelector('.ytp-caption-window-container');
        if (newCaptionContainer && !this.observer) {
          this.startObserving();
        }
      });
      containerObserver.observe(playerContainer, { childList: true, subtree: true });
    }
  }

  private handleMutations(_mutations: MutationRecord[]) {
    // Get all caption segments
    const segments = document.querySelectorAll('.ytp-caption-segment');
    const text = Array.from(segments)
      .map((seg) => seg.textContent?.trim())
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

    const payload: SubtitleCapturedPayload = {
      text: fullText,
      source: 'youtube',
      url: window.location.href,
      title: document.title.replace(' - YouTube', ''),
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
  }
}

// Initialize
const capture = new YouTubeSubtitleCapture();

// Cleanup on page unload
window.addEventListener('unload', () => {
  capture.destroy();
});

export {};
