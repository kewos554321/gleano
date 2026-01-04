import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('Worker', () => {
  describe('GET /', () => {
    it('should return health check response', async () => {
      const response = await SELF.fetch('http://localhost/');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({
        name: 'Gleano API',
        version: '1.0.0',
        status: 'ok',
      });
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await SELF.fetch('http://localhost/unknown-route');
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({
        success: false,
        error: 'Not Found',
      });
    });
  });

  describe('CORS', () => {
    it('should allow chrome-extension origin', async () => {
      const response = await SELF.fetch('http://localhost/', {
        headers: {
          Origin: 'chrome-extension://test-extension-id',
        },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'chrome-extension://test-extension-id'
      );
    });

    it('should allow moz-extension origin', async () => {
      const response = await SELF.fetch('http://localhost/', {
        headers: {
          Origin: 'moz-extension://test-extension-id',
        },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'moz-extension://test-extension-id'
      );
    });

    it('should allow localhost origin', async () => {
      const response = await SELF.fetch('http://localhost/', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:3000'
      );
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await SELF.fetch('http://localhost/api/analyze', {
        method: 'OPTIONS',
        headers: {
          Origin: 'chrome-extension://test-extension-id',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      expect(response.status).toBe(204);
    });

    it('should reject disallowed origins', async () => {
      const response = await SELF.fetch('http://localhost/', {
        headers: {
          Origin: 'https://evil-site.com',
        },
      });

      // CORS should not allow this origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should allow requests without origin header', async () => {
      const response = await SELF.fetch('http://localhost/');

      // No origin header means the request came from same origin or non-browser
      expect(response.status).toBe(200);
    });
  });
});
