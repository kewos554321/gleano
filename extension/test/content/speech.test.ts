import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Speech Capture', () => {
  let mockSpeechRecognition: {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
    onresult: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onend: (() => void) | null;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Create mock SpeechRecognition
    mockSpeechRecognition = {
      continuous: false,
      interimResults: false,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };

    const MockSpeechRecognition = vi.fn(() => mockSpeechRecognition);
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('should initialize with SpeechRecognition API', async () => {
    await import('../../src/content/speech');

    expect(mockSpeechRecognition.continuous).toBe(true);
    expect(mockSpeechRecognition.interimResults).toBe(true);
    expect(mockSpeechRecognition.lang).toBe('en-US');
  });

  it('should handle START_SPEECH_RECOGNITION message', async () => {
    await import('../../src/content/speech');

    // Get the message listener
    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    // Send start message
    messageHandler({ type: 'START_SPEECH_RECOGNITION' });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should handle START_SPEECH_RECOGNITION with custom language', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    messageHandler({ type: 'START_SPEECH_RECOGNITION', payload: { language: 'ja-JP' } });

    expect(mockSpeechRecognition.lang).toBe('ja-JP');
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should handle STOP_SPEECH_RECOGNITION message', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    // Start first
    messageHandler({ type: 'START_SPEECH_RECOGNITION' });
    // Then stop
    messageHandler({ type: 'STOP_SPEECH_RECOGNITION' });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('should handle speech recognition results', async () => {
    await import('../../src/content/speech');

    // Trigger onresult callback
    const mockEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          0: { transcript: 'Hello world', confidence: 0.9 },
        },
      },
    };

    mockSpeechRecognition.onresult?.(mockEvent);

    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUBTITLE_CAPTURED',
        payload: expect.objectContaining({
          source: 'speech',
        }),
      })
    );
  });

  it('should handle interim results', async () => {
    await import('../../src/content/speech');

    const mockEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: false,
          0: { transcript: 'Hello', confidence: 0.7 },
        },
      },
    };

    mockSpeechRecognition.onresult?.(mockEvent);

    vi.advanceTimersByTime(3000);

    // Interim results should not send messages
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('should restart recognition on end if still listening', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    // Start recognition
    messageHandler({ type: 'START_SPEECH_RECOGNITION' });

    // Trigger onend
    mockSpeechRecognition.onend?.();

    expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(2);
  });

  it('should not restart recognition on end if stopped', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    // Start and stop
    messageHandler({ type: 'START_SPEECH_RECOGNITION' });
    messageHandler({ type: 'STOP_SPEECH_RECOGNITION' });

    // Trigger onend
    mockSpeechRecognition.onend?.();

    // Should only have been called once (the initial start)
    expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(1);
  });

  it('should handle destroy on unload', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    messageHandler({ type: 'START_SPEECH_RECOGNITION' });

    window.dispatchEvent(new Event('unload'));

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  it('should handle error event', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('../../src/content/speech');

    const mockError = { error: 'not-allowed' };
    mockSpeechRecognition.onerror?.(mockError);

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should not start if already listening', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    messageHandler({ type: 'START_SPEECH_RECOGNITION' });
    messageHandler({ type: 'START_SPEECH_RECOGNITION' });

    expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(1);
  });

  it('should not stop if not listening', async () => {
    await import('../../src/content/speech');

    const addListenerMock = chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>;
    const messageHandler = addListenerMock.mock.calls[0][0];

    messageHandler({ type: 'STOP_SPEECH_RECOGNITION' });

    expect(mockSpeechRecognition.stop).not.toHaveBeenCalled();
  });

  it('should handle when SpeechRecognition is not available', async () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await import('../../src/content/speech');

    expect(consoleSpy).toHaveBeenCalledWith('[Gleano] Speech recognition not supported');

    consoleSpy.mockRestore();
  });

  it('should trim captured text buffer when it exceeds limit', async () => {
    await import('../../src/content/speech');

    // Add many speech results
    for (let i = 0; i < 25; i++) {
      const mockEvent = {
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: `Word ${i}`, confidence: 0.9 },
          },
        },
      };
      mockSpeechRecognition.onresult?.(mockEvent);
    }

    vi.advanceTimersByTime(3000);

    // Should have sent the message without throwing
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should not send when capturedText buffer is empty', async () => {
    await import('../../src/content/speech');

    // Just wait for debounce without adding any results
    vi.advanceTimersByTime(3000);

    // Should not send anything - buffer is empty
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle debounce timer clearing in sendCapturedText', async () => {
    await import('../../src/content/speech');

    // Trigger result to populate buffer
    const mockEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          0: { transcript: 'First', confidence: 0.9 },
        },
      },
    };
    mockSpeechRecognition.onresult?.(mockEvent);

    // Trigger another before debounce fires
    vi.advanceTimersByTime(1000);

    const mockEvent2 = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: true,
          0: { transcript: 'Second', confidence: 0.9 },
        },
      },
    };
    mockSpeechRecognition.onresult?.(mockEvent2);

    // Now wait for full debounce
    vi.advanceTimersByTime(3000);

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
  });
});
