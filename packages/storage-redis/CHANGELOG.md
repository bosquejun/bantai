# @bantai-dev/storage-redis

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
  - @bantai-dev/with-storage@1.1.0

## 1.0.0

### Major Changes

- Initial version

### Patch Changes

- Updated dependencies
  - @bantai-dev/with-storage@1.0.0

## 0.6.0

### Minor Changes

- Fix core functions and rate limiting extension

### Patch Changes

- Updated dependencies
  - @bantai-dev/with-storage@0.6.0

## 0.5.0

### Minor Changes

- Rename with-rate-limit extension

### Patch Changes

- Updated dependencies
  - @bantai-dev/with-storage@0.5.0

## 0.4.0

### Minor Changes

- Implemented defineRateLimitRule() wrapper for rate limiting extension;
  Setup web-based docs with fumadocs;

### Patch Changes

- Updated dependencies
  - @bantai-dev/with-storage@0.4.0

## 0.3.0

### Minor Changes

- Support redis storage rate limit HOC

### Patch Changes

- Updated dependencies
  - @bantai-dev/with-storage@0.3.0
