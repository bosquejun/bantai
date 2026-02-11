import { StorageAdapter } from "@bantai-dev/with-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    checkRateLimit,
    incrementRateLimit,
    rateLimitCheckResultSchema,
    rateLimitConfigSchema,
    rateLimitStoreData,
    slidingWindowStoreData,
    type FixedWindowConfig,
    type SlidingWindowConfig,
} from "./rate-limit-helpers.js";
import { type RateLimitStorage, type RateLimitStoreData } from "./rate-limit.js";

// Mock storage adapter for testing
function createMockStorage<T>(): StorageAdapter<T> {
    const store = new Map<string, T>();
    const ttlStore = new Map<string, number>();

    return {
        async get(key: string): Promise<T | undefined> {
            return store.get(key);
        },

        async set(key: string, value: T, ttlMs?: number): Promise<void> {
            store.set(key, value);
            if (ttlMs !== undefined) {
                ttlStore.set(key, ttlMs);
            }
        },

        async delete(key: string): Promise<void> {
            store.delete(key);
            ttlStore.delete(key);
        },

        async append(key: string, value: T): Promise<void> {
            this.set(key, value);
        },

        async update(
            key: string,
            updater: (current: T | undefined) => { value: T; ttlMs?: number } | null
        ): Promise<T | undefined> {
            const current = store.get(key);
            const res = updater(current);
            if (!res) return current;
            store.set(key, res.value);
            if (res.ttlMs !== undefined) {
                ttlStore.set(key, res.ttlMs);
            }
            return res.value;
        },
    };
}

describe("checkRateLimit - fixed-window", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000; // Fixed timestamp for testing
        clock = vi.fn(() => currentTime);
    });

    it("should allow when under limit", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9); // limit - current(0) - 1
        expect(result.resetAt).toBeGreaterThan(currentTime);
        expect(result.reason).toContain("rate_limit_passed");
    });

    it("should deny when at limit", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 5,
            period: "1h",
        };

        // Set up storage with count at limit
        const windowMs = 3600000; // 1 hour
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        await storage.set(storageKey, {
            type: "fixed-window",
            count: 5,
        });

        const result = await checkRateLimit(storage, config, clock);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.reason).toContain("rate_limit_exceeded");
    });

    it("should deny when over limit", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 3,
            period: "1h",
        };

        // Set up storage with count over limit
        const windowMs = 3600000; // 1 hour
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        await storage.set(storageKey, {
            type: "fixed-window",
            count: 5,
        });

        const result = await checkRateLimit(storage, config, clock);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should calculate correct window start", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        // Set count in previous window
        const windowMs = 3600000; // 1 hour
        const previousWindowStart = Math.floor((currentTime - windowMs) / windowMs) * windowMs;
        await storage.set(`${config.key}:${previousWindowStart}`, {
            type: "fixed-window",
            count: 10,
        });

        // Current window should be empty
        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
    });

    it("should handle different window sizes", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "5m",
        };

        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
    });
});

describe("checkRateLimit - sliding-window", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000;
        clock = vi.fn(() => currentTime);
    });

    it("should allow when under limit", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
        expect(result.reason).toContain("rate_limit_passed");
    });

    it("should deny when at limit", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 3,
            period: "1h",
        };

        const windowMs = 3600000; // 1 hour
        const timestamps = [currentTime - 1000, currentTime - 2000, currentTime - 3000];

        await storage.set(config.key, {
            type: "sliding-window",
            timestamps,
        });

        const result = await checkRateLimit(storage, config, clock);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.reason).toContain("rate_limit_exceeded");
    });

    it("should filter out old timestamps", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 5,
            period: "1h",
        };

        const windowMs = 3600000; // 1 hour
        // Mix of old and recent timestamps
        const timestamps = [
            currentTime - windowMs - 1000, // Old (outside window)
            currentTime - 1000, // Recent
            currentTime - 2000, // Recent
        ];

        await storage.set(config.key, {
            type: "sliding-window",
            timestamps,
        });

        const result = await checkRateLimit(storage, config, clock);

        // Should only count 2 recent timestamps, so 3 remaining (5 - 2 - 1)
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
    });

    it("should calculate resetAt correctly for sliding window", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 2,
            period: "1h",
        };

        const windowMs = 3600000; // 1 hour
        const oldestTimestamp = currentTime - 1000;
        const timestamps = [oldestTimestamp, currentTime - 500];

        await storage.set(config.key, {
            type: "sliding-window",
            timestamps,
        });

        const result = await checkRateLimit(storage, config, clock);
        // resetAt should be when oldest timestamp expires
        expect(result.resetAt).toBe(oldestTimestamp + windowMs);
    });

    it("should handle empty timestamps array", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 5,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });
});

describe("incrementRateLimit - fixed-window", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000;
        clock = vi.fn(() => currentTime);
    });

    it("should increment from 0 to 1", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        await incrementRateLimit(storage, config, clock);

        const windowMs = 3600000;
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        const data = await storage.get(storageKey);

        expect(data).toBeDefined();
        if (data?.type === "fixed-window") {
            expect(data.count).toBe(1);
        }
    });

    it("should increment existing count", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        const windowMs = 3600000;
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        await storage.set(storageKey, {
            type: "fixed-window",
            count: 5,
        });

        await incrementRateLimit(storage, config, clock);

        const data = await storage.get(storageKey);
        if (data?.type === "fixed-window") {
            expect(data.count).toBe(6);
        }
    });

    it("should handle multiple increments", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        await incrementRateLimit(storage, config, clock);
        await incrementRateLimit(storage, config, clock);
        await incrementRateLimit(storage, config, clock);

        const windowMs = 3600000;
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        const data = await storage.get(storageKey);

        if (data?.type === "fixed-window") {
            expect(data.count).toBe(3);
        }
    });

    it("should work with storage that has no update method", async () => {
        const mockStorage = createMockStorage<RateLimitStoreData>();
        delete (mockStorage as any).update;

        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        await incrementRateLimit(mockStorage, config, clock);

        const windowMs = 3600000;
        const windowStart = Math.floor(currentTime / windowMs) * windowMs;
        const storageKey = `${config.key}:${windowStart}`;
        const data = await mockStorage.get(storageKey);

        expect(data).toBeDefined();
        if (data?.type === "fixed-window") {
            expect(data.count).toBe(1);
        }
    });
});

describe("incrementRateLimit - sliding-window", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000;
        clock = vi.fn(() => currentTime);
    });

    it("should add timestamp to empty storage", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        await incrementRateLimit(storage, config, clock);

        const data = await storage.get(config.key);
        expect(data).toBeDefined();
        if (data?.type === "sliding-window") {
            expect(data.timestamps).toHaveLength(1);
            expect(data.timestamps[0]).toBe(currentTime);
        }
    });

    it("should add timestamp to existing timestamps", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        const existingTimestamps = [currentTime - 1000, currentTime - 2000];
        await storage.set(config.key, {
            type: "sliding-window",
            timestamps: existingTimestamps,
        });

        await incrementRateLimit(storage, config, clock);

        const data = await storage.get(config.key);
        if (data?.type === "sliding-window") {
            expect(data.timestamps).toHaveLength(3);
            expect(data.timestamps).toContain(currentTime);
        }
    });

    it("should filter out old timestamps when incrementing", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        const windowMs = 3600000;
        const oldTimestamp = currentTime - windowMs - 1000; // Outside window
        const recentTimestamp = currentTime - 1000; // Inside window

        await storage.set(config.key, {
            type: "sliding-window",
            timestamps: [oldTimestamp, recentTimestamp],
        });

        await incrementRateLimit(storage, config, clock);

        const data = await storage.get(config.key);
        if (data?.type === "sliding-window") {
            // Should only have recent timestamp and new one (old one filtered out)
            expect(data.timestamps).toHaveLength(2);
            expect(data.timestamps).not.toContain(oldTimestamp);
            expect(data.timestamps).toContain(recentTimestamp);
            expect(data.timestamps).toContain(currentTime);
        }
    });

    it("should work with storage that has no update method", async () => {
        const mockStorage = createMockStorage<RateLimitStoreData>();
        delete (mockStorage as any).update;

        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        await incrementRateLimit(mockStorage, config, clock);

        const data = await mockStorage.get(config.key);
        expect(data).toBeDefined();
        if (data?.type === "sliding-window") {
            expect(data.timestamps).toHaveLength(1);
            expect(data.timestamps[0]).toBe(currentTime);
        }
    });
});

describe("rate limit integration", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000;
        clock = vi.fn(() => currentTime);
    });

    it("should check, allow, and increment correctly for fixed-window", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 3,
            period: "1h",
        };

        // First check - should allow
        let result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);

        // Increment
        await incrementRateLimit(storage, config, clock);

        // Second check - should allow with 1 remaining
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);

        // Increment again
        await incrementRateLimit(storage, config, clock);

        // Third check - should allow with 0 remaining
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0);

        // Increment to limit
        await incrementRateLimit(storage, config, clock);

        // Fourth check - should deny
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should check, allow, and increment correctly for sliding-window", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 3,
            period: "1h",
        };

        // First check - should allow
        let result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);

        // Increment
        await incrementRateLimit(storage, config, clock);
        currentTime += 1000;
        clock = vi.fn(() => currentTime);

        // Second check - should allow with 1 remaining
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);

        // Increment again
        await incrementRateLimit(storage, config, clock);
        currentTime += 1000;
        clock = vi.fn(() => currentTime);

        // Third check - should allow with 0 remaining
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0);

        // Increment to limit
        await incrementRateLimit(storage, config, clock);
        currentTime += 1000;
        clock = vi.fn(() => currentTime);

        // Fourth check - should deny
        result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });
});

describe("schema validation", () => {
    it("should validate fixed window config schema", () => {
        const validConfig = {
            type: "fixed-window" as const,
            key: "test",
            limit: 10,
            period: "1h",
        };

        expect(() => rateLimitConfigSchema.parse(validConfig)).not.toThrow();

        const invalidConfig = {
            type: "fixed-window" as const,
            key: "test",
            limit: -1, // Invalid: negative limit
            period: "1h",
        };

        expect(() => rateLimitConfigSchema.parse(invalidConfig)).toThrow();
    });

    it("should validate sliding window config schema", () => {
        const validConfig = {
            type: "sliding-window" as const,
            key: "test",
            limit: 10,
            period: "1h",
        };

        expect(() => rateLimitConfigSchema.parse(validConfig)).not.toThrow();
    });

    it("should validate rate limit config discriminated union", () => {
        const fixedConfig = {
            type: "fixed-window" as const,
            key: "test",
            limit: 10,
            period: "1h",
        };

        const slidingConfig = {
            type: "sliding-window" as const,
            key: "test",
            limit: 10,
            period: "1h",
        };

        expect(() => rateLimitConfigSchema.parse(fixedConfig)).not.toThrow();
        expect(() => rateLimitConfigSchema.parse(slidingConfig)).not.toThrow();

        const invalidConfig = {
            type: "invalid-type" as any,
            key: "test",
            limit: 10,
            period: "1h",
        };

        expect(() => rateLimitConfigSchema.parse(invalidConfig)).toThrow();
    });

    it("should validate rate limit check result schema", () => {
        const validResult = {
            allowed: true,
            remaining: 5,
            resetAt: 1000000,
            reason: "test",
        };

        expect(() => rateLimitCheckResultSchema.parse(validResult)).not.toThrow();

        const invalidResult = {
            allowed: true,
            remaining: -1, // Invalid: negative remaining
            resetAt: 1000000,
        };

        expect(() => rateLimitCheckResultSchema.parse(invalidResult)).toThrow();
    });

    it("should validate storage data schemas", () => {
        const validFixedData = {
            type: "fixed-window" as const,
            count: 5,
        };

        const validSlidingData = {
            type: "sliding-window" as const,
            timestamps: [1000, 2000, 3000],
        };

        expect(() => rateLimitStoreData.parse({ type: "fixed-window", count: 5 })).not.toThrow();
        expect(() =>
            slidingWindowStoreData.parse({ type: "sliding-window", timestamps: [1000] })
        ).not.toThrow();

        const invalidFixedData = { type: "fixed-window" as const, count: -1 };
        const invalidSlidingData = { type: "sliding-window" as const, timestamps: [-1] };

        expect(() => rateLimitStoreData.parse(invalidFixedData)).toThrow();
        expect(() => slidingWindowStoreData.parse(invalidSlidingData)).toThrow();
    });
});

describe("edge cases", () => {
    let storage: RateLimitStorage;
    let clock: () => number;
    let currentTime: number;

    beforeEach(() => {
        storage = createMockStorage<RateLimitStoreData>();
        currentTime = 1000000;
        clock = vi.fn(() => currentTime);
    });

    it("should handle zero limit for fixed-window", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 0,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should handle zero limit for sliding-window", async () => {
        const config: SlidingWindowConfig = {
            type: "sliding-window",
            key: "test-key",
            limit: 0,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should handle very large limits", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 1000000,
            period: "1h",
        };

        const result = await checkRateLimit(storage, config, clock);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(999999);
    });

    it("should handle different time window formats", async () => {
        const configs: FixedWindowConfig[] = [
            { type: "fixed-window", key: "test1", limit: 10, period: "1s" },
            { type: "fixed-window", key: "test2", limit: 10, period: "1m" },
            { type: "fixed-window", key: "test3", limit: 10, period: "1h" },
            { type: "fixed-window", key: "test4", limit: 10, period: "1d" },
        ];

        for (const config of configs) {
            const result = await checkRateLimit(storage, config, clock);
            expect(result.allowed).toBe(true);
        }
    });

    it("should use Date.now when clock is not provided", async () => {
        const config: FixedWindowConfig = {
            type: "fixed-window",
            key: "test-key",
            limit: 10,
            period: "1h",
        };

        // Don't provide clock, should use Date.now
        const result = await checkRateLimit(storage, config);
        expect(result.allowed).toBe(true);
        expect(result.resetAt).toBeGreaterThan(Date.now());
    });
});
