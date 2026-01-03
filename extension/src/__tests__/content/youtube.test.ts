import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('YouTube Subtitle Capture', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Hello</div>
          <div class="ytp-caption-segment">World</div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should find caption segments', () => {
    const segments = document.querySelectorAll('.ytp-caption-segment');
    expect(segments.length).toBe(2);
  });

  it('should extract text from caption segments', () => {
    const segments = document.querySelectorAll('.ytp-caption-segment');
    const text = Array.from(segments)
      .map((seg) => seg.textContent?.trim())
      .filter(Boolean)
      .join(' ');

    expect(text).toBe('Hello World');
  });

  it('should find video player element', () => {
    const player = document.querySelector('.html5-video-player');
    expect(player).not.toBeNull();
  });

  it('should find caption container', () => {
    const container = document.querySelector('.ytp-caption-window-container');
    expect(container).not.toBeNull();
  });
});
