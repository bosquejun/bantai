# Bantai

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@bantai-dev/core)](https://www.npmjs.com/package/@bantai-dev/core)

> TypeScript-first policy evaluation library for rule-based validation and decision-making

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
import { z } from 'zod';
import { defineContext, defineRule, definePolicy, evaluatePolicy, allow, deny } from '@bantai-dev/core';

// 1. Define context schema
const ageContext = defineContext(
  z.object({
    age: z.number().min(0).max(150),
  })
);

// 2. Define a rule
const ageVerificationRule = defineRule(ageContext, 'age-verification', async (input) => {
  if (input.age >= 18) {
    return allow({ reason: 'User is of legal age' });
  }
  return deny({ reason: 'User must be 18 or older' });
});

// 3. Define a policy
const agePolicy = definePolicy(ageContext, 'age-verification-policy', [ageVerificationRule], {
  defaultStrategy: 'preemptive',
});

// 4. Evaluate policy
const result = await evaluatePolicy(agePolicy, { age: 25 });

console.log(result.decision); // 'allow' or 'deny'
console.log(result.violatedRules); // Array of violations
```

## Packages

This monorepo contains the following packages:

- **[@bantai-dev/core](./packages/core/)** - Core policy evaluation library
- **[@bantai-dev/with-rate-limit](./packages/with-rate-limit/)** - Rate limiting plugin for Bantai
- **[@bantai-dev/with-storage](./packages/with-storage/)** - Storage plugin for Bantai
- **[@bantai-dev/storage-redis](./packages/storage-redis/)** - Redis storage adapter for Bantai

## Documentation

For detailed documentation, API reference, and examples, see the [core package README](./packages/core/README.md).

## Project Structure

```text
bantai-dev/
├── packages/
│   ├── core/              # Main policy evaluation library
│   ├── with-rate-limit/   # Rate limiting plugin
│   ├── with-storage/      # Storage plugin
│   ├── storage-redis/     # Redis storage adapter
├── apps/
│   └── docs/              # Documentation site
└── turbo.json            # Turborepo configuration
```

## Development

This project uses [Turborepo](https://turborepo.org/) for monorepo management and [pnpm](https://pnpm.io/) as the package manager.

### Prerequisites

- Node.js >= 18
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

- [GitHub Repository](https://github.com/bosquejun/bantai)
- [npm Package](https://www.npmjs.com/package/@bantai-dev/core)
- [Report a Bug](https://github.com/bosquejun/bantai/issues)
- [Request a Feature](https://github.com/bosquejun/bantai/issues)
