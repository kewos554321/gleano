import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Create fresh chrome mock for each test
function createChromeMock() {
  return {
    runtime: {
      sendMessage: vi.fn().mockReturnValue(Promise.resolve()),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn((_keys, callback) => {
          const result = {};
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        }),
        set: vi.fn((_items, callback) => {
          if (callback) {
            callback();
          }
          return Promise.resolve();
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
}

// Setup global chrome before any tests run
(globalThis as { chrome?: unknown }).chrome = createChromeMock();

// Refresh chrome mock before each test to handle vi.resetModules()
beforeEach(() => {
  (globalThis as { chrome?: unknown }).chrome = createChromeMock();
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
  writable: true,
  configurable: true,
});
