# @bantai-dev/with-storage

> Storage plugin for @bantai-dev/core

Add storage capabilities to your Bantai contexts. This package provides the storage adapter interface and utilities for integrating storage backends with Bantai.

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

## Installation

```bash
npm install @bantai-dev/with-storage @bantai-dev/core zod
# or
pnpm add @bantai-dev/with-storage @bantai-dev/core zod
# or
yarn add @bantai-dev/with-storage @bantai-dev/core zod
```

**Note**: `@bantai-dev/core` and `zod` are peer dependencies and must be installed separately.

## Quick Start

```typescript
import { z } from "zod";
import { defineContext } from "@bantai-dev/core";
import { withStorage, createMemoryStorage } from "@bantai-dev/with-storage";

// 1. Define your base context
const appContext = defineContext(
    z.object({
        userId: z.string(),
    })
);

// 2. Define storage schema
const userDataSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    lastLogin: z.number(),
});

// 3. Create storage adapter
const storage = createMemoryStorage(userDataSchema);

// 4. Extend context with storage
const contextWithStorage = withStorage(appContext, storage);

// 5. Use storage in rules
import { defineRule, allow, deny } from "@bantai-dev/core";

const userRule = defineRule(contextWithStorage, "check-user", async (input, { tools }) => {
    const userData = await tools.storage.get(`user:${input.userId}`);

    if (!userData) {
        return deny({ reason: "User not found" });
    }

    // Update last login
    await tools.storage.set(`user:${input.userId}`, {
        ...userData,
        lastLogin: Date.now(),
    });

    return allow({ reason: "User found and updated" });
});
```

## Storage Adapter Interface

The `StorageAdapter` interface defines the contract for storage implementations:

```typescript
interface StorageAdapter<T> {
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    update?(
        key: string,
        updater: (current: T | undefined) => {
            value: T;
            ttlMs?: number;
        } | null
    ): Promise<T | undefined>;
}
```

### Methods

- **`get(key)`**: Retrieves a value by key. Returns `undefined` if not found.
- **`set(key, value, ttlMs?)`**: Sets a value with optional TTL (time-to-live) in milliseconds.
- **`delete(key)`**: Deletes a value by key.
- **`update(key, updater)`**: Atomically updates a value. The updater function receives the current value and returns the new value with optional TTL, or `null` to delete.

## API Reference

### `withStorage(context, storage)`

Extends a Bantai context with storage capabilities. Adds the storage adapter to the context's tools.

**Parameters:**

- `context`: A Bantai context definition
- `storage`: A storage adapter implementing `StorageAdapter<T>`

**Returns:** Extended context with storage in `context.tools.storage`

### `createMemoryStorage(schema)`

Creates an in-memory storage adapter for development and testing. Data is stored in a `Map` and is not persisted across restarts.

**Parameters:**

- `schema`: Zod schema for validating stored values

**Returns:** `StorageAdapter<z.infer<T>>`

**Features:**

- Schema validation on read/write
- Atomic updates with locking
- TTL support (though memory storage doesn't auto-expire, TTL is stored for compatibility)

**Note**: Not suitable for production use. Use `@bantai-dev/storage-redis` or implement a custom adapter for production.

## Examples

### Basic Storage Usage

```typescript
import { z } from "zod";
import { defineContext, defineRule } from "@bantai-dev/core";
import { withStorage, createMemoryStorage } from "@bantai-dev/with-storage";

const sessionSchema = z.object({
    userId: z.string(),
    expiresAt: z.number(),
});

const storage = createMemoryStorage(sessionSchema);
const context = withStorage(defineContext(z.object({ sessionId: z.string() })), storage);

import { defineRule, allow, deny } from "@bantai-dev/core";

const sessionRule = defineRule(context, "check-session", async (input, { tools }) => {
    const session = await tools.storage.get(input.sessionId);

    if (!session) {
        return deny({ reason: "Session not found" });
    }

    if (session.expiresAt < Date.now()) {
        await tools.storage.delete(input.sessionId);
        return deny({ reason: "Session expired" });
    }

    return allow({ reason: "Session valid" });
});
```

### Atomic Updates

```typescript
const counterSchema = z.object({
    count: z.number().int().min(0),
});

const storage = createMemoryStorage(counterSchema);
const context = withStorage(defineContext(z.object({ counterKey: z.string() })), storage);

const incrementRule = defineRule(context, "increment-counter", async (input, { tools }) => {
    // Atomic increment
    const newValue = await tools.storage.update(input.counterKey, (current) => {
        const count = current?.count || 0;
        return {
            value: { count: count + 1 },
            ttlMs: 3600000, // 1 hour
        };
    });

    return allow({ reason: `Counter incremented to ${newValue?.count}` });
});
```

### TTL (Time-to-Live)

```typescript
const cacheSchema = z.object({
    data: z.string(),
    cachedAt: z.number(),
});

const storage = createMemoryStorage(cacheSchema);
const context = withStorage(defineContext(z.object({ cacheKey: z.string() })), storage);

const cacheRule = defineRule(context, "get-cached-data", async (input, { tools }) => {
    const cached = await tools.storage.get(input.cacheKey);

    if (cached) {
        return allow({ reason: "Cache hit" });
    }

    // Fetch and cache with 5 minute TTL
    const data = await fetchData();
    await tools.storage.set(
        input.cacheKey,
        {
            data,
            cachedAt: Date.now(),
        },
        5 * 60 * 1000 // 5 minutes
    );

    return allow({ reason: "Data fetched and cached" });
});
```

### Custom Storage Adapter

You can implement your own storage adapter for any backend:

```typescript
import { StorageAdapter } from "@bantai-dev/with-storage";
import { z } from "zod";

const userSchema = z.object({
    name: z.string(),
    email: z.string(),
});

// Example: Database storage adapter
class DatabaseStorage implements StorageAdapter<z.infer<typeof userSchema>> {
    async get(key: string) {
        const record = await db.query("SELECT * FROM cache WHERE key = ?", [key]);
        return record ? JSON.parse(record.value) : undefined;
    }

    async set(key: string, value: z.infer<typeof userSchema>, ttlMs?: number) {
        const expiresAt = ttlMs ? Date.now() + ttlMs : null;
        await db.query(
            "INSERT INTO cache (key, value, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, expires_at = ?",
            [key, JSON.stringify(value), expiresAt, JSON.stringify(value), expiresAt]
        );
    }

    async delete(key: string) {
        await db.query("DELETE FROM cache WHERE key = ?", [key]);
    }

    async update(
        key: string,
        updater: (current: z.infer<typeof userSchema> | undefined) => {
            value: z.infer<typeof userSchema>;
            ttlMs?: number;
        } | null
    ) {
        const current = await this.get(key);
        const result = updater(current);

        if (result) {
            await this.set(key, result.value, result.ttlMs);
            return result.value;
        } else {
            await this.delete(key);
            return current;
        }
    }
}

const storage = new DatabaseStorage();
const context = withStorage(defineContext(z.object({ userId: z.string() })), storage);
```

## Integration with Other Packages

### With Rate Limiting

The storage plugin is used by `@bantai-dev/with-rate-limit` to store rate limit counters:

```typescript
import { createMemoryStorage } from "@bantai-dev/with-storage";
import { withRateLimit, rateLimit } from "@bantai-dev/with-rate-limit";

const storage = createMemoryStorage(rateLimit.storageSchema);
const context = withRateLimit(baseContext, { storage });
```

### With Redis

Use `@bantai-dev/storage-redis` for production Redis storage:

```typescript
import { createRedisStorage } from "@bantai-dev/storage-redis";
import { withStorage } from "@bantai-dev/with-storage";

const redisStorage = createRedisStorage({ url: process.env.REDIS_URL }, schema);

const context = withStorage(baseContext, redisStorage);
```

## Type Safety

The package provides full TypeScript type safety:

- **Storage types**: Type-safe storage adapter interface
- **Schema validation**: Zod schemas validate stored values
- **Context extension**: Type-safe context merging with storage tools

## Requirements

- Node.js >= 20.9.0
- TypeScript >= 5.0
- Zod >= 4.3.5
- @bantai-dev/core

## Links

- **Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- **GitHub Repository**: [https://github.com/bosquejun/bantai](https://github.com/bosquejun/bantai)
- **npm Package**: [https://www.npmjs.com/package/@bantai-dev/with-storage](https://www.npmjs.com/package/@bantai-dev/with-storage)

## License

MIT
