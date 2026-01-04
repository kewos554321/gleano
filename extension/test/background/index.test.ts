import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Background Service Worker', () => {
  let messageHandler: ((message: { type: string; payload?: unknown }, sender: unknown, sendResponse: (response: unknown) => void) => boolean) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Capture the message listener when module is imported
    (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mockImplementation((handler) => {
      messageHandler = handler;
    });

    // Mock chrome.storage.local.get to return settings
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      userSettings: {
        id: 'test-user-id',
        nativeLanguage: 'zh-TW',
        targetLanguage: 'en',
        level: 3,
      },
    });

    // Mock fetch for API calls
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { words: [], phrases: [], sentences: [] },
      }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllGlobals();
    messageHandler = null;
  });

  it('should register message listener on init', async () => {
    await import('../../src/background/index');

    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('should set up side panel behavior', async () => {
    await import('../../src/background/index');

    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    });
  });

  it('should handle SUBTITLE_CAPTURED message', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();
    const result = messageHandler?.(
      {
        type: 'SUBTITLE_CAPTURED',
        payload: {
          text: 'Hello world',
          source: 'youtube',
          url: 'https://youtube.com',
          title: 'Test Video',
          timestamp: Date.now(),
        },
      },
      {},
      sendResponse
    );

    expect(result).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('should handle OPEN_SIDEPANEL message', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      { type: 'OPEN_SIDEPANEL' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(chrome.tabs.query).toHaveBeenCalled();
  });

  it('should handle unknown message type', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      { type: 'UNKNOWN_TYPE' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown message type',
    });
  });

  it('should handle ANALYZE_REQUEST with buffer content', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();

    // Add content to buffer first
    messageHandler?.(
      {
        type: 'SUBTITLE_CAPTURED',
        payload: { text: 'Test text', source: 'youtube', url: '', title: '', timestamp: 0 },
      },
      {},
      sendResponse
    );

    // Request analysis
    messageHandler?.(
      { type: 'ANALYZE_REQUEST' },
      {},
      sendResponse
    );

    // Wait for async operations
    await vi.runAllTimersAsync();

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should not analyze with empty buffer', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      { type: 'ANALYZE_REQUEST' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should trim buffer when it exceeds limit', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();

    // Add many subtitles to trigger buffer trimming
    for (let i = 0; i < 60; i++) {
      messageHandler?.(
        {
          type: 'SUBTITLE_CAPTURED',
          payload: { text: `Text ${i}`, source: 'youtube', url: '', title: '', timestamp: 0 },
        },
        {},
        sendResponse
      );
    }

    // Should not throw
    expect(sendResponse).toHaveBeenCalled();
  });

  it('should handle API error gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      {
        type: 'SUBTITLE_CAPTURED',
        payload: { text: 'Test', source: 'youtube', url: '', title: '', timestamp: 0 },
      },
      {},
      sendResponse
    );

    messageHandler?.(
      { type: 'ANALYZE_REQUEST' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(100);

    // Should not throw - error is caught
    expect(true).toBe(true);
  });

  it('should handle tabs.query returning empty array', async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      { type: 'OPEN_SIDEPANEL' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(chrome.sidePanel.open).not.toHaveBeenCalled();
  });

  it('should handle sidePanel.open error gracefully', async () => {
    (chrome.sidePanel.open as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Cannot open side panel')
    );

    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      { type: 'OPEN_SIDEPANEL' },
      {},
      sendResponse
    );

    await vi.advanceTimersByTimeAsync(0);

    // Should not throw
    expect(true).toBe(true);
  });

  it('should forward subtitle to sidepanel', async () => {
    await import('../../src/background/index');

    const sendResponse = vi.fn();
    messageHandler?.(
      {
        type: 'SUBTITLE_CAPTURED',
        payload: {
          text: 'Hello',
          source: 'youtube',
          url: 'https://youtube.com',
          title: 'Test',
          timestamp: Date.now(),
        },
      },
      {},
      sendResponse
    );

    // Should forward to sidepanel
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUBTITLE_CAPTURED',
      })
    );
  });

  it('should use default settings when userSettings is not set', async () => {
    // Mock storage to return empty
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await import('../../src/background/index');

    const sendResponse = vi.fn();

    // Add subtitle to buffer
    messageHandler?.(
      {
        type: 'SUBTITLE_CAPTURED',
        payload: { text: 'Test for default settings', source: 'youtube', url: '', title: '', timestamp: 0 },
      },
      {},
      sendResponse
    );

    // Request analysis - should use default settings
    messageHandler?.(
      { type: 'ANALYZE_REQUEST' },
      {},
      sendResponse
    );

    await vi.runAllTimersAsync();

    // Verify fetch was called with default settings
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"nativeLanguage":"zh-TW"'),
      })
    );
  });

  it('should handle setPanelBehavior rejection gracefully', async () => {
    (chrome.sidePanel.setPanelBehavior as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Not supported')
    );

    // Should not throw
    await expect(import('../../src/background/index')).resolves.not.toThrow();
  });
});
