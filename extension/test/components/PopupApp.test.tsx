import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../src/popup/App';

// Mock Radix UI Select to make it testable in JSDOM
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) => (
    <div data-testid="mock-select" data-value={value} data-onvaluechange={onValueChange ? 'true' : 'false'}>
      {children}
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="zh-TW">繁體中文</option>
        <option value="zh-CN">简体中文</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="1">A1</option>
        <option value="2">A2</option>
        <option value="3">B1</option>
        <option value="4">B2</option>
        <option value="5">C1</option>
        <option value="6">C2</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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

  it('should update native language setting', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('母語')).toBeInTheDocument();
    });

    // Get the first select (native language)
    const selects = screen.getAllByTestId('select-native');
    fireEvent.change(selects[0], { target: { value: 'zh-CN' } });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      userSettings: expect.objectContaining({
        nativeLanguage: 'zh-CN',
      }),
    });
  });

  it('should update target language setting', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('學習語言')).toBeInTheDocument();
    });

    // Get the second select (target language)
    const selects = screen.getAllByTestId('select-native');
    fireEvent.change(selects[1], { target: { value: 'ja' } });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      userSettings: expect.objectContaining({
        targetLanguage: 'ja',
      }),
    });
  });

  it('should update level setting', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('程度')).toBeInTheDocument();
    });

    // Get the third select (level)
    const selects = screen.getAllByTestId('select-native');
    fireEvent.change(selects[2], { target: { value: '5' } });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      userSettings: expect.objectContaining({
        level: 5,
      }),
    });
  });

  it('should not update settings when settings is null', async () => {
    // Mock to never call callback, keeping settings null
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // Don't call callback
    });

    render(<App />);

    // Component is in loading state, settings is null
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Try to get selects - they shouldn't exist
    const selects = screen.queryAllByTestId('select-native');
    expect(selects).toHaveLength(0);
  });
});
