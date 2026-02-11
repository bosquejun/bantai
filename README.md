# Bantai

<div align="center">
  <img src="./logo.webp" alt="Bantai Logo" width="200" height="200">
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@bantai-dev/core)](https://www.npmjs.com/package/@bantai-dev/core)

> TypeScript-first policy evaluation library for rule-based validation and decision-making

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

Bantai is a powerful, type-safe policy evaluation library that enables you to build complex validation and decision-making logic using composable rules and policies. Built with TypeScript and Zod, it provides end-to-end type safety while remaining flexible enough to handle diverse use cases.

## Installation

```bash
npm install @bantai-dev/core zod
# or
pnpm add @bantai-dev/core zod
# or
yarn add @bantai-dev/core zod
```

**Note**: `zod` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { z } from "zod";
import {
    defineContext,
    defineRule,
    definePolicy,
    evaluatePolicy,
    allow,
    deny,
} from "@bantai-dev/core";

// 1. Define context schema
const ageContext = defineContext(
    z.object({
        age: z.number().min(0).max(150),
    })
);

// 2. Define a rule
const ageVerificationRule = defineRule(ageContext, "age-verification", async (input) => {
    if (input.age >= 18) {
        return allow({ reason: "User is of legal age" });
    }
    return deny({ reason: "User must be 18 or older" });
});

// 3. Define a policy
const agePolicy = definePolicy(ageContext, "age-verification-policy", [ageVerificationRule], {
    defaultStrategy: "preemptive",
});

// 4. Evaluate policy
const result = await evaluatePolicy(agePolicy, { age: 25 });

console.log(result.decision); // 'allow' or 'deny'
console.log(result.isAllowed); // true or false
console.log(result.violatedRules); // Array of violations
console.log(result.evaluatedRules); // Array of all evaluated rules
```

## Packages

This monorepo contains the following packages:

- **[@bantai-dev/core](./packages/core/)** - Core policy evaluation library
- **[@bantai-dev/with-rate-limit](./packages/with-rate-limit/)** - Rate limiting extension for Bantai with support for fixed-window, sliding-window, and token-bucket algorithms
- **[@bantai-dev/with-audit](./packages/with-audit/)** - Audit logging extension for Bantai with event tracking and sinks
- **[@bantai-dev/with-storage](./packages/with-storage/)** - Storage plugin for Bantai with adapter interface
- **[@bantai-dev/storage-redis](./packages/storage-redis/)** - Redis storage adapter for Bantai with distributed locking and TTL support

## Extensions

Bantai is designed to be extensible. The following extensions are available:

- **[@bantai-dev/with-rate-limit](./packages/with-rate-limit/)** - Add rate limiting with fixed-window, sliding-window, or token-bucket strategies
- **[@bantai-dev/with-audit](./packages/with-audit/)** - Add audit logging and event tracking for policy evaluations
- **[@bantai-dev/with-storage](./packages/with-storage/)** - Add storage capabilities with a flexible adapter interface
- **[@bantai-dev/storage-redis](./packages/storage-redis/)** - Production-ready Redis storage adapter with distributed locking

Extensions can be composed together:

```typescript
import { z } from "zod";
import { defineContext } from "@bantai-dev/core";
import { withRateLimit, rateLimitSchema } from "@bantai-dev/with-rate-limit";
import { withAudit } from "@bantai-dev/with-audit";
import { createRedisStorage } from "@bantai-dev/storage-redis";

const baseContext = defineContext(z.object({ userId: z.string() }));

// Compose multiple extensions
const context = withAudit(
    withRateLimit(baseContext, {
        storage: createRedisStorage({ url: process.env.REDIS_URL }, rateLimitSchema),
    }),
    {
        sinks: [(event) => console.log("Audit:", event)],
    }
);
```

## Documentation

For detailed documentation, API reference, and examples, visit:

- **Official Documentation**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- **Core Package README**: [./packages/core/README.md](./packages/core/README.md)
- **Rate Limiting Extension**: [./packages/with-rate-limit/README.md](./packages/with-rate-limit/README.md)
- **Audit Extension**: [./packages/with-audit/README.md](./packages/with-audit/README.md)
- **Storage Extension**: [./packages/with-storage/README.md](./packages/with-storage/README.md)
- **Redis Storage**: [./packages/storage-redis/README.md](./packages/storage-redis/README.md)

## Project Structure

```text
bantai-dev/
├── packages/
│   ├── core/              # Main policy evaluation library
│   ├── with-rate-limit/   # Rate limiting extension
│   ├── with-audit/        # Audit logging extension
│   ├── with-storage/      # Storage plugin
│   ├── storage-redis/     # Redis storage adapter
│   ├── shared/            # Shared utilities (internal)
│   ├── eslint-config/     # ESLint configurations
│   └── typescript-config/ # TypeScript configurations
├── apps/
│   └── docs/              # Documentation site
├── examples/
│   └── nextjs-with-rate-limit-redis/ # Example Next.js app
└── turbo.json            # Turborepo configuration
```

## Development

This project uses [Turborepo](https://turborepo.org/) for monorepo management and [pnpm](https://pnpm.io/) as the package manager.

### Prerequisites

- Node.js >= 20.9.0
- pnpm >= 9.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
cd packages/core && pnpm test

# Run type checking
pnpm check-types

# Format code
pnpm format
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- How to set up your development environment
- Our code style guidelines
- How to submit pull requests
- Our commit message conventions

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Links

- **Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- [GitHub Repository](https://github.com/bosquejun/bantai)
- [npm Package](https://www.npmjs.com/package/@bantai-dev/core)
- [Report a Bug](https://github.com/bosquejun/bantai/issues)
- [Request a Feature](https://github.com/bosquejun/bantai/issues)
