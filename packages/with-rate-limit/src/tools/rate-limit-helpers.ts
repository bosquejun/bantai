import ms from "ms";
import { z } from "zod";
import { RateLimitStorage } from "./rate-limit.js";

// Storage schemas for different rate limit types
export const rateLimitStoreData = z.object({
    type: z.literal("fixed-window"),
    count: z.number().int().min(0),
});

export const slidingWindowStoreData = z.object({
    type: z.literal("sliding-window"),
    timestamps: z.array(z.number().int().min(0)),
});

export const tokenBucketStoreData = z.object({
    type: z.literal("token-bucket"),
    remainingTokens: z.number().int().min(0),
    lastRefillAt: z.number().int().min(0),
});

// Unified storage type that can handle fixed-window, sliding-window, and token-bucket
// This is a union of all storage data types - users provide storage that handles this union type
export const rateLimitStorageData = z.union([
    rateLimitStoreData,
    slidingWindowStoreData,
    tokenBucketStoreData,
]);

// Rate limit config schema - unified with standardized properties
export const rateLimitConfigSchema = z.object({
    type: z.enum(["fixed-window", "sliding-window", "token-bucket"]),
    key: z.string(),
    limit: z.number().int().min(0),
    period: z.string(),
    cost: z.number().int().min(1).optional(),
});

export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

// Type aliases for clarity (narrowed types)
export type FixedWindowConfig = RateLimitConfig & { type: "fixed-window" };
export type SlidingWindowConfig = RateLimitConfig & { type: "sliding-window" };
export type TokenBucketConfig = RateLimitConfig & { type: "token-bucket" };

// Result schema
export const rateLimitCheckResultSchema = z.object({
    allowed: z.boolean(),
    remaining: z.number().int().min(0),
    resetAt: z.number().int().min(0),
    reason: z.string().optional(),
});

export type RateLimitCheckResult = z.infer<typeof rateLimitCheckResultSchema>;

// Storage data types
export type FixedWindowStorageData = z.infer<typeof rateLimitStoreData>;
export type SlidingWindowStorageData = z.infer<typeof slidingWindowStoreData>;
export type TokenBucketStorageData = z.infer<typeof tokenBucketStoreData>;
export type RateLimitStorageData = z.infer<typeof rateLimitStorageData>;

/**
 * Checks rate limit without incrementing the counter for fixed-window.
 * Use this in your rule's evaluate function.
 */
async function checkFixedWindowRateLimit(
    storage: RateLimitStorage,
    config: FixedWindowConfig,
    now: number,
    windowMs: number
): Promise<RateLimitCheckResult> {
    // Calculate window key for fixed-window
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const storageKey = `${config.key}:${windowStart}`;

    const data = await storage.get(storageKey);

    let current = 0;

    if (data && "type" in data && data.type === "fixed-window") {
        current = data.count;
    }

    // Check if under limit
    if (current >= config.limit) {
        const resetAt = windowStart + windowMs;
        return rateLimitCheckResultSchema.parse({
            allowed: false,
            remaining: 0,
            resetAt,
            reason: `rate_limit_exceeded: limit of ${config.limit} reached, resets at ${new Date(resetAt).toISOString()}`,
        });
    }

    return rateLimitCheckResultSchema.parse({
        allowed: true,
        remaining: config.limit - current - 1,
        resetAt: windowStart + windowMs,
        reason: `rate_limit_passed: ${config.limit - current - 1} remaining`,
    });
}

/**
 * Checks rate limit without incrementing the counter for sliding-window.
 * Use this in your rule's evaluate function.
 */
async function checkSlidingWindowRateLimit(
    storage: RateLimitStorage,
    config: SlidingWindowConfig,
    now: number,
    windowMs: number
): Promise<RateLimitCheckResult> {
    // For sliding-window, check timestamps
    const data = await storage.get(config.key);

    let timestamps: number[] = [];

    if (data && "type" in data && data.type === "sliding-window") {
        timestamps = data.timestamps;
    }

    // Filter out timestamps outside the window
    const windowStart = now - windowMs;
    const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
    const currentCount = validTimestamps.length;

    // Check if under limit
    if (currentCount >= config.limit) {
        // Calculate resetAt: when the oldest timestamp expires
        const resetAt =
            validTimestamps.length > 0 ? Math.min(...validTimestamps) + windowMs : now + windowMs;
        return rateLimitCheckResultSchema.parse({
            allowed: false,
            remaining: 0,
            resetAt,
            reason: `rate_limit_exceeded: limit of ${config.limit} reached, resets at ${new Date(resetAt).toISOString()}`,
        });
    }

    return rateLimitCheckResultSchema.parse({
        allowed: true,
        remaining: config.limit - currentCount - 1,
        resetAt:
            validTimestamps.length > 0 ? Math.min(...validTimestamps) + windowMs : now + windowMs,
        reason: `rate_limit_passed: ${config.limit - currentCount - 1} remaining`,
    });
}

/**
 * Checks rate limit without incrementing the counter.
 * Use this in your rule's evaluate function.
 *
 * @param storage - Single unified storage adapter that handles both fixed-window and sliding-window data
 *                  Users can provide their own custom storage implementation
 * @param config - Rate limit configuration with discriminated union type
 * @param clock - Optional clock function for testing (defaults to Date.now)
 */
/**
 * Calculates the token refill rate (tokens per millisecond) based on limit and period.
 *
 * @param limit - Maximum number of tokens the bucket can hold
 * @param period - Time period string (e.g. "1d", "1h", "30m") representing time to refill from empty to full
 * @returns Tokens per millisecond
 */
function calculateTokenRefillRate(limit: number, period: string): number {
    const periodMs = ms(period as ms.StringValue);
    if (isNaN(periodMs) || periodMs <= 0) {
        throw new Error(`Invalid period: ${period}`);
    }
    return limit / periodMs;
}

/**
 * Checks rate limit without incrementing the counter for token-bucket.
 * Use this in your rule's evaluate function.
 */
async function checkTokenBucketRateLimit(
    storage: RateLimitStorage,
    config: TokenBucketConfig,
    now: number
): Promise<RateLimitCheckResult> {
    const data = await storage.get(config.key);

    let tokens = config.limit;
    let lastRefillAt = now;

    if (data && "type" in data && data.type === "token-bucket") {
        // Handle backward compatibility: support both 'tokens' (old) and 'remainingTokens' (new)
        tokens =
            "remainingTokens" in data
                ? data.remainingTokens
                : ((data as any).tokens ?? config.limit);
        lastRefillAt = data.lastRefillAt;
    }

    // Calculate refill rate
    const tokensPerMs = calculateTokenRefillRate(config.limit, config.period);

    // Calculate elapsed time since last refill
    const elapsedMs = now - lastRefillAt;

    // Refill tokens based on elapsed time
    if (elapsedMs > 0) {
        const tokensToAdd = elapsedMs * tokensPerMs;
        tokens = Math.min(config.limit, tokens + tokensToAdd);
    }

    // Get cost (default: 1)
    const cost = config.cost ?? 1;

    // Check if enough tokens are available
    const available = tokens >= cost;
    const remaining = Math.floor(tokens - cost);

    // Calculate resetAt: when the bucket will be full again
    const tokensNeeded = config.limit - tokens;
    const msUntilFull = tokensNeeded > 0 ? tokensNeeded / tokensPerMs : 0;
    const resetAt = now + Math.ceil(msUntilFull);

    if (!available) {
        return rateLimitCheckResultSchema.parse({
            allowed: false,
            remaining: Math.max(0, Math.floor(tokens)),
            resetAt,
            reason: `rate_limit_exceeded: need ${cost} tokens but only ${Math.floor(tokens)} available, resets at ${new Date(resetAt).toISOString()}`,
        });
    }

    return rateLimitCheckResultSchema.parse({
        allowed: true,
        remaining: Math.max(0, remaining),
        resetAt,
        reason: `rate_limit_passed: ${remaining} tokens remaining after consuming ${cost}`,
    });
}

export async function checkRateLimit<TConfig extends RateLimitConfig>(
    storage: RateLimitStorage,
    config: TConfig,
    clock?: () => number
): Promise<RateLimitCheckResult> {
    // Validate config with Zod schema
    const validatedConfig = rateLimitConfigSchema.parse(config);
    const now = clock?.() || Date.now();

    if (validatedConfig.type === "fixed-window") {
        const windowMs = ms(validatedConfig.period as ms.StringValue);
        return checkFixedWindowRateLimit(
            storage,
            validatedConfig as FixedWindowConfig,
            now,
            windowMs
        );
    } else if (validatedConfig.type === "sliding-window") {
        const windowMs = ms(validatedConfig.period as ms.StringValue);
        return checkSlidingWindowRateLimit(
            storage,
            validatedConfig as SlidingWindowConfig,
            now,
            windowMs
        );
    } else {
        // token-bucket
        return checkTokenBucketRateLimit(storage, validatedConfig as TokenBucketConfig, now);
    }
}

/**
 * Increments the rate limit counter for fixed-window.
 * Use this in your rule's onAllow hook.
 */
async function incrementFixedWindowRateLimit(
    storage: RateLimitStorage,
    config: FixedWindowConfig,
    now: number,
    windowMs: number
): Promise<void> {
    // Calculate window key
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${config.key}:${windowStart}`;

    // Increment the counter atomically
    if (storage.update) {
        await storage.update(windowKey, (data: RateLimitStorageData | undefined) => {
            // Handle existing fixed-window data or create new
            const current = data && "type" in data && data.type === "fixed-window" ? data.count : 0;
            const newValue: RateLimitStorageData = {
                type: "fixed-window",
                count: current + 1,
            };

            return {
                value: newValue,
                ttlMs: windowMs,
            };
        });
    } else {
        // Fallback: read, increment, write
        const data = await storage.get(windowKey);
        const current = data && "type" in data && data.type === "fixed-window" ? data.count : 0;
        const newValue: RateLimitStorageData = {
            type: "fixed-window",
            count: current + 1,
        };
        await storage.set(windowKey, newValue, windowMs);
    }
}

/**
 * Increments the rate limit counter for sliding-window.
 * Use this in your rule's onAllow hook.
 */
async function incrementSlidingWindowRateLimit(
    storage: RateLimitStorage,
    config: SlidingWindowConfig,
    now: number,
    windowMs: number
): Promise<void> {
    // For sliding-window, add current timestamp
    if (storage.update) {
        await storage.update(config.key, (data: RateLimitStorageData | undefined) => {
            // Handle existing sliding-window data or create new
            let timestamps: number[] = [];
            if (data && "type" in data && data.type === "sliding-window") {
                timestamps = data.timestamps;
            }

            const windowStart = now - windowMs;
            // Filter out old timestamps and add current one
            const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
            validTimestamps.push(now);

            const newValue: RateLimitStorageData = {
                type: "sliding-window",
                timestamps: validTimestamps,
            };

            return {
                value: newValue,
                ttlMs: windowMs,
            };
        });
    } else {
        // Fallback: read, update, write
        const data = await storage.get(config.key);
        let timestamps: number[] = [];
        if (data && "type" in data && data.type === "sliding-window") {
            timestamps = data.timestamps;
        }
        const windowStart = now - windowMs;
        const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
        validTimestamps.push(now);
        const newValue: RateLimitStorageData = {
            type: "sliding-window",
            timestamps: validTimestamps,
        };
        await storage.set(config.key, newValue, windowMs);
    }
}

/**
 * Increments the rate limit counter for token-bucket.
 * Use this in your rule's onAllow hook.
 */
async function incrementTokenBucketRateLimit(
    storage: RateLimitStorage,
    config: TokenBucketConfig,
    now: number
): Promise<void> {
    const tokensPerMs = calculateTokenRefillRate(config.limit, config.period);
    const periodMs = ms(config.period as ms.StringValue);

    if (storage.update) {
        await storage.update(config.key, (data: RateLimitStorageData | undefined) => {
            let tokens = config.limit;
            let lastRefillAt = now;

            if (data && "type" in data && data.type === "token-bucket") {
                // Handle backward compatibility: support both 'tokens' (old) and 'remainingTokens' (new)
                tokens =
                    "remainingTokens" in data
                        ? data.remainingTokens
                        : ((data as any).tokens ?? config.limit);
                lastRefillAt = data.lastRefillAt;
            }

            // Calculate elapsed time since last refill
            const elapsedMs = now - lastRefillAt;

            // Refill tokens based on elapsed time
            if (elapsedMs > 0) {
                const tokensToAdd = elapsedMs * tokensPerMs;
                tokens = Math.min(config.limit, tokens + tokensToAdd);
            }

            // Consume tokens (default: 1, or use cost if specified)
            const cost = config.cost ?? 1;
            tokens = Math.max(0, tokens - cost);

            const newValue: RateLimitStorageData = {
                type: "token-bucket",
                remainingTokens: Math.floor(tokens),
                lastRefillAt: now,
            };

            return {
                value: newValue,
                ttlMs: periodMs,
            };
        });
    } else {
        // Fallback: read, update, write
        const data = await storage.get(config.key);
        let tokens = config.limit;
        let lastRefillAt = now;

        if (data && "type" in data && data.type === "token-bucket") {
            tokens = data.remainingTokens;
            lastRefillAt = data.lastRefillAt;
        }

        // Calculate elapsed time since last refill
        const elapsedMs = now - lastRefillAt;

        // Refill tokens based on elapsed time
        if (elapsedMs > 0) {
            const tokensToAdd = elapsedMs * tokensPerMs;
            tokens = Math.min(config.limit, tokens + tokensToAdd);
        }

        // Consume tokens (default: 1, or use cost if specified)
        const cost = config.cost ?? 1;
        tokens = Math.max(0, tokens - cost);

        const newValue: RateLimitStorageData = {
            type: "token-bucket",
            remainingTokens: Math.floor(tokens),
            lastRefillAt: now,
        };

        await storage.set(config.key, newValue, periodMs);
    }
}

/**
 * Increments the rate limit counter.
 * Use this in your rule's onAllow hook.
 *
 * @param storage - Single unified storage adapter that handles both fixed-window and sliding-window data
 *                  Users can provide their own custom storage implementation
 * @param config - Rate limit configuration with discriminated union type
 * @param clock - Optional clock function for testing (defaults to Date.now)
 */
export async function incrementRateLimit(
    storage: RateLimitStorage,
    config: RateLimitConfig,
    clock?: () => number
): Promise<void> {
    // Validate config with Zod schema
    const validatedConfig = rateLimitConfigSchema.parse(config);
    const now = clock?.() || Date.now();

    if (validatedConfig.type === "fixed-window") {
        const windowMs = ms(validatedConfig.period as ms.StringValue);
        await incrementFixedWindowRateLimit(
            storage,
            validatedConfig as FixedWindowConfig,
            now,
            windowMs
        );
    } else if (validatedConfig.type === "sliding-window") {
        const windowMs = ms(validatedConfig.period as ms.StringValue);
        await incrementSlidingWindowRateLimit(
            storage,
            validatedConfig as SlidingWindowConfig,
            now,
            windowMs
        );
    } else {
        // token-bucket
        await incrementTokenBucketRateLimit(storage, validatedConfig as TokenBucketConfig, now);
    }
}
