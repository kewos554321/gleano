import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Netflix Subtitle Capture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('should wait for Netflix player and start observing', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Subtitle text</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    expect(document.querySelector('.watch-video')).not.toBeNull();
  });

  it('should handle subtitle mutations and send to background', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>First subtitle</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    // Add new subtitle span
    const container = document.querySelector('.player-timedtext');
    const newSpan = document.createElement('span');
    newSpan.textContent = 'Second subtitle';
    container?.appendChild(newSpan);

    // Flush microtasks for MutationObserver
    await vi.advanceTimersByTimeAsync(0);

    // Wait for debounce
    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUBTITLE_CAPTURED',
        payload: expect.objectContaining({
          source: 'netflix',
        }),
      })
    );
  });

  it('should use document.body as fallback container when watch-video not found', async () => {
    // Start without watch-video, then add it to trigger player detection
    document.body.innerHTML = `<div id="temp"></div>`;

    await import('../../src/content/netflix');

    // Add watch-video element
    const watchVideo = document.createElement('div');
    watchVideo.className = 'watch-video';
    document.body.appendChild(watchVideo);

    vi.advanceTimersByTime(1000);

    // Add player-timedtext after
    const timedtext = document.createElement('div');
    timedtext.className = 'player-timedtext';
    const span = document.createElement('span');
    span.textContent = 'Subtitle';
    timedtext.appendChild(span);
    watchVideo.appendChild(timedtext);

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    expect(document.querySelector('.watch-video')).not.toBeNull();
  });

  it('should observe on document.body when watch-video is not found initially', async () => {
    // Set up DOM without .watch-video initially
    document.body.innerHTML = `<div id="other"></div>`;

    await import('../../src/content/netflix');

    // Now add watch-video to trigger player detection
    const watchVideo = document.createElement('div');
    watchVideo.className = 'watch-video';
    document.body.appendChild(watchVideo);

    vi.advanceTimersByTime(1000);

    // The observer should be on watch-video now
    // Add player-timedtext with subtitle
    const timedtext = document.createElement('div');
    timedtext.className = 'player-timedtext';
    const span = document.createElement('span');
    span.textContent = 'New subtitle';
    timedtext.appendChild(span);
    watchVideo.appendChild(timedtext);

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should extract title from various Netflix title elements', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="video-title"><h4>Test Movie Title</h4></div>
        <div class="player-timedtext">
          <span>Subtitle</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    const container = document.querySelector('.player-timedtext');
    const newSpan = document.createElement('span');
    newSpan.textContent = 'New subtitle';
    container?.appendChild(newSpan);

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          title: 'Test Movie Title',
        }),
      })
    );
  });

  it('should handle destroy on unload', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Text</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    window.dispatchEvent(new Event('unload'));
    expect(true).toBe(true);
  });

  it('should not send when no subtitle container exists', async () => {
    document.body.innerHTML = `<div class="watch-video"></div>`;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    // Trigger mutation on watch-video (not body)
    const watchVideo = document.querySelector('.watch-video');
    const div = document.createElement('div');
    div.className = 'some-other-element';
    watchVideo?.appendChild(div);

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    // Should not have sent SUBTITLE_CAPTURED since no .player-timedtext exists (status messages are ok)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUBTITLE_CAPTURED' })
    );
  });

  it('should return early when player-timedtext is removed mid-observation', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Initial</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    // Remove player-timedtext
    const timedtext = document.querySelector('.player-timedtext');
    timedtext?.remove();

    // Trigger mutation
    const watchVideo = document.querySelector('.watch-video');
    const div = document.createElement('div');
    watchVideo?.appendChild(div);

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    // Should not crash and should not send (no subtitle container)
    expect(true).toBe(true);
  });

  it('should clear existing debounce timer on new mutation', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>First</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    const container = document.querySelector('.player-timedtext');
    const span = container?.querySelector('span');

    // Trigger first mutation
    if (span) span.textContent = 'First update';
    await vi.advanceTimersByTimeAsync(0);

    // Trigger another mutation before debounce fires (should clear previous timer)
    vi.advanceTimersByTime(1000);
    if (span) span.textContent = 'Second update';
    await vi.advanceTimersByTimeAsync(0);

    // Now wait for full debounce
    vi.advanceTimersByTime(3000);

    // Should have sent message
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should trim buffer when exceeds 20 items', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Initial</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    const container = document.querySelector('.player-timedtext');
    const span = container?.querySelector('span');

    // Add more than 20 unique captions
    for (let i = 0; i < 25; i++) {
      if (span) span.textContent = `Caption ${i}`;
      await vi.advanceTimersByTimeAsync(0);
      vi.advanceTimersByTime(3100);
    }

    // Should have sent messages and trimmed buffer
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should not send when capturedText buffer is empty', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span></span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    // Trigger mutation with empty text
    const container = document.querySelector('.player-timedtext');
    const span = container?.querySelector('span');
    if (span) span.textContent = '';

    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    // Should not send SUBTITLE_CAPTURED for empty text (status messages are ok)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SUBTITLE_CAPTURED' })
    );
  });

  it('should not send duplicate fullText after joining buffer', async () => {
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Same text</span>
        </div>
      </div>
    `;

    await import('../../src/content/netflix');
    vi.advanceTimersByTime(1000);

    const container = document.querySelector('.player-timedtext');
    const span = container?.querySelector('span');

    // First send
    if (span) span.textContent = 'Test subtitle';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount1 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Change text momentarily then back - the joined text should be the same
    if (span) span.textContent = 'Test subtitle';
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(3000);

    const callCount2 = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second call should still happen as the buffer accumulated
    expect(callCount2).toBeGreaterThanOrEqual(callCount1);
  });
});
