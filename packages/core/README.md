# Bantai

> TypeScript-first policy evaluation library for rule-based validation and decision-making

Bantai is a powerful, type-safe policy evaluation library that enables you to build complex validation and decision-making logic using composable rules and policies. Built with TypeScript and Zod, it provides end-to-end type safety while remaining flexible enough to handle diverse use cases.

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

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
import { 
  allow, 
  defineContext, 
  defineRule,
  definePolicy, 
  deny, 
  evaluatePolicy 
} from '@bantai-dev/core';

// 1. Define context schema
const ageContext = defineContext(
  z.object({
    age: z.number().min(0).max(150),
  })
);

// 2. Define a rule
const ageVerificationRule = defineRule(
  ageContext,
  'age-verification',
  async (input) => {
    if (input.age >= 18) {
      return allow({ reason: 'User is of legal age' });
    }
    return deny({ reason: 'User must be 18 or older' });
  }
);

// 3. Define a policy
const agePolicy = definePolicy(
  ageContext,
  'age-verification-policy',
  [ageVerificationRule],
  {
    defaultStrategy: 'preemptive',
  }
);

// 4. Evaluate policy
const result = await evaluatePolicy(agePolicy, { age: 25 });

console.log(result.decision); // 'allow' or 'deny'
console.log(result.isAllowed); // true or false
console.log(result.violatedRules); // Array of violations
console.log(result.evaluatedRules); // Array of all evaluated rules
```

## Core Concepts

### Context

A context defines the schema of data available when evaluating rules. It uses Zod for validation and can include default values.

```typescript
const appContext = defineContext(
  z.object({
    userId: z.string(),
    role: z.enum(['admin', 'user']),
    timestamp: z.number(),
  }),
  {
    timestamp: Date.now(), // Default value
  }
);
```

### Rules

Rules are the building blocks that make decisions. They evaluate input and return `allow()` or `deny()`.

```typescript
const adminRule = defineRule(
  appContext,
  'check-admin',
  async (input) => {
    if (input.role === 'admin') {
      return allow({ reason: 'User is admin' });
    }
    return deny({ reason: 'Admin access required' });
  },
  {
    onAllow: async (result, input, { tools }) => {
      console.log(`Admin access granted to ${input.userId}`);
    },
    onDeny: async (result, input, { tools }) => {
      console.log(`Admin access denied to ${input.userId}`);
    },
  }
);
```

Rules can be synchronous or asynchronous:

```typescript
const asyncRule = defineRule(
  appContext,
  'check-database',
  async (input, { tools }) => {
    const user = await db.getUser(input.userId);
    if (user?.active) {
      return allow({ reason: 'User is active' });
    }
    return deny({ reason: 'User is not active' });
  }
);
```

### Policies

Policies combine multiple rules and define an evaluation strategy.

**Preemptive Strategy** (fail-fast): Stops at first violation. Best for security checks and fast rejection.

```typescript
const securityPolicy = definePolicy(
  appContext,
  'security-policy',
  [authRule, permissionRule],
  {
    defaultStrategy: 'preemptive',
  }
);
```

**Exhaustive Strategy**: Collects all violations. Best for form validation and comprehensive feedback.

```typescript
const validationPolicy = definePolicy(
  appContext,
  'validation-policy',
  [emailRule, passwordRule, termsRule],
  {
    defaultStrategy: 'exhaustive',
  }
);
```

## API Reference

### `defineContext<T>(schema, defaultValues?, tools?)`

Creates a context definition with a Zod schema.

**Parameters:**
- `schema`: Zod object schema
- `defaultValues?`: Optional default values for context fields
- `tools?`: Optional tools object to make available to rules

**Returns:** `ContextDefinition`

### `defineRule<TContext, TName>(context, name, evaluate, hooks?)`

Defines a rule within a context.

**Parameters:**
- `context`: Context definition
- `name`: Rule identifier
- `evaluate`: Async function that takes input and context, returns `RuleResult`
- `hooks?`: Optional hooks object:
  - `onAllow?`: Function called when rule allows
  - `onDeny?`: Function called when rule denies

**Returns:** `RuleDefinition`

**Example:**
```typescript
const rule = defineRule(
  context,
  'my-rule',
  async (input, { tools }) => {
    // Evaluation logic
    return allow({ reason: 'Success' });
  },
  {
    onAllow: async (result, input, { tools }) => {
      // Side effect on allow
    },
  }
);
```

### `definePolicy<TContext, TName>(context, name, rules, options?)`

Defines a policy that combines multiple rules.

**Parameters:**
- `context`: Context definition (must match all rules)
- `name`: Policy identifier
- `rules`: Array of rule definitions
- `options?`: Optional configuration:
  - `defaultStrategy?`: `'preemptive'` or `'exhaustive'` (default: `'preemptive'`)

**Returns:** `PolicyDefinition`

### `evaluatePolicy(policy, input, options?)`

Evaluates a policy against input data.

**Parameters:**
- `policy`: Policy definition
- `input`: Context data to evaluate (must match policy's context schema)
- `options?`: Optional evaluation options:
  - `strategy?`: Override default strategy for this evaluation

**Returns:** `Promise<PolicyResult>`

**PolicyResult:**
```typescript
{
  decision: 'allow' | 'deny';
  isAllowed: boolean;
  reason: 'policy_violated' | 'policy_enforced';
  violatedRules: ViolatedRule[];
  evaluatedRules: EvaluatedRule[];
  strategy: 'preemptive' | 'exhaustive';
}
```

### `allow(reason?)` / `deny(reason?)`

Helper functions to create rule results.

**Parameters:**
- `reason?`: Optional object with `reason` property describing the result

**Returns:** `RuleResult`

**Example:**
```typescript
return allow({ reason: 'User is valid' });
return deny({ reason: 'User is invalid' });
```

## Type Safety

Bantai provides full TypeScript type safety:

- **Context Types**: Inferred from Zod schemas
- **Rule Types**: Type-safe rule evaluation functions
- **Policy IDs**: Only valid policy IDs are accepted
- **Rule IDs**: Only valid rule IDs can be referenced in policies
- **Merged Contexts**: Automatic type inference for merged contexts with presets

```typescript
// TypeScript will enforce that all required context fields are provided
const result = await evaluatePolicy(agePolicy, {
  age: 25, // ✅ TypeScript ensures this field exists
  // invalidField: 'test', // ❌ TypeScript error
});

// TypeScript ensures rules belong to the same context
const policy = definePolicy(
  ageContext,
  'my-policy',
  [ageVerificationRule], // ✅ Rules must use the same context
  {
    defaultStrategy: 'preemptive',
  }
);
```

## Examples

Comprehensive examples are available in the [examples directory](./examples/):

- **[Basic Usage](./examples/00-basic-usage.ts)** - Simple age verification
- **[API Rate Limiting](./examples/01-api-rate-limiting.ts)** - Request rate limiting
- **[User Authentication](./examples/02-user-authentication.ts)** - Multi-rule authentication
- **[Content Moderation](./examples/03-content-moderation.ts)** - Content validation with hooks
- **[Payment Processing](./examples/04-payment-processing.ts)** - Async payment validation
- **[Banking Transactions](./examples/05-banking-transactions.ts)** - Compliance-focused validation
- **[Crypto Trading](./examples/06-crypto-trading.ts)** - KYC tier-based limits
- **[AI Quota Management](./examples/07-ai-quota-management.ts)** - Token limits and tiers
- **[Multi-tenant SaaS](./examples/08-multi-tenant-saas.ts)** - Tenant isolation with presets
- **[E-commerce Orders](./examples/09-ecommerce-order-processing.ts)** - Complete order validation

See the [examples README](./examples/README.md) for detailed descriptions.

## Use Cases

Bantai is designed for policy-based decision-making across various domains:

- **Business Rule Enforcement**: Validate business logic across your application
- **Compliance & Validation**: Ensure regulatory compliance and data validation
- **Quota Management**: Track and enforce usage limits (API quotas, AI tokens, etc.)
- **Payment Processing**: Validate transactions, fraud checks, and account status
- **E-commerce**: Order validation, inventory checks, shipping restrictions
- **Multi-tenant SaaS**: Tenant isolation, feature access control
- **Content Moderation**: Spam detection, profanity filtering, content policies
- **Financial Services**: Banking transactions, crypto trading, KYC/AML checks

## Requirements

- Node.js >= 18
- TypeScript >= 5.0
- Zod >= 4.3.5

## Links

- **Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- **GitHub Repository**: [https://github.com/bosquejun/bantai](https://github.com/bosquejun/bantai)
- **npm Package**: [https://www.npmjs.com/package/@bantai-dev/core](https://www.npmjs.com/package/@bantai-dev/core)

## License

MIT
