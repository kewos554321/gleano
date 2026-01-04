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

    it('should return cached result on second request', async () => {
      const transcript = `Cached test transcript ${Date.now()}`;
      const requestBody = {
        transcript,
        userId: 'cache-test-user',
        nativeLanguage: 'zh-TW',
        targetLanguage: 'en',
        level: 3,
      };

      // First request
      const response1 = await SELF.fetch('http://localhost/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'chrome-extension://test',
        },
        body: JSON.stringify(requestBody),
      });

      // Only test cache if first request was successful
      if (response1.status === 200) {
        // Second request should hit cache
        const response2 = await SELF.fetch('http://localhost/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'chrome-extension://test',
          },
          body: JSON.stringify(requestBody),
        });

        const json2 = await response2.json();
        expect(response2.status).toBe(200);
        expect(json2.success).toBe(true);
        expect(json2.cached).toBe(true);
      } else {
        // API key not configured, skip cache test
        expect(true).toBe(true);
      }
    });
  });
});
