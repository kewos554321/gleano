import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Netflix Subtitle Capture', () => {
  beforeEach(() => {
    // Setup DOM for Netflix
    document.body.innerHTML = `
      <div class="watch-video">
        <div class="player-timedtext">
          <span>Subtitle text here</span>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should find Netflix player element', () => {
    const player = document.querySelector('.watch-video');
    expect(player).not.toBeNull();
  });

  it('should find timedtext container', () => {
    const container = document.querySelector('.player-timedtext');
    expect(container).not.toBeNull();
  });

  it('should extract subtitle text', () => {
    const container = document.querySelector('.player-timedtext');
    const text = container?.textContent?.trim();
    expect(text).toBe('Subtitle text here');
  });
});
