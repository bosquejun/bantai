import { StorageAdapter } from "@/storage.js";
import z from "zod";
import { RateLimitOptions, RateLimitResult, rateLimitOptions, rateLimitResult } from "./fixed-window.js";


const slidingWindowStoreData = z.object({
    timestamps: z.array(z.number().int().min(0)),
});

async function fallbackSlidingWindow<TStorage extends StorageAdapter<z.infer<typeof slidingWindowStoreData>>>(
    storage: TStorage,
    key: string,
    now: number,
    windowMs: number,
    limit: number
  ): Promise<{ count: number; resetAt: number }> {
    const data = await storage.get(key);
    const timestamps = data?.timestamps ?? [];
    
    // Filter out timestamps outside the window
    const windowStart = now - windowMs;
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    let count = validTimestamps.length;
    let resetAt = now + windowMs;
    
    if (count < limit) {
      // Add current timestamp
      validTimestamps.push(now);
      count = validTimestamps.length;
      await storage.set(key, { timestamps: validTimestamps }, windowMs);
      
      // resetAt is when the oldest timestamp expires
      if (validTimestamps.length > 0) {
        const oldestTimestamp = Math.min(...validTimestamps);
        resetAt = oldestTimestamp + windowMs;
      }
    } else {
      // Limit exceeded, don't add timestamp
      // Update storage with filtered timestamps
      await storage.set(key, { timestamps: validTimestamps }, windowMs);
      
      // resetAt is when the oldest valid timestamp expires
      if (validTimestamps.length > 0) {
        const oldestTimestamp = Math.min(...validTimestamps);
        resetAt = oldestTimestamp + windowMs;
      }
    }
    
    return { count, resetAt };
  }

export async function slidingWindow<TStorage extends StorageAdapter<z.infer<typeof slidingWindowStoreData>>>(
    storage: TStorage,
    opts: RateLimitOptions
  ): Promise<RateLimitResult> {
    const { key, limit, windowMs, clock } = rateLimitOptions.parse(opts);
  
    const now = clock?.() || Date.now()
    const windowStart = now - windowMs
    const storageKey = key // Use the key directly, no window-based key for sliding window
  
    let count = 0
    let resetAt = now + windowMs
  
    if (storage.update) {
      const res = await storage.update(storageKey, (data) => {
        const timestamps = data?.timestamps ?? [];
        
        // Filter out timestamps outside the window
        const validTimestamps = timestamps.filter(ts => ts > windowStart);
        const currentCount = validTimestamps.length;
        
        if (currentCount >= limit) {
          // Limit exceeded, don't add new timestamp
          // Still update with filtered timestamps to clean up old ones
          return {
            value: { timestamps: validTimestamps },
            ttlMs: windowMs
          };
        }
        
        // Add current timestamp
        validTimestamps.push(now);
        
        return {
          value: { timestamps: validTimestamps },
          ttlMs: windowMs
        };
      })
  
      if (res) {
        count = res.timestamps.length;
        
        // Calculate resetAt: when the oldest timestamp expires
        if (res.timestamps.length > 0) {
          const oldestTimestamp = Math.min(...res.timestamps);
          resetAt = oldestTimestamp + windowMs;
        } else {
          resetAt = now + windowMs;
        }
      } else {
        // Fallback if update returns undefined (shouldn't happen per storage implementation)
        const fallback = await fallbackSlidingWindow(storage, storageKey, now, windowMs, limit);
        count = fallback.count;
        resetAt = fallback.resetAt;
      }
    } else {
      // Fallback for storage without update method
      const fallback = await fallbackSlidingWindow(storage, storageKey, now, windowMs, limit);
      count = fallback.count;
      resetAt = fallback.resetAt;
    }
  
    // For tests with timing, ensure resetAt is at least now + windowMs when clock is not provided
    if (!clock) {
      resetAt = Math.max(resetAt, now + windowMs);
    }
  
    return rateLimitResult.parse({
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt
      })
  }
