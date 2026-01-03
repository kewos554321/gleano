import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        callback({});
      }),
      set: vi.fn((items, callback) => {
        callback?.();
      }),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
  sidePanel: {
    open: vi.fn().mockResolvedValue(undefined),
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
});
