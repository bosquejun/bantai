import ms from "ms";
import { z } from "zod";
import { StorageAdapter } from "../storage.js";
import { RateLimitStorage, RateLimitStoreData } from "./rate-limit.js";

/**
 * Generic factory function to create a rate limit storage adapter with validation.
 * This function wraps any storage adapter with validation using the provided schema.
 * 
 * Users can provide their own storage implementation (Redis, database, etc.) and wrap it
 * with this function to add schema validation.
 * 
 * @param storage - Any storage adapter implementation (memory, Redis, database, etc.)
 * @param schema - Zod schema for validating storage data (union type for rate limit storage)
 * @returns A validated storage adapter that can be used with both fixed-window and sliding-window rate limiting
 */
export function createRateLimitStorage<T extends z.ZodTypeAny>(
  storage: StorageAdapter<z.infer<T>>,
  schema: T
): StorageAdapter<z.infer<T>> {
  return {
    async get(key) {
      const value = await storage.get(key);
      if (value !== undefined) {
        // Validate the value when reading
        return schema.parse(value);
      }
      return value;
    },

    async set(key, value, ttlMs) {
      // Validate the value before writing
      const validatedValue = schema.parse(value);
      await storage.set(key, validatedValue, ttlMs);
    },

    async delete(key) {
      await storage.delete(key);
    },

    async update(key, updater) {
      if (storage.update) {
        return storage.update(key, (current) => {
          // Validate current value if it exists
          const validatedCurrent = current !== undefined ? schema.parse(current) : undefined;
          const res = updater(validatedCurrent);
          if (!res) return null;
          // Validate the new value
          const validatedValue = schema.parse(res.value);
          return {
            value: validatedValue,
            ttlMs: res.ttlMs
          };
        });
      } else {
        // Fallback: read, update, write
        const current = await storage.get(key);
        const validatedCurrent = current !== undefined ? schema.parse(current) : undefined;
        const res = updater(validatedCurrent);
        if (res) {
          const validatedValue = schema.parse(res.value);
          await storage.set(key, validatedValue, res.ttlMs);
          return validatedValue;
        }
        return validatedCurrent;
      }
    }
  };
}

// Storage schemas for different rate limit types
export const rateLimitStoreData = z.object({
    count: z.number().int().min(0),
});

export const slidingWindowStoreData = z.object({
    timestamps: z.array(z.number().int().min(0)),
});


// Unified storage type that can handle both fixed-window and sliding-window
// This is a union of both storage data types - users provide storage that handles this union type
export const rateLimitStorageData = z.union([
    rateLimitStoreData,
    slidingWindowStoreData,
]);

// Rate limit config schema using discriminated union
export const fixedWindowConfigSchema = z.object({
    type: z.literal('fixed-window'),
    key: z.string(),
    limit: z.number().int().min(0),
    windowMs: z.string(),
});

export const slidingWindowConfigSchema = z.object({
    type: z.literal('sliding-window'),
    key: z.string(),
    limit: z.number().int().min(0),
    windowMs: z.string(),
});

export const rateLimitConfigSchema = z.discriminatedUnion('type', [
    fixedWindowConfigSchema,
    slidingWindowConfigSchema,
]);

export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type FixedWindowConfig = z.infer<typeof fixedWindowConfigSchema>;
export type SlidingWindowConfig = z.infer<typeof slidingWindowConfigSchema>;

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

  if(data?.type === 'fixed-window'){
    current = data.count;
  }
  
  // Check if under limit
  if (current >= config.limit) {
    const resetAt = windowStart + windowMs;
    return rateLimitCheckResultSchema.parse({
      allowed: false,
      remaining: 0,
      resetAt,
      reason: `rate_limit_exceeded: limit of ${config.limit} reached, resets at ${new Date(resetAt).toISOString()}`
    });
  }
  
  return rateLimitCheckResultSchema.parse({
    allowed: true,
    remaining: config.limit - current - 1,
    resetAt: windowStart + windowMs,
    reason: `rate_limit_passed: ${config.limit - current - 1} remaining`
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

  if(data?.type === 'sliding-window'){
    timestamps = data.timestamps;
  }
  
  // Filter out timestamps outside the window
  const windowStart = now - windowMs;
  const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
  const currentCount = validTimestamps.length;
  
  // Check if under limit
  if (currentCount >= config.limit) {
    // Calculate resetAt: when the oldest timestamp expires
    const resetAt = validTimestamps.length > 0
      ? Math.min(...validTimestamps) + windowMs
      : now + windowMs;
    return rateLimitCheckResultSchema.parse({
      allowed: false,
      remaining: 0,
      resetAt,
      reason: `rate_limit_exceeded: limit of ${config.limit} reached, resets at ${new Date(resetAt).toISOString()}`
    });
  }
  
  return rateLimitCheckResultSchema.parse({
    allowed: true,
    remaining: config.limit - currentCount - 1,
    resetAt: validTimestamps.length > 0
      ? Math.min(...validTimestamps) + windowMs
      : now + windowMs,
    reason: `rate_limit_passed: ${config.limit - currentCount - 1} remaining`
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
export async function checkRateLimit<TConfig extends RateLimitConfig>(
  storage: RateLimitStorage,
  config: TConfig,
  clock?: () => number
): Promise<RateLimitCheckResult> {
  // Validate config with Zod schema
  const validatedConfig = rateLimitConfigSchema.parse(config);
  const now = clock?.() || Date.now();
  const windowMs = ms(validatedConfig.windowMs as ms.StringValue);

  if (validatedConfig.type === 'fixed-window') {
    // The unified storage handles both types, so we can safely cast for fixed-window operations
    return checkFixedWindowRateLimit(
      storage,
      validatedConfig,
      now,
      windowMs
    );
  } else {
    // The unified storage handles both types, so we can safely cast for sliding-window operations
    return checkSlidingWindowRateLimit(
      storage,
      validatedConfig,
      now,
      windowMs
    );
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
    await storage.update(windowKey, (data: RateLimitStoreData | undefined) => {
      // Handle existing fixed-window data or create new
      const current = data?.type === 'fixed-window' ? data.count : 0;
      const newValue: RateLimitStoreData = {
        type: 'fixed-window',
        count: current + 1,
      };
      
      return {
        value: newValue,
        ttlMs: windowMs
      };
    });
  } else {
    // Fallback: read, increment, write
    const data = await storage.get(windowKey);
    const current = data?.type === 'fixed-window' ? data.count : 0;
    const newValue: RateLimitStoreData = {
      type: 'fixed-window',
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
    await storage.update(config.key, (data: RateLimitStoreData | undefined) => {
      // Handle existing sliding-window data or create new
      let timestamps: number[] = [];
      if (data?.type === 'sliding-window') {
        timestamps = data.timestamps;
      }
      
      const windowStart = now - windowMs;
      // Filter out old timestamps and add current one
      const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
      validTimestamps.push(now);
      
      const newValue: RateLimitStoreData = {
        type: 'sliding-window',
        timestamps: validTimestamps,
      };
      
      return {
        value: newValue,
        ttlMs: windowMs
      };
    });
  } else {
    // Fallback: read, update, write
    const data = await storage.get(config.key);
    let timestamps: number[] = [];
    if (data?.type === 'sliding-window') {
      timestamps = data.timestamps;
    }
    const windowStart = now - windowMs;
    const validTimestamps = timestamps.filter((ts: number) => ts > windowStart);
    validTimestamps.push(now);
    const newValue: RateLimitStoreData = {
      type: 'sliding-window',
      timestamps: validTimestamps,
    };
    await storage.set(config.key, newValue, windowMs);
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
  const windowMs = ms(validatedConfig.windowMs as ms.StringValue);

  if (validatedConfig.type === 'fixed-window') {
    await incrementFixedWindowRateLimit(
      storage,
      validatedConfig,
      now,
      windowMs
    );
  } else {
    await incrementSlidingWindowRateLimit(
      storage,
      validatedConfig,
      now,
      windowMs
    );
  }
}

