import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('User Routes', () => {
  describe('GET /api/user/:id', () => {
    it('should create default user if not exists', async () => {
      const userId = `test-user-${Date.now()}`;
      const response = await SELF.fetch(`http://localhost/api/user/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toMatchObject({
        id: userId,
        nativeLanguage: 'zh-TW',
        targetLanguage: 'en',
        level: 3,
      });
    });

    it('should return existing user', async () => {
      const userId = `existing-user-${Date.now()}`;

      // First call creates user
      await SELF.fetch(`http://localhost/api/user/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      // Second call returns existing user
      const response = await SELF.fetch(`http://localhost/api/user/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(userId);
    });
  });

  describe('PUT /api/user/:id', () => {
    it('should update user settings', async () => {
      const userId = `update-user-${Date.now()}`;

      // First create the user
      await SELF.fetch(`http://localhost/api/user/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      // Then update
      const response = await SELF.fetch(`http://localhost/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({
          level: 4,
        }),
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should return 400 if no updates provided', async () => {
      const response = await SELF.fetch('http://localhost/api/user/test-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({}),
      });

      const json = await response.json();
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('No updates provided');
    });

    it('should update multiple fields', async () => {
      const userId = `multi-update-${Date.now()}`;

      // Create user first
      await SELF.fetch(`http://localhost/api/user/${userId}`, {
        headers: {
          Origin: 'chrome-extension://test',
        },
      });

      const response = await SELF.fetch(`http://localhost/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({
          nativeLanguage: 'en',
          targetLanguage: 'ja',
          level: 5,
        }),
      });

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});
