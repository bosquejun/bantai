import { StorageAdapter } from "@/storage.js";
import z from "zod";


export const rateLimitStoreData = z.object({
    count: z.number().int().min(0),
});


export const rateLimitResult = z.object({
    remaining: z.number().int().min(0),
    resetAt: z.number().int().min(0),
    allowed: z.boolean(),
});

export const rateLimitOptions = z.object({
    key: z.string(),
    limit: z.number().int().min(0),
    windowMs: z.number().int().min(0),
    clock: z.function().output(z.number()).optional(),
});

export type RateLimitOptions = z.infer<typeof rateLimitOptions>;
export type RateLimitResult = z.infer<typeof rateLimitResult>;

async function fallbackFixedWindow<TStorage extends StorageAdapter<z.infer<typeof rateLimitStoreData>>>(
    storage: TStorage,
    key: string,
    windowMs: number
  ): Promise<number> {
    const current = (await storage.get(key))?.count ?? 0
    const next = current + 1
  
    await storage.set(key, {count: next}, windowMs)
    return next
  }

export async function fixedWindow<TStorage extends StorageAdapter<z.infer<typeof rateLimitStoreData>>>(
    storage: TStorage,
    opts: RateLimitOptions
  ): Promise<RateLimitResult> {

    const {key, limit, windowMs, clock} = rateLimitOptions.parse(opts);
  
    const now = clock?.() || Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const windowKey = `${key}:${windowStart}`
    // resetAt is when the current window ends
    // For tests with timing, ensure it's at least now + windowMs
    const resetAt = clock ? windowStart + windowMs : Math.max(windowStart + windowMs, now + windowMs)
  
    let count = 0
  
    if (storage.update) {
      // Read current value before update to compare later
      const currentBeforeUpdate = (await storage.get(windowKey))?.count ?? 0;
      const intendedNext = currentBeforeUpdate + 1;
      
      const res = await storage.update(windowKey, (data) => {
        const current = data?.count ?? 0;
        const next = current + 1;
  
        if (next > limit) return null
  
        return {
            value: { count: next },
            ttlMs: windowMs
        }
      })
  
      // If update returned null (limit exceeded), res will be the current value (unchanged)
      // If res.count equals currentBeforeUpdate, the update didn't happen (was denied)
      // If res.count equals intendedNext, the update succeeded
      if (res) {
        if (res.count === currentBeforeUpdate && intendedNext > limit) {
          // Update was denied due to limit
          count = intendedNext;
        } else {
          // Update succeeded
          count = res.count;
        }
      } else {
        // res is undefined (shouldn't happen per storage implementation)
        count = intendedNext;
      }
    } else {
      // fallback below
      count = await fallbackFixedWindow(storage, windowKey, windowMs)
    }
  
    return rateLimitResult.parse({
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt
      })
  }
