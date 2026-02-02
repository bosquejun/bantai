import { StorageAdapter, createMemoryStorage } from '@/storage.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fixedWindow } from './fixed-window.js';

const rateLimitStoreData = z.object({
  count: z.number().int().min(0),
});

describe('fixedWindow', () => {
  describe('with storage that has update method', () => {
    let storage: StorageAdapter<z.infer<typeof rateLimitStoreData>>;

    beforeEach(() => {
      storage = createMemoryStorage(rateLimitStoreData);
    });

    it('should allow requests within the limit', async () => {
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 10,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests in the same window', async () => {
      const opts = {
        key: 'test-key',
        limit: 5,
        windowMs: 1000,
      };

      // Make 3 requests
      const result1 = await fixedWindow(storage, opts);
      const result2 = await fixedWindow(storage, opts);
      const result3 = await fixedWindow(storage, opts);

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(2);
    });

    it('should deny requests when limit is exceeded', async () => {
      const opts = {
        key: 'test-key',
        limit: 2,
        windowMs: 1000,
      };

      // Make 2 requests (should be allowed)
      await fixedWindow(storage, opts);
      await fixedWindow(storage, opts);

      // Third request should be denied
      const result3 = await fixedWindow(storage, opts);

      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it('should reset count when entering a new window', async () => {
      const windowMs = 1000;
      let currentTime = 1000;

      const clock = () => currentTime;

      const opts = {
        key: 'test-key',
        limit: 2,
        windowMs,
        clock,
      };

      // Make 2 requests in first window
      await fixedWindow(storage, opts);
      const result2 = await fixedWindow(storage, opts);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(0);

      // Third request in first window should be denied
      const result3 = await fixedWindow(storage, opts);
      expect(result3.allowed).toBe(false);

      // Move to next window
      currentTime = 2000;

      // Request in new window should be allowed
      const result4 = await fixedWindow(storage, opts);
      expect(result4.allowed).toBe(true);
      expect(result4.remaining).toBe(1);
    });

    it('should calculate resetAt correctly', async () => {
      const windowMs = 5000;
      const currentTime = 12345;
      const clock = () => currentTime;

      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 10,
        windowMs,
        clock,
      });

      const expectedWindowStart = Math.floor(currentTime / windowMs) * windowMs;
      const expectedResetAt = expectedWindowStart + windowMs;

      expect(result.resetAt).toBe(expectedResetAt);
    });

    it('should use Date.now() when clock is not provided', async () => {
      const before = Date.now();
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 10,
        windowMs: 1000,
      });
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + 1000);
      expect(result.resetAt).toBeLessThanOrEqual(after + 1000);
    });

    it('should handle zero limit', async () => {
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 0,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle different keys independently', async () => {
      const opts = {
        limit: 2,
        windowMs: 1000,
      };

      // Exhaust limit for key1
      await fixedWindow(storage, { ...opts, key: 'key1' });
      await fixedWindow(storage, { ...opts, key: 'key1' });
      const key1Result = await fixedWindow(storage, { ...opts, key: 'key1' });
      expect(key1Result.allowed).toBe(false);

      // key2 should still have full limit
      const key2Result = await fixedWindow(storage, { ...opts, key: 'key2' });
      expect(key2Result.allowed).toBe(true);
      expect(key2Result.remaining).toBe(1);
    });

    it('should handle window boundaries correctly', async () => {
      const windowMs = 1000;
      let currentTime = 999;
      const clock = () => currentTime;

      const opts = {
        key: 'test-key',
        limit: 2,
        windowMs,
        clock,
      };

      // Request at end of window
      await fixedWindow(storage, opts);

      // Move to next window
      currentTime = 1000;

      // Should reset in new window
      const result = await fixedWindow(storage, opts);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('with storage without update method (fallback)', () => {
    let storage: StorageAdapter<z.infer<typeof rateLimitStoreData>>;

    beforeEach(() => {
      // Create a storage adapter without update method
      const store = new Map<string, z.infer<typeof rateLimitStoreData>>();

      storage = {
        async get(key: string) {
          return store.get(key);
        },
        async set(key: string, value: z.infer<typeof rateLimitStoreData>, ttlMs?: number) {
          store.set(key, value);
          // Note: In a real implementation, TTL would be handled
        },
        async delete(key: string) {
          store.delete(key);
        },
        // No update method - will use fallback
      };
    });

    it('should allow requests within the limit using fallback', async () => {
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 10,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track multiple requests using fallback', async () => {
      const opts = {
        key: 'test-key',
        limit: 5,
        windowMs: 1000,
      };

      const result1 = await fixedWindow(storage, opts);
      const result2 = await fixedWindow(storage, opts);
      const result3 = await fixedWindow(storage, opts);

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(2);
    });

    it('should deny requests when limit is exceeded using fallback', async () => {
      const opts = {
        key: 'test-key',
        limit: 2,
        windowMs: 1000,
      };

      await fixedWindow(storage, opts);
      await fixedWindow(storage, opts);

      const result3 = await fixedWindow(storage, opts);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it('should handle empty storage using fallback', async () => {
      const result = await fixedWindow(storage, {
        key: 'new-key',
        limit: 10,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('edge cases', () => {
    let storage: StorageAdapter<z.infer<typeof rateLimitStoreData>>;

    beforeEach(() => {
      storage = createMemoryStorage(rateLimitStoreData);
    });

    it('should handle very large limits', async () => {
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 1000000,
        windowMs: 1000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999999);
    });

    it('should handle very small windows', async () => {
      const result = await fixedWindow(storage, {
        key: 'test-key',
        limit: 10,
        windowMs: 1,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should handle concurrent requests with same key', async () => {
      const opts = {
        key: 'test-key',
        limit: 10,
        windowMs: 1000,
      };

      // Make concurrent requests
      const results = await Promise.all([
        fixedWindow(storage, opts),
        fixedWindow(storage, opts),
        fixedWindow(storage, opts),
        fixedWindow(storage, opts),
        fixedWindow(storage, opts),
      ]);

      // All should be allowed
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });

      // Total remaining should account for all requests
      const totalUsed = results.length;
      expect(results[results.length - 1]!.remaining).toBe(10 - totalUsed);
    });

    it('should handle update returning null (limit exceeded)', async () => {
      const opts = {
        key: 'test-key',
        limit: 1,
        windowMs: 1000,
      };

      // First request should be allowed
      const result1 = await fixedWindow(storage, opts);
      expect(result1.allowed).toBe(true);

      // Second request should be denied
      const result2 = await fixedWindow(storage, opts);
      expect(result2.allowed).toBe(false);
      expect(result2.remaining).toBe(0);
    });
  });
});

