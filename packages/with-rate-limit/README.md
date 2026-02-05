# @bantai-dev/with-rate-limit

> Rate limiting plugin for @bantai-dev/core

Add rate limiting capabilities to your Bantai contexts with support for multiple rate limiting strategies including fixed-window, sliding-window, and token-bucket algorithms.

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

## Installation

```bash
npm install @bantai-dev/with-rate-limit @bantai-dev/core @bantai-dev/with-storage zod
# or
pnpm add @bantai-dev/with-rate-limit @bantai-dev/core @bantai-dev/with-storage zod
# or
yarn add @bantai-dev/with-rate-limit @bantai-dev/core @bantai-dev/with-storage zod
```

**Note**: `@bantai-dev/core`, `@bantai-dev/with-storage`, and `zod` are peer dependencies and must be installed separately.

## Quick Start

```typescript
import { z } from 'zod';
import { defineContext, definePolicy, evaluatePolicy, allow } from '@bantai-dev/core';
import {
  withRateLimit,
  defineRateLimitRule,
  createMemoryStorage,
  rateLimitSchema,
} from '@bantai-dev/with-rate-limit';

// 1. Define your base context
const apiContext = defineContext(
  z.object({
    userId: z.string(),
    endpoint: z.string(),
  })
);

// 2. Extend context with rate limiting
// generateKey will automatically create keys from your input
const rateLimitedContext = withRateLimit(apiContext, {
  storage: createMemoryStorage(rateLimitSchema),
  generateKey: (input) => `api:${input.userId}:${input.endpoint}`,
  defaultValues: {
    rateLimit: {
      type: 'fixed-window',
      limit: 100,
      windowMs: '1h',
    },
  },
});

// 3. Define a rate limiting rule using defineRateLimitRule
// This automatically handles rate limit checking and incrementing
const rateLimitRule = defineRateLimitRule(
  rateLimitedContext,
  'check-rate-limit',
  async (input) => {
    // Your business logic here
    // Rate limit is already checked and will be incremented on allow
    return allow({ reason: 'Request allowed' });
  },
  {
    config: {
      limit: 100,
      windowMs: '1h',
      type: 'fixed-window',
    },
  }
);

// 4. Define policy
const apiPolicy = definePolicy(
  rateLimitedContext,
  'api-rate-limit-policy',
  [rateLimitRule],
  {
    defaultStrategy: 'preemptive',
  }
);

// 5. Evaluate policy
// The generateKey function will create the key automatically
const result = await evaluatePolicy(apiPolicy, {
  userId: 'user123',
  endpoint: '/api/search',
});
```

## Rate Limiting Strategies

### Fixed Window

Fixed window rate limiting divides time into discrete windows. All requests within a window count toward the limit, and the counter resets at the start of each new window.

**Use cases**: Simple rate limiting, API quotas, basic throttling

```typescript
{
  type: 'fixed-window',
  key: 'user:123',
  limit: 100,
  windowMs: '1h', // Supports ms format: '1h', '30m', '5s', etc.
}
```

### Sliding Window

Sliding window rate limiting tracks individual request timestamps. Only requests within the current window count toward the limit, providing smoother rate limiting.

**Use cases**: More accurate rate limiting, preventing burst traffic

```typescript
{
  type: 'sliding-window',
  key: 'user:123',
  limit: 100,
  windowMs: '1h',
}
```

### Token Bucket

Token bucket rate limiting uses a bucket that refills at a constant rate. Requests consume tokens, and requests are allowed when tokens are available.

**Use cases**: Burst handling, smooth rate limiting with refill

```typescript
{
  type: 'token-bucket',
  key: 'user:123',
  capacity: 100,
  refillRate: '10/s', // 10 tokens per second
}
```

## API Reference

### `withRateLimit(context, options?)`

Extends a Bantai context with rate limiting capabilities. Adds `rateLimit` schema fields and tools to the context.

**Parameters:**
- `context`: A Bantai context definition
- `options`:
  - `storage?`: A storage adapter implementing `RateLimitStorage` interface
  - `defaultValues?`: Default values for rate limit configuration
  - `generateKey?`: Optional function to generate rate limit keys dynamically from context input. If provided, this function will be used when `rateLimit.key` is not specified in the input.

**Returns:** Extended context with rate limiting capabilities

**Example with generateKey:**

```typescript
const rateLimitedContext = withRateLimit(apiContext, {
  storage: createMemoryStorage(rateLimitSchema),
  generateKey: (input) => `api:${input.userId}:${input.endpoint}`,
  defaultValues: {
    rateLimit: {
      type: 'fixed-window',
      limit: 100,
      windowMs: '1h',
    },
  },
});
```

When using `defineRateLimitRule`, if `rateLimit.key` is not provided in the input, the `generateKey` function will be used automatically.

### `rateLimit.checkRateLimit(storage, config, clock?)`

Checks if a rate limit would be exceeded without incrementing the counter. Use this in your rule's `evaluate` function.

**Parameters:**
- `storage`: Storage adapter implementing `RateLimitStorage`
- `config`: Rate limit configuration object
- `clock?`: Optional clock function for testing (defaults to `Date.now`)

**Returns:** `Promise<RateLimitCheckResult>`

**RateLimitCheckResult:**
```typescript
{
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in milliseconds
  reason?: string;
}
```

### `rateLimit.incrementRateLimit(storage, config, clock?)`

Increments the rate limit counter. Use this in your rule's `onAllow` hook.

**Parameters:**
- `storage`: Storage adapter implementing `RateLimitStorage`
- `config`: Rate limit configuration object
- `clock?`: Optional clock function for testing (defaults to `Date.now`)

**Returns:** `Promise<void>`

### `createMemoryStorage(schema)`

Creates an in-memory storage adapter for development and testing. Not suitable for production use.

**Parameters:**
- `schema`: Zod schema for validating storage data

**Returns:** `StorageAdapter<T>`

## Storage Integration

The rate limiting plugin requires a storage adapter. You can use:

- **Memory storage** (development/testing): `createMemoryStorage` from this package
- **Redis storage** (production): `createRedisStorage` from `@bantai-dev/storage-redis`
- **Custom storage**: Implement the `StorageAdapter` interface from `@bantai-dev/with-storage`

### Using Redis Storage

```typescript
import { createRedisStorage } from '@bantai-dev/storage-redis';
import { rateLimitSchema } from '@bantai-dev/with-rate-limit';

const redisStorage = createRedisStorage(
  { url: process.env.REDIS_URL },
  rateLimitSchema
);

const rateLimitedContext = withRateLimit(apiContext, {
  storage: redisStorage,
});
```

## Examples

### Per-User Rate Limiting

```typescript
import { defineRule, allow, deny } from '@bantai-dev/core';

const userRateLimitRule = defineRule(
  rateLimitedContext,
  'user-rate-limit',
  async (input, { tools }) => {
    const result = await tools.rateLimit.checkRateLimit(
      tools.storage,
      {
        key: `user:${input.userId}`,
        type: 'fixed-window',
        limit: 1000,
        windowMs: '24h',
      }
    );

    return result.allowed ? allow({ reason: 'Rate limit OK' }) : deny({ reason: result.reason });
  },
  {
    onAllow: async (result, input, { tools }) => {
      await tools.rateLimit.incrementRateLimit(
        tools.storage,
        {
          key: `user:${input.userId}`,
          type: 'fixed-window',
          limit: 1000,
          windowMs: '24h',
        }
      );
    },
  }
);
```

### Endpoint-Specific Rate Limits

```typescript
import { defineRule, allow, deny } from '@bantai-dev/core';

const endpointLimits = {
  '/api/auth/login': { limit: 5, windowMs: '15m' },
  '/api/payment': { limit: 10, windowMs: '1m' },
  '/api/search': { limit: 100, windowMs: '1m' },
};

const endpointRateLimitRule = defineRule(
  rateLimitedContext,
  'endpoint-rate-limit',
  async (input, { tools }) => {
    const config = endpointLimits[input.endpoint] || { limit: 50, windowMs: '1h' };
    
    const result = await tools.rateLimit.checkRateLimit(
      tools.storage,
      {
        key: `endpoint:${input.endpoint}:${input.userId}`,
        type: 'sliding-window',
        limit: config.limit,
        windowMs: config.windowMs,
      }
    );

    return result.allowed ? allow({ reason: 'Rate limit OK' }) : deny({ reason: result.reason });
  },
  {
    onAllow: async (result, input, { tools }) => {
      const config = endpointLimits[input.endpoint] || { limit: 50, windowMs: '1h' };
      
      await tools.rateLimit.incrementRateLimit(
        tools.storage,
        {
          key: `endpoint:${input.endpoint}:${input.userId}`,
          type: 'sliding-window',
          limit: config.limit,
          windowMs: config.windowMs,
        }
      );
    },
  }
);
```

### Tier-Based Rate Limiting

```typescript
import { defineRule, allow, deny } from '@bantai-dev/core';

const tierLimits = {
  free: { limit: 100, windowMs: '1h' },
  premium: { limit: 1000, windowMs: '1h' },
  enterprise: { limit: 10000, windowMs: '1h' },
};

const tierRateLimitRule = defineRule(
  rateLimitedContext,
  'tier-rate-limit',
  async (input, { tools }) => {
    const config = tierLimits[input.userTier];
    
    const result = await tools.rateLimit.checkRateLimit(
      tools.storage,
      {
        key: `tier:${input.userTier}:${input.userId}`,
        type: 'token-bucket',
        capacity: config.limit,
        refillRate: `${config.limit}/h`,
      }
    );

    return result.allowed ? allow({ reason: 'Rate limit OK' }) : deny({ reason: result.reason });
  },
  {
    onAllow: async (result, input, { tools }) => {
      const config = tierLimits[input.userTier];
      
      await tools.rateLimit.incrementRateLimit(
        tools.storage,
        {
          key: `tier:${input.userTier}:${input.userId}`,
          type: 'token-bucket',
          capacity: config.limit,
          refillRate: `${config.limit}/h`,
        }
      );
    },
  }
);
```

## Type Safety

The package provides full TypeScript type safety:

- **Context extension**: Type-safe context merging with rate limit fields
- **Config validation**: Zod schemas validate rate limit configurations
- **Storage types**: Type-safe storage adapter interface
- **Result types**: Typed rate limit check results

## Requirements

- Node.js >= 18
- TypeScript >= 5.0
- Zod >= 4.3.5
- @bantai-dev/core
- @bantai-dev/with-storage

## Links

- **Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- **GitHub Repository**: [https://github.com/bosquejun/bantai](https://github.com/bosquejun/bantai)
- **npm Package**: [https://www.npmjs.com/package/@bantai-dev/with-rate-limit](https://www.npmjs.com/package/@bantai-dev/with-rate-limit)

## License

MIT

