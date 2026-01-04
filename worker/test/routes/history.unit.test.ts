import { describe, it, expect, vi } from 'vitest';
import historyRoutes from '../../src/routes/history';

describe('History Routes Unit Tests', () => {
  describe('GET /:userId with null fields', () => {
    it('should handle items with null translation, source_url, source_title', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 1,
                  user_id: 'test-user',
                  type: 'word',
                  content: 'hello',
                  translation: null,
                  language: 'en',
                  source_url: null,
                  source_title: null,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data[0].translation).toBe('');
      expect(json.data[0].sourceUrl).toBe('');
      expect(json.data[0].sourceTitle).toBe('');
    });

    it('should handle items with actual values for optional fields', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 1,
                  user_id: 'test-user',
                  type: 'word',
                  content: 'hello',
                  translation: '你好',
                  language: 'en',
                  source_url: 'https://example.com',
                  source_title: 'Test Video',
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.data[0].translation).toBe('你好');
      expect(json.data[0].sourceUrl).toBe('https://example.com');
      expect(json.data[0].sourceTitle).toBe('Test Video');
    });
  });

  describe('GET /:userId/favorites with null fields', () => {
    it('should handle favorite items with null optional fields', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 1,
                  user_id: 'test-user',
                  type: 'phrase',
                  content: 'hello world',
                  translation: null,
                  language: 'en',
                  source_url: null,
                  source_title: null,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data[0].translation).toBe('');
      expect(json.data[0].sourceUrl).toBe('');
      expect(json.data[0].sourceTitle).toBe('');
    });
  });

  describe('GET /:userId with undefined results', () => {
    it('should handle undefined results.results gracefully', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: undefined }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });
  });

  describe('GET /:userId/favorites with undefined results', () => {
    it('should handle undefined results.results in favorites gracefully', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: undefined }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });
  });

  describe('GET /:userId error handling', () => {
    it('should handle database error in get history', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockRejectedValue(new Error('DB connection failed')),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('DB connection failed');
    });

    it('should handle non-Error objects in get history catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });

  describe('POST /:userId/favorites/:itemId error handling', () => {
    it('should handle non-Error objects in add favorites catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue({ code: 'UNKNOWN' }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites/1', {
        method: 'POST',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });

  describe('DELETE /:userId/favorites/:itemId error handling', () => {
    it('should handle database error in delete favorites', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Delete failed')),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites/1', {
        method: 'DELETE',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Delete failed');
    });

    it('should handle non-Error objects in delete favorites catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(null),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites/1', {
        method: 'DELETE',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });

  describe('GET /:userId/favorites error handling', () => {
    it('should handle database error in get favorites', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockRejectedValue(new Error('Favorites query failed')),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Favorites query failed');
    });

    it('should handle non-Error objects in get favorites catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockRejectedValue(123),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user/favorites', {
        method: 'GET',
      });

      const response = await historyRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });
});
