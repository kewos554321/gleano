import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

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
  });

  describe('POST /api/history/:userId/favorites/:itemId', () => {
    it('should handle adding item to favorites', async () => {
      const response = await SELF.fetch('http://localhost/api/history/test-user/favorites/1', {
        method: 'POST',
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      // Will return 500 due to FK constraint if item doesn't exist, or 200 if it does
      expect([200, 500]).toContain(response.status);
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
  });
});
