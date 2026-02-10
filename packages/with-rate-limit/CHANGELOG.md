# @bantai-dev/with-rate-limiting

## 1.2.0

### Minor Changes

- # Documentation Improvements
    - **Audit Extension (`@bantai-dev/with-audit`)**:
        - Fixed API method name: `createAuditPolicy` → `createAuditEvent`
        - Added comprehensive `AuditTool` and `AuditHandler` API documentation
        - Updated `AuditEvent` type definition with all fields including `auditVersion`, `durationMs`, and `parentId`
        - Fixed imports to use `generateId` from `@bantai-dev/shared`
        - Updated Node.js requirement to `>= 20.9.0`
    - **Rate Limiting Extension (`@bantai-dev/with-rate-limit`)**:
        - Fixed `createMemoryStorage` import (now correctly from `@bantai-dev/with-storage`)
        - Fixed storage schema references: `rateLimitSchema` → `rateLimit.storageSchema`
        - Enhanced `defineRateLimitRule` documentation with `config` option and `currentLimit` parameter
        - Updated all examples with correct imports and API usage
        - Updated Node.js requirement to `>= 20.9.0`
    - **Storage Extension (`@bantai-dev/with-storage`)**:
        - Fixed rate limiting integration example with correct imports and schema references
        - Updated Node.js requirement to `>= 20.9.0`
    - **Redis Storage (`@bantai-dev/storage-redis`)**:
        - Fixed rate limiting integration example with correct schema reference
        - Updated Node.js requirement to `>= 20.9.0`
    - **Core Package (`@bantai-dev/core`)**:
        - Updated Node.js requirement to `>= 20.9.0` (matching root package.json)
    - **Documentation Site**:
        - Updated all MDX documentation files with corrected imports, schema references, and Node.js requirements
        - Improved API documentation consistency across all extension packages

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@1.2.0
    - @bantai-dev/with-storage@1.2.0

## 1.1.0

### Minor Changes

- ### Added
    - **Token-bucket rate limiting strategy**: Added support for token-bucket algorithm, allowing smooth rate limiting with automatic token refill. Perfect for handling bursts and providing consistent rate limiting over time periods.

    ### Changed
    - **Unified rate limit configuration**: All rate limiting strategies (fixed-window, sliding-window, token-bucket) now use consistent property names:
        - `windowMs` → `period` (for fixed-window and sliding-window)
        - `capacity` → `limit` (for token-bucket)
        - `refillPeriod` → `period` (for token-bucket)
        - `tokenCost` → `cost` (now available for all strategies)
    - **Simplified schema**: Rate limit configuration now uses a single unified object with a `type` enum instead of a discriminated union, making the API more consistent and easier to use.
    - **Variable cost support**: The `cost` parameter is now available for all rate limiting strategies, allowing different operations to consume different amounts of tokens/requests.

    ### Migration

    If you're using the old property names, update your configuration:

    **Fixed/Sliding Window:**

    ```typescript
    // Before
    { type: 'fixed-window', limit: 100, windowMs: '1h' }

    // After
    { type: 'fixed-window', limit: 100, period: '1h' }
    ```

    **Token Bucket:**

    ```typescript
    // Before
    { type: 'token-bucket', capacity: 10000, refillPeriod: '1d', tokenCost: 1 }

    // After
    { type: 'token-bucket', limit: 10000, period: '1d', cost: 1 }
    ```

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@1.1.0
    - @bantai-dev/with-storage@1.1.0

## 1.0.0

### Major Changes

- Initial version

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@1.0.0
    - @bantai-dev/with-storage@1.0.0

## 0.6.0

### Minor Changes

- Fix core functions and rate limiting extension

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@0.6.0
    - @bantai-dev/with-storage@0.6.0

## 0.5.0

### Minor Changes

- Rename with-rate-limit extension

### Patch Changes

- Updated dependencies
    - @bantai-dev/with-storage@0.5.0
    - @bantai-dev/core@0.5.0

## 0.4.0

### Minor Changes

- Implemented defineRateLimitRule() wrapper for rate limiting extension;
  Setup web-based docs with fumadocs;

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@0.4.0
    - @bantai-dev/with-storage@0.4.0

## 0.3.0

### Minor Changes

- Support redis storage rate limit HOC

### Patch Changes

- Updated dependencies
    - @bantai-dev/core@0.3.0
    - @bantai-dev/with-storage@0.3.0
