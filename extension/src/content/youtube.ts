import type { SubtitleCapturedPayload, SubtitleStatusPayload } from '@gleano/shared';

class YouTubeSubtitleCapture {
  private observer: MutationObserver | null = null;
  private playerObserver: MutationObserver | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private capturedText: string[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSentText: string = '';
  private lastCapturedText: string = '';
  private retryCount: number = 0;
  private maxRetries: number = 20;
  private hasFoundSubtitles: boolean = false;
  private hasCheckedCCButton: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Wait for video player to load
    this.waitForPlayer();
  }

  private log(message: string, data?: unknown) {
    if (data) {
      console.log(`[Gleano] ${message}`, data);
    } else {
      console.log(`[Gleano] ${message}`);
    }
  }

  // Check if CC button exists and its state
  private checkCCButtonState(): { exists: boolean; enabled: boolean } {
    // Try multiple selectors for the CC button
    const ccButton = document.querySelector('.ytp-subtitles-button');
    if (!ccButton) {
      return { exists: false, enabled: false };
    }

    // Check if CC is enabled (aria-pressed="true" or has specific class)
    const ariaPressed = ccButton.getAttribute('aria-pressed');
    const isEnabled = ariaPressed === 'true';

    return { exists: true, enabled: isEnabled };
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
    // Check CC button state first
    if (!this.hasCheckedCCButton) {
      const ccState = this.checkCCButtonState();
      this.hasCheckedCCButton = true;
      this.log('CC button state:', ccState);

      if (ccState.exists && !ccState.enabled) {
        this.sendStatus('not_found', '請點擊 CC 按鈕或按 C 鍵開啟字幕');
        // Keep trying in case user enables it
      }
    }

    // Try multiple caption container selectors
    const containerSelectors = [
      '.ytp-caption-window-container',
      '.caption-window',
      '.ytp-caption-window-bottom',
      '.ytp-caption-window-top',
      // For newer YouTube player versions
      '.ytp-caption-window-rollup',
      '[class*="caption-window"]',
    ];

    let captionContainer: Element | null = null;
    for (const selector of containerSelectors) {
      captionContainer = document.querySelector(selector);
      if (captionContainer) {
        this.log(`Found caption container: ${selector}`);
        break;
      }
    }

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

      // Also start polling for subtitles (backup for auto-generated)
      this.startPolling();
    } else {
      this.retryCount++;

      // Check if CC button exists but not enabled
      const ccState = this.checkCCButtonState();

      if (this.retryCount >= this.maxRetries) {
        if (ccState.exists && !ccState.enabled) {
          this.sendStatus('not_found', '字幕未開啟！請點擊播放器右下角的 CC 按鈕，或按鍵盤 C 鍵');
        } else if (!ccState.exists) {
          this.sendStatus('not_found', '此影片可能沒有字幕，請確認影片支援字幕功能');
        } else {
          this.sendStatus('not_found', '找不到字幕，請確認字幕已開啟');
        }
        this.log('Subtitle container not found after max retries');
        // Keep polling anyway in case subtitles appear later
        this.startPolling();
      } else {
        if (ccState.exists && !ccState.enabled) {
          this.sendStatus('retrying', `請開啟字幕 (CC 按鈕)... (${this.retryCount}/${this.maxRetries})`);
        } else {
          this.sendStatus('retrying', `正在尋找字幕... (${this.retryCount}/${this.maxRetries})`);
        }
        setTimeout(() => this.startObserving(), 2000);
      }
    }

    // Observe the entire player for dynamic caption container creation
    const playerContainer = document.querySelector('.html5-video-player');
    if (playerContainer && !this.playerObserver) {
      this.playerObserver = new MutationObserver(() => {
        // Check for caption container appearing
        for (const selector of containerSelectors) {
          const newContainer = document.querySelector(selector);
          if (newContainer && !this.observer) {
            this.log(`Caption container appeared: ${selector}`);
            this.retryCount = 0; // Reset retry count
            this.startObserving();
            break;
          }
        }

        // Also check for text appearing in existing container
        if (!this.hasFoundSubtitles) {
          const text = this.extractSubtitleText();
          if (text) {
            this.checkForSubtitles();
          }
        }
      });
      this.playerObserver.observe(playerContainer, { childList: true, subtree: true });
    }
  }

  private startPolling() {
    if (this.pollInterval) return;

    // Poll every 500ms for subtitle text (catches auto-generated subtitles)
    this.pollInterval = setInterval(() => {
      this.checkForSubtitles();
    }, 500);
    this.log('Started subtitle polling');
  }

  private checkForSubtitles() {
    const text = this.extractSubtitleText();
    if (text && text !== this.lastCapturedText) {
      this.lastCapturedText = text;

      if (!this.hasFoundSubtitles) {
        this.hasFoundSubtitles = true;
        this.sendStatus('found', '成功捕捉到字幕！');
        this.log('First subtitle captured via polling');
      }

      this.capturedText.push(text);
      this.debounceSend();
    }
  }

  private extractSubtitleText(): string {
    // All possible selectors for YouTube subtitles (regular + auto-generated)
    const selectors = [
      // Standard caption segments (most common)
      '.ytp-caption-segment',
      // Caption window containers
      '.ytp-caption-window-container .captions-text span',
      '.ytp-caption-window-container span[class]',
      '.ytp-caption-window-bottom span',
      '.ytp-caption-window-top span',
      '.ytp-caption-window-rollup span',
      // Auto-generated specific selectors
      '.caption-visual-line',
      '.captions-text',
      '.caption-window span',
      // YouTube's newer caption renderer
      '.ytp-caption-window-container div[class]',
      '.ytp-caption-window-bottom div',
      // Generic caption-related elements
      '[class*="caption-window"] span',
      '[class*="caption"] span',
      // Fallback - any text in caption containers
      '.ytp-caption-window-container *',
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const texts: string[] = [];
          elements.forEach(el => {
            // Only get direct text content, avoid duplicates from nested elements
            const text = el.textContent?.trim();
            if (text && text.length > 0 && !texts.includes(text)) {
              // Filter out non-subtitle content
              if (!text.includes('Subscribe') && !text.includes('Like') && text.length < 300) {
                texts.push(text);
              }
            }
          });
          const combined = texts.join(' ').trim();
          if (combined && combined.length > 0) {
            return combined;
          }
        }
      } catch {
        // Ignore invalid selectors
      }
    }

    // Last resort: get all text from any caption-related container
    const containers = document.querySelectorAll('[class*="caption"]');
    for (const container of containers) {
      const text = container.textContent?.trim();
      if (text && text.length > 0 && text.length < 500) {
        // Make sure it's not a button or control
        if (!container.closest('button') && !container.closest('[role="button"]')) {
          return text;
        }
      }
    }

    return '';
  }

  private handleMutations(_mutations: MutationRecord[]) {
    // Use the unified extraction method
    const text = this.extractSubtitleText();

    if (text && text !== this.lastCapturedText) {
      this.lastCapturedText = text;

      if (!this.hasFoundSubtitles) {
        this.hasFoundSubtitles = true;
        this.sendStatus('found', '成功捕捉到字幕！');
        this.log('First subtitle captured via mutation observer');
      }

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
    if (this.playerObserver) {
      this.playerObserver.disconnect();
      this.playerObserver = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.log('Subtitle capture destroyed');
  }
}

// Initialize
const capture = new YouTubeSubtitleCapture();

// Cleanup on page unload
window.addEventListener('unload', () => {
  capture.destroy();
});

export {};
