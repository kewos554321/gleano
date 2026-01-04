import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:test';

describe('History Routes', () => {
  describe('GET /api/history/:userId', () => {
    it('should return empty array for user with no history', async () => {
      const response = await SELF.fetch('http://localhost/api/history/non-existent-user', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it('should support type filter', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user?type=word', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('should support phrase type filter', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user?type=phrase', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should support sentence type filter', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user?type=sentence', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should support limit and offset', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user?limit=10&offset=5', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should ignore invalid type filter', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user?type=invalid', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should return history items with all fields mapped correctly', async () => {
      const userId = `history-fields-${Date.now()}`;

      // Create user first
      await env.DB.prepare('INSERT INTO users (id, native_language, target_language, level) VALUES (?, ?, ?, ?)')
        .bind(userId, 'zh-TW', 'en', 3)
        .run();

      // Insert a learned item
      await env.DB.prepare(`INSERT INTO learned_items (user_id, type, content, translation, language, source_url, source_title) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(userId, 'word', 'hello', '你好', 'en', 'https://example.com', 'Test Video')
        .run();

      const response = await SELF.fetch(`http://localhost/api/history/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0]).toMatchObject({
        userId: userId,
        type: 'word',
        content: 'hello',
        translation: '你好',
        language: 'en',
        sourceUrl: 'https://example.com',
        sourceTitle: 'Test Video',
      });
    });
  });

  describe('POST /api/history/:userId/favorites/:itemId', () => {
    it('should successfully add existing item to favorites', async () => {
      const userId = `fav-user-${Date.now()}`;

      // Create user first
      await env.DB.prepare('INSERT INTO users (id, native_language, target_language, level) VALUES (?, ?, ?, ?)')
        .bind(userId, 'zh-TW', 'en', 3)
        .run();

      // Insert a learned item
      const result = await env.DB.prepare(`INSERT INTO learned_items (user_id, type, content, translation, language) VALUES (?, ?, ?, ?, ?)`)
        .bind(userId, 'word', 'test', '測試', 'en')
        .run();

      const itemId = result.meta.last_row_id;

      const response = await SELF.fetch(`http://localhost/api/history/${userId}/favorites/${itemId}`, {
        method: 'POST',
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should return error for non-existent item', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user/favorites/99999', {
        method: 'POST',
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      // FK constraint fails because item doesn't exist
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });

  describe('DELETE /api/history/:userId/favorites/:itemId', () => {
    it('should remove item from favorites', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user/favorites/1', {
        method: 'DELETE',
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should handle removing non-existent favorite gracefully', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user/favorites/99999', {
        method: 'DELETE',
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe('GET /api/history/:userId/favorites', () => {
    it('should return empty favorites for new user', async () => {
      const response = await SELF.fetch(`http://localhost/api/history/new-user-${Date.now()}/favorites`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it('should support limit and offset for favorites', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user/favorites?limit=5&offset=0', {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should return favorited items with correct data', async () => {
      const userId = `fav-list-${Date.now()}`;

      // Create user
      await env.DB.prepare('INSERT INTO users (id, native_language, target_language, level) VALUES (?, ?, ?, ?)')
        .bind(userId, 'zh-TW', 'en', 3)
        .run();

      // Insert a learned item
      const itemResult = await env.DB.prepare(`INSERT INTO learned_items (user_id, type, content, translation, language) VALUES (?, ?, ?, ?, ?)`)
        .bind(userId, 'phrase', 'how are you', '你好嗎', 'en')
        .run();

      const itemId = itemResult.meta.last_row_id;

      // Add to favorites
      await env.DB.prepare('INSERT INTO favorites (user_id, item_id) VALUES (?, ?)')
        .bind(userId, itemId)
        .run();

      const response = await SELF.fetch(`http://localhost/api/history/${userId}/favorites`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].content).toBe('how are you');
    });
  });
});
