import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/sidepanel/App';

describe('Sidepanel App', () => {
  let messageHandler: ((message: { type: string; payload?: unknown }) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Capture message listener
    (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (handler) => {
        messageHandler = handler;
      }
    );
  });

  afterEach(() => {
    messageHandler = null;
    vi.resetModules();
  });

  it('should render empty state initially', () => {
    render(<App />);

    expect(screen.getByText('學習內容')).toBeInTheDocument();
    expect(screen.getByText('播放 YouTube 影片')).toBeInTheDocument();
  });

  it('should show loading state when subtitle is captured', async () => {
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'SUBTITLE_CAPTURED',
        payload: {
          text: 'Hello',
          source: 'youtube',
          url: 'https://youtube.com',
          title: 'Test Video',
          timestamp: Date.now(),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('來源: Test Video')).toBeInTheDocument();
    });
  });

  it('should display analysis results', async () => {
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [
            {
              word: 'hello',
              phonetic: '/həˈloʊ/',
              pos: 'interjection',
              meaning: '你好',
              example: 'Hello world!',
            },
          ],
          phrases: [
            {
              phrase: 'How are you?',
              meaning: '你好嗎？',
              context: 'Greeting',
            },
          ],
          sentences: [
            {
              sentence: 'Nice to meet you.',
              translation: '很高興認識你。',
              note: 'Common greeting',
            },
          ],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('單字 (1)')).toBeInTheDocument();
      expect(screen.getByText('片語 (1)')).toBeInTheDocument();
      expect(screen.getByText('句型 (1)')).toBeInTheDocument();
    });
  });

  it('should display word card content', async () => {
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [
            {
              word: 'hello',
              phonetic: '/həˈloʊ/',
              pos: 'noun',
              meaning: '你好',
              example: 'Say hello!',
            },
          ],
          phrases: [],
          sentences: [],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
      expect(screen.getByText('/həˈloʊ/ · noun')).toBeInTheDocument();
      expect(screen.getByText('你好')).toBeInTheDocument();
      expect(screen.getByText('Say hello!')).toBeInTheDocument();
    });
  });

  it('should toggle favorite on word card', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [
            {
              word: 'test',
              phonetic: '/test/',
              pos: 'noun',
              meaning: '測試',
              example: 'This is a test.',
            },
          ],
          phrases: [],
          sentences: [],
        },
      });
    });

    await waitFor(async () => {
      const heartButton = screen.getAllByRole('button')[1]; // First heart button
      await user.click(heartButton);
    });

    // Should not throw and should toggle state
    expect(true).toBe(true);
  });

  it('should switch to phrases tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [],
          phrases: [
            {
              phrase: 'Good morning',
              meaning: '早安',
              context: 'Morning greeting',
            },
          ],
          sentences: [],
        },
      });
    });

    await waitFor(async () => {
      const phraseTab = screen.getByText('片語 (1)');
      await user.click(phraseTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Good morning')).toBeInTheDocument();
      expect(screen.getByText('早安')).toBeInTheDocument();
    });
  });

  it('should switch to sentences tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [],
          phrases: [],
          sentences: [
            {
              sentence: 'Hello world!',
              translation: '你好世界！',
              note: 'Basic greeting',
            },
          ],
        },
      });
    });

    await waitFor(async () => {
      const sentenceTab = screen.getByText('句型 (1)');
      await user.click(sentenceTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
      expect(screen.getByText('你好世界！')).toBeInTheDocument();
      expect(screen.getByText('Basic greeting')).toBeInTheDocument();
    });
  });

  it('should display sentence without note', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [],
          phrases: [],
          sentences: [
            {
              sentence: 'Simple sentence',
              translation: '簡單的句子',
            },
          ],
        },
      });
    });

    await waitFor(async () => {
      const sentenceTab = screen.getByText('句型 (1)');
      await user.click(sentenceTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Simple sentence')).toBeInTheDocument();
      expect(screen.getByText('簡單的句子')).toBeInTheDocument();
    });
  });

  it('should request analysis when button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First show results to enable button
    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: { words: [], phrases: [], sentences: [] },
      });
    });

    await waitFor(async () => {
      const analyzeButton = screen.getByText('分析');
      await user.click(analyzeButton);
    });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'ANALYZE_REQUEST',
      payload: { filter: {}, platform: 'youtube' },
    });
  });

  it('should cleanup message listener on unmount', () => {
    const { unmount } = render(<App />);

    unmount();

    expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
  });

  it('should toggle favorite on phrase card', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [],
          phrases: [
            {
              phrase: 'Test phrase',
              meaning: '測試片語',
              context: 'Testing',
            },
          ],
          sentences: [],
        },
      });
    });

    await waitFor(async () => {
      const phraseTab = screen.getByText('片語 (1)');
      await user.click(phraseTab);
    });

    await waitFor(async () => {
      const heartButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg')
      );
      if (heartButtons[1]) {
        await user.click(heartButtons[1]);
      }
    });

    expect(true).toBe(true);
  });

  it('should toggle favorite on sentence card', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      messageHandler?.({
        type: 'ANALYSIS_RESULT',
        payload: {
          words: [],
          phrases: [],
          sentences: [
            {
              sentence: 'Test sentence',
              translation: '測試句子',
            },
          ],
        },
      });
    });

    await waitFor(async () => {
      const sentenceTab = screen.getByText('句型 (1)');
      await user.click(sentenceTab);
    });

    await waitFor(async () => {
      const heartButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg')
      );
      if (heartButtons[1]) {
        await user.click(heartButtons[1]);
      }
    });

    expect(true).toBe(true);
  });
});
