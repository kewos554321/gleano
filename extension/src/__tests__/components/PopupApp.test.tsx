import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../popup/App';

describe('Popup App', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock chrome.storage.local.get to return default settings
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (keys, callback) => {
        callback({
          userSettings: {
            id: 'test-user',
            nativeLanguage: 'zh-TW',
            targetLanguage: 'en',
            level: 3,
          },
        });
      }
    );
  });

  it('should render loading state initially', () => {
    // Mock to delay callback
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        // Don't call callback immediately
      }
    );

    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render app title', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Gleano')).toBeInTheDocument();
    });
  });

  it('should render language selectors', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('母語')).toBeInTheDocument();
      expect(screen.getByText('學習語言')).toBeInTheDocument();
      expect(screen.getByText('程度')).toBeInTheDocument();
    });
  });

  it('should render open panel button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('開啟學習面板')).toBeInTheDocument();
    });
  });

  it('should create default settings if none exist', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(
      (keys, callback) => {
        callback({});
      }
    );

    render(<App />);

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('should send OPEN_SIDEPANEL message when button clicked', async () => {
    render(<App />);

    await waitFor(() => {
      const button = screen.getByText('開啟學習面板');
      button.click();
    });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'OPEN_SIDEPANEL',
    });
  });
});
