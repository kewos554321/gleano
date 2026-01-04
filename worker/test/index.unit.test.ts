import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index';

// Test the actual app's error handler by triggering errors that bypass route try-catch
describe('Index Error Handler Tests', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should handle JSON parse error in analyze route', async () => {
    // Send invalid JSON to trigger a parse error before the route's try-catch
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json {{{',
    });

    const response = await app.fetch(request, {
      DB: {} as D1Database,
      CACHE: {} as KVNamespace,
      GEMINI_API_KEY: 'test',
      ENVIRONMENT: 'production',
    });

    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it('should show detailed error in development mode', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    const response = await app.fetch(request, {
      DB: {} as D1Database,
      CACHE: {} as KVNamespace,
      GEMINI_API_KEY: 'test',
      ENVIRONMENT: 'development',
    });

    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    // In development mode, error message should contain the actual error
    expect(json.error).toContain('JSON');
  });
});
