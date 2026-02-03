import { type StorageAdapter } from "@bantai-dev/with-storage"
import { Redis } from "ioredis"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Lua script – atomic read → transform → write
// KEYS[1]   = the target key
// KEYS[2]   = the lock key  (KEYS[1] + ":lock")
// ARGV[1]   = lock token (unique per attempt)
// ARGV[2]   = lock TTL in ms
//
// Returns:
//   { "ok", serialised current value | false }   – lock acquired, here's current
//   { "locked" }                                 – someone else holds the lock
// ---------------------------------------------------------------------------
const ACQUIRE_SCRIPT = `
local locked = redis.call("SET", KEYS[2], ARGV[1], "PX", ARGV[2], "NX")
if not locked then
  return {"locked"}
end
local cur = redis.call("GET", KEYS[1])
return {"ok", cur or false}
`

// ---------------------------------------------------------------------------
// Lua script – conditional write + release
// KEYS[1]   = target key
// KEYS[2]   = lock key
// ARGV[1]   = expected lock token
// ARGV[2]   = new value (or empty string when the updater returned null)
// ARGV[3]   = TTL in ms  (0 = no expiry)
// ARGV[4]   = "1" if we should write, "0" if updater returned null (no-op)
//
// Returns 1 on success, 0 if the lock token didn't match (should not happen
// in normal flow, but guards against a race with lock expiry).
// ---------------------------------------------------------------------------
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[2]) ~= ARGV[1] then
  return 0
end
if ARGV[4] == "1" then
  if ARGV[3] ~= "0" then
    redis.call("SET", KEYS[1], ARGV[2], "PX", ARGV[3])
  else
    redis.call("SET", KEYS[1], ARGV[2])
  end
end
redis.call("DEL", KEYS[2])
return 1
`

// ---------------------------------------------------------------------------

export interface RedisStorageOptions {
  /** Namespace prefix for every key.  Default: "" */
  prefix?: string
  /**
   * Max time (ms) we will wait for a lock before giving up.
   * Default: 5 000
   */
  lockTimeoutMs?: number
  /**
   * TTL (ms) we stamp on the lock key itself so it auto-expires if the
   * holder crashes.  Must be ≥ lockTimeoutMs in production.
   * Default: 10 000
   */
  lockTTLMs?: number
  /**
   * How long (ms) to sleep between retry attempts when waiting for a lock.
   * Default: 50
   */
  lockRetryMs?: number
}

function generateToken(): string {
  // Compact unique token – good enough for distributed lock identity.
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type RedisOptions = {
  client?: Redis,
  url?: string,
}

export function createRedisStorage<T extends z.ZodType>(
  redis: RedisOptions,
  schema: T,
  options: RedisStorageOptions = {}
): StorageAdapter<z.infer<T>> {
  const {
    prefix = "",
    lockTimeoutMs = 5_000,
    lockTTLMs = 10_000,
    lockRetryMs = 50,
  } = options;

  const { client, url } = redis;

  if (!client && !url) {
    throw new Error("Either client or url must be provided")
  }

  let redisClient: Redis;

  if (!client && url) {
    redisClient = new Redis(url);
  } else {
    redisClient = client as Redis;
  }

  // Pre-load Lua scripts so Redis returns a SHA on first call (EVALSHA path).
  // script("LOAD", ...) returns a Promise<string> with the SHA
  let acquireSha: Promise<string> | string = redisClient.script("LOAD", ACQUIRE_SCRIPT) as Promise<string>
  let releaseSha: Promise<string> | string = redisClient.script("LOAD", RELEASE_SCRIPT) as Promise<string>

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const fullKey = (key: string) => `${prefix}${key}`
  const lockKey = (key: string) => `${fullKey(key)}:lock`

  function serialize(value: z.infer<T>): string {
    return JSON.stringify(value)
  }

  function deserialize(raw: string | null): z.infer<T> | undefined {
    if (raw === null) return undefined
    return schema.parse(JSON.parse(raw)) as z.infer<T>
  }

  // -----------------------------------------------------------------------
  // Public interface
  // -----------------------------------------------------------------------
  return {
    // -------------------------------------------------------------------
    async get(key: string): Promise<z.infer<T> | undefined> {
      const raw = await redisClient.get(fullKey(key))
      return deserialize(raw)
    },

    // -------------------------------------------------------------------
    async set(key: string, value: z.infer<T>, ttlMs?: number): Promise<void> {
      const validated = schema.parse(value) as z.infer<T>
      const serialised = serialize(validated)

      if (ttlMs && ttlMs > 0) {
        await redisClient.set(fullKey(key), serialised, "PX", ttlMs)
      } else {
        await redisClient.set(fullKey(key), serialised)
      }
    },

    // -------------------------------------------------------------------
    async delete(key: string): Promise<void> {
      await redisClient.del(fullKey(key))
    },

    // -------------------------------------------------------------------
    // Atomic update – uses a distributed lock (SET NX) + Lua to keep the
    // read-modify-write cycle free of TOCTOU races.
    // -------------------------------------------------------------------
    async update(
      key: string,
      updater: (current: z.infer<T> | undefined) => {
        value: z.infer<T>
        ttlMs?: number
      } | null
    ): Promise<z.infer<T> | undefined> {
      const token = generateToken()
      const deadline = Date.now() + lockTimeoutMs
      const targetKey = fullKey(key)
      const lKey = lockKey(key)

      // -- 1. Spin until we acquire the lock or time out -----------------
      let currentRaw: string | false | null = null

      // Ensure we have the SHA strings (await if still promises)
      const acquireShaStr = typeof acquireSha === "string" ? acquireSha : await acquireSha
      const releaseShaStr = typeof releaseSha === "string" ? releaseSha : await releaseSha
      
      // Cache the SHA strings for future calls
      if (typeof acquireSha !== "string") acquireSha = acquireShaStr
      if (typeof releaseSha !== "string") releaseSha = releaseShaStr

      while (true) {
        const result = (await redisClient.evalsha(
          acquireShaStr,
          2,
          targetKey,
          lKey,
          token,
          String(lockTTLMs)
        )) as [string, string | false]

        if (result[0] === "ok") {
          // result[1] is the current serialised value, or `false` (Lua nil)
          currentRaw = result[1]
          break
        }

        // Lock is held by someone else – retry or bail.
        if (Date.now() >= deadline) {
          throw new Error(
            `[RedisStorage] Failed to acquire lock for key "${key}" ` +
              `within ${lockTimeoutMs} ms`
          )
        }
        await sleep(lockRetryMs)
      }

      // -- 2. Run the updater in application-land -------------------------
      const current = deserialize(currentRaw === false ? null : currentRaw)
      const res = updater(current)

      // -- 3. Atomically write (or no-op) and release the lock ------------
      const shouldWrite = res !== null
      const newValue = shouldWrite ? serialize(schema.parse(res.value)) : ""
      const ttl = shouldWrite && res.ttlMs ? String(res.ttlMs) : "0"

      const success = await redisClient.evalsha(
        releaseShaStr,
        2,
        targetKey,
        lKey,
        token,
        newValue,
        ttl,
        shouldWrite ? "1" : "0"
      )

      // If the lock expired between acquire and release the write was lost;
      // surface that so callers can retry at a higher level.
      if (success === 0) {
        throw new Error(
          `[RedisStorage] Lock expired before write could complete for key "${key}". ` +
            `Consider increasing lockTTLMs (currently ${lockTTLMs} ms).`
        )
      }

      return shouldWrite ? (res.value as z.infer<T>) : current
    },
  }
}