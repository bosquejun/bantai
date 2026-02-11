# @bantai-dev/with-audit

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
    - @bantai-dev/shared@1.2.0
