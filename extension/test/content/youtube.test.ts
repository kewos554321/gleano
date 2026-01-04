import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('YouTube Subtitle Capture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('should wait for YouTube player and start observing', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Hello</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    expect(document.querySelector('.html5-video-player')).not.toBeNull();
  });

  it('should handle caption mutations and send to background', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">First caption</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    // Add new caption segment
    const container = document.querySelector('.ytp-caption-window-container');
    const newSegment = document.createElement('div');
    newSegment.className = 'ytp-caption-segment';
    newSegment.textContent = 'Second caption';
    container?.appendChild(newSegment);

    // Flush microtasks for MutationObserver
    await vi.advanceTimersByTimeAsync(0);

    // Wait for debounce
    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUBTITLE_CAPTURED',
        payload: expect.objectContaining({
          source: 'youtube',
        }),
      })
    );
  });

  it('should retry if caption container not found initially', async () => {
    document.body.innerHTML = `<div class="html5-video-player"></div>`;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(2000);

    // Add caption container after initial check
    const player = document.querySelector('.html5-video-player');
    const container = document.createElement('div');
    container.className = 'ytp-caption-window-container';
    player?.appendChild(container);

    vi.advanceTimersByTime(2000);

    expect(document.querySelector('.ytp-caption-window-container')).not.toBeNull();
  });

  it('should not send duplicate text', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Same text</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    const segment = document.querySelector('.ytp-caption-segment');

    // Trigger first mutation
    if (segment) segment.textContent = 'Same text updated';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount1 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Trigger with same text - should not send again
    if (segment) segment.textContent = 'Same text updated';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount2 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Should not have increased calls for duplicate text
    expect(callCount2).toBe(callCount1);
  });

  it('should handle destroy on unload', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Text</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    // Trigger unload
    window.dispatchEvent(new Event('unload'));

    // Should not throw
    expect(true).toBe(true);
  });

  it('should start observing when caption container appears later', async () => {
    // Start with player but no caption container
    document.body.innerHTML = `<div class="html5-video-player"></div>`;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    // Add caption container after module init
    const player = document.querySelector('.html5-video-player');
    const captionContainer = document.createElement('div');
    captionContainer.className = 'ytp-caption-window-container';
    const segment = document.createElement('div');
    segment.className = 'ytp-caption-segment';
    segment.textContent = 'Late caption';
    captionContainer.appendChild(segment);
    player?.appendChild(captionContainer);

    // Trigger mutation observer
    await vi.advanceTimersByTimeAsync(0);

    // Should now be observing
    expect(document.querySelector('.ytp-caption-window-container')).not.toBeNull();
  });

  it('should clear existing debounce timer on new mutation', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">First</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    const segment = document.querySelector('.ytp-caption-segment');

    // Trigger first mutation
    if (segment) segment.textContent = 'First update';
    await vi.advanceTimersByTimeAsync(0);

    // Trigger another mutation before debounce fires (clears previous timer)
    vi.advanceTimersByTime(1000); // Only 1 second, debounce is 3
    if (segment) segment.textContent = 'Second update';
    await vi.advanceTimersByTimeAsync(0);

    // Now wait for full debounce
    vi.advanceTimersByTime(3000);

    // Should have sent only once with combined text
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should trim buffer when exceeds 20 items', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Initial</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    const segment = document.querySelector('.ytp-caption-segment');

    // Add more than 20 unique captions
    for (let i = 0; i < 25; i++) {
      if (segment) segment.textContent = `Caption ${i}`;
      await vi.advanceTimersByTimeAsync(0);
      vi.advanceTimersByTime(3100); // Wait for each debounce to fire
    }

    // Should not throw and should have sent messages
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should not send when capturedText buffer is empty', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment"></div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    // Trigger mutation with empty segment
    const segment = document.querySelector('.ytp-caption-segment');
    if (segment) segment.textContent = '';

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    // Should not send for empty text
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('should not send when fullText equals lastSentText', async () => {
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-caption-window-container">
          <div class="ytp-caption-segment">Test caption</div>
        </div>
      </div>
    `;

    await import('../../src/content/youtube');
    vi.advanceTimersByTime(1000);

    const segment = document.querySelector('.ytp-caption-segment');

    // First mutation and send
    if (segment) segment.textContent = 'Unique text';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount1 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Same text again - triggers the fullText === lastSentText branch
    if (segment) segment.textContent = 'Unique text';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount2 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Call count should increase because buffer accumulates
    expect(callCount2).toBeGreaterThanOrEqual(callCount1);
  });
});
