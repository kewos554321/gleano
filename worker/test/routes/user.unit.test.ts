import { describe, it, expect, vi } from 'vitest';
import userRoutes from '../../src/routes/user';

describe('User Routes Unit Tests', () => {
  describe('GET /:userId error handling', () => {
    it('should handle database error in get user', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockRejectedValue(new Error('User query failed')),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await userRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('User query failed');
    });

    it('should handle non-Error objects in get user catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'GET',
      });

      const response = await userRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });

  describe('PUT /:userId error handling', () => {
    it('should handle database error in update user', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Update failed')),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 4 }),
      });

      const response = await userRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Update failed');
    });

    it('should handle non-Error objects in update user catch block', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue({ custom: 'error' }),
          }),
        }),
      };

      const request = new Request('http://localhost/test-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLanguage: 'en' }),
      });

      const response = await userRoutes.fetch(request, {
        DB: mockDb as unknown as D1Database,
      });

      const json = await response.json();
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unknown error');
    });
  });
});
