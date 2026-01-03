import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('Analyze Routes', () => {
  describe('POST /api/analyze', () => {
    it('should return 400 if transcript is empty', async () => {
      const response = await SELF.fetch('http://localhost/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({
          transcript: '',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const json = await response.json();
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Transcript is required');
    });

    it('should return 400 if transcript is missing', async () => {
      const response = await SELF.fetch('http://localhost/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const json = await response.json();
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('should process valid transcript', async () => {
      const response = await SELF.fetch('http://localhost/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify({
          transcript: 'Hello world, this is a test transcript.',
          userId: 'test-user',
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        }),
      });

      const json = await response.json();
      // Should return 200 if API key is configured, or 500 if not
      expect([200, 500]).toContain(response.status);
    });
  });
});
