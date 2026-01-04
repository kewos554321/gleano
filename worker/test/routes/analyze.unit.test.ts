import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import analyzeRoutes from '../../src/routes/analyze';

describe('Analyze Routes Unit Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('POST / without API key', () => {
    it('should return 500 when API key is not configured', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }),
      };

      const mockCache = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };

      // Use root path "/" because analyzeRoutes is a sub-app
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Test transcript',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const response = await analyzeRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
        CACHE: mockCache as unknown as KVNamespace,
        GEMINI_API_KEY: '', // Empty API key
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('API key not configured');
    });
  });

  describe('POST / with empty results', () => {
    it('should handle empty analysis result without batching', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }),
        batch: vi.fn().mockResolvedValue([]),
      };

      const mockCache = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };

      // Mock Gemini API to return empty arrays
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"words": [], "phrases": [], "sentences": []}' }],
                },
              },
            ],
          }),
      });

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Test transcript empty result',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const response = await analyzeRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
        CACHE: mockCache as unknown as KVNamespace,
        GEMINI_API_KEY: 'test-key',
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      // batch should NOT be called when there are no items
      expect(mockDb.batch).not.toHaveBeenCalled();
    });
  });

  describe('POST / with API error', () => {
    it('should handle and return error when analysis fails', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      };

      const mockCache = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };

      // Mock Gemini API to succeed
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"words": [], "phrases": [], "sentences": []}' }],
                },
              },
            ],
          }),
      });

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Test transcript for error',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const response = await analyzeRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
        CACHE: mockCache as unknown as KVNamespace,
        GEMINI_API_KEY: 'test-key',
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Database error');
    });

    it('should handle non-Error objects in catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      };

      const mockCache = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      };

      // Mock Gemini API
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"words": [], "phrases": [], "sentences": []}' }],
                },
              },
            ],
          }),
      });

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Test transcript',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const response = await analyzeRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
        CACHE: mockCache as unknown as KVNamespace,
        GEMINI_API_KEY: 'test-key',
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });
});
