# Bantai

> TypeScript-first policy evaluation library for rule-based validation and decision-making

Bantai is a powerful, type-safe policy evaluation library that enables you to build complex validation and decision-making logic using composable rules, policies, and presets. Built with TypeScript and Zod, it provides end-to-end type safety while remaining flexible enough to handle diverse use cases.

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
  createBantai, 
  defineConfig, 
  defineContext, 
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
const ageVerificationRule = ageContext.defineRule('age-verification', {
  kind: 'function',
  evaluate: (input) => {
    if (input.age >= 18) {
      return allow('User is of legal age');
    }
    return deny('User must be 18 or older');
  },
});

// 3. Define configuration
const config = defineConfig({
  context: ageContext,
  rules: [ageVerificationRule],
  policies: [
    definePolicy({
      id: 'age-verification-policy',
      rules: ['rule:age-verification'],
      strategy: 'preemptive',
    }),
  ],
});

// 4. Create Bantai instance
const bantai = createBantai(config);

// 5. Evaluate policy
const result = await evaluatePolicy(bantai, 'age-verification-policy', {
  age: 25,
});

console.log(result.decision); // 'allow' or 'deny'
console.log(result.violatedRules); // Array of violations
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
const adminRule = appContext.defineRule('check-admin', {
  kind: 'function',
  evaluate: (input) => {
    if (input.role === 'admin') {
      return allow('User is admin');
    }
    return deny('Admin access required');
  },
  hooks: {
    onAllow: (input) => console.log(`Admin access granted to ${input.userId}`),
    onDeny: (input) => console.log(`Admin access denied to ${input.userId}`),
  },
});
```

Rules can be synchronous or asynchronous:

```typescript
const asyncRule = appContext.defineRule('check-database', {
  kind: 'function',
  evaluate: async (input) => {
    const user = await db.getUser(input.userId);
    if (user?.active) {
      return allow('User is active');
    }
    return deny('User is not active');
  },
});
```

### Policies

Policies combine multiple rules and define an evaluation strategy.

**Preemptive Strategy** (fail-fast): Stops at first violation. Best for security checks and fast rejection.

```typescript
const securityPolicy = definePolicy({
  id: 'security-policy',
  rules: ['rule:check-auth', 'rule:check-permissions'],
  strategy: 'preemptive',
});
```

**Exhaustive Strategy**: Collects all violations. Best for form validation and comprehensive feedback.

```typescript
const validationPolicy = definePolicy({
  id: 'validation-policy',
  rules: ['rule:check-email', 'rule:check-password', 'rule:check-terms'],
  strategy: 'exhaustive',
});
```

### Presets

Presets are reusable rule sets that can be shared across policies. They automatically namespace rules to avoid conflicts.

```typescript
const inventoryContext = defineContext(
  z.object({
    items: z.array(z.object({
      itemId: z.string(),
      quantity: z.number().positive(),
    })),
  })
);

const inventoryPreset = definePreset('inventory', {
  context: inventoryContext,
  rules: [
    inventoryContext.defineRule('check-stock', {
      kind: 'function',
      evaluate: (input) => {
        // Check stock availability
        return allow();
      },
    }),
    inventoryContext.defineRule('reserve-items', {
      kind: 'function',
      evaluate: (input) => {
        // Reserve items
        return allow();
      },
    }),
  ],
});

// Use preset rules in policies
const orderPolicy = definePolicy({
  id: 'order-policy',
  rules: [
    'rule:preset:inventory:check-stock',
    'rule:preset:inventory:reserve-items',
  ],
  strategy: 'exhaustive',
});
```

### Context Merging

When using presets, contexts are automatically merged. The main context and all preset contexts are intersected to create a merged schema.

```typescript
const mainContext = defineContext(
  z.object({
    userId: z.string(),
    orderId: z.string(),
  }),
  undefined,
  [inventoryPreset, paymentPreset] // Include presets
);

// Rules in mainContext can access both main and preset context fields
const combinedRule = mainContext.defineRule('combined-check', {
  kind: 'function',
  evaluate: (input) => {
    // input has: userId, orderId, items (from inventory), amount (from payment)
    return allow();
  },
});
```

## API Reference

### `defineContext<T>(schema, defaultContext?, presets?)`

Creates a context definition with a Zod schema.

**Parameters:**
- `schema`: Zod object schema
- `defaultContext?`: Optional default values
- `presets?`: Optional array of preset definitions

**Returns:** `ContextDefinition` with a `defineRule` method

### `defineRule<T>(id, params)`

Defines a rule within a context.

**Parameters:**
- `id`: Rule identifier (will be prefixed with `rule:`)
- `params`:
  - `kind`: `'function'`
  - `evaluate`: Function that takes context and returns `RuleResult`
  - `hooks?`: Optional hooks (`onAllow`, `onDeny`)

**Returns:** `RuleDefinition`

### `definePreset<T>(name, params)`

Creates a reusable preset with its own context and rules.

**Parameters:**
- `name`: Preset name (will namespace rules as `rule:preset:{name}:{ruleId}`)
- `params`:
  - `context`: Context definition
  - `rules`: Array of rules

**Returns:** `PresetDefinition`

### `definePolicy(params)`

Defines a policy that combines multiple rules.

**Parameters:**
- `id`: Policy identifier
- `rules`: Array of rule IDs (can include preset rules)
- `strategy`: `'preemptive'` or `'exhaustive'`

**Returns:** `PolicyDefinition`

### `defineConfig(params)`

Creates a configuration that brings together context, rules, and policies.

**Parameters:**
- `context`: Context definition
- `rules`: Array of rule definitions
- `policies?`: Optional array of policy definitions

**Returns:** `ConfigDefinition`

### `createBantai(config)`

Creates an immutable Bantai instance from a configuration.

**Parameters:**
- `config`: Configuration definition

**Returns:** `BantaiInstance`

### `evaluatePolicy(bantai, policyName, currentContext)`

Evaluates a policy against a current context.

**Parameters:**
- `bantai`: Bantai instance
- `policyName`: Policy ID (type-safe)
- `currentContext`: Context data to evaluate

**Returns:** `Promise<PolicyResult>`

**PolicyResult:**
```typescript
{
  decision: 'allow' | 'deny';
  reason: 'policy_violated' | 'policy_enforced' | 'policy_not_found' | 'rule_not_found' | null;
  violatedRules: ViolatedRule[];
  strategy: 'preemptive' | 'exhaustive';
}
```

### `allow(message?)` / `deny(message?)`

Helper functions to create rule results.

**Parameters:**
- `message?`: Optional message describing the result

**Returns:** `RuleResult`

## Type Safety

Bantai provides full TypeScript type safety:

- **Context Types**: Inferred from Zod schemas
- **Rule Types**: Type-safe rule evaluation functions
- **Policy IDs**: Only valid policy IDs are accepted
- **Rule IDs**: Only valid rule IDs can be referenced in policies
- **Merged Contexts**: Automatic type inference for merged contexts with presets

```typescript
// TypeScript will enforce that only valid policy IDs are used
const result = await evaluatePolicy(bantai, 'age-verification-policy', {
  age: 25, // TypeScript ensures all required context fields are provided
});

// TypeScript will catch invalid rule references
const invalidPolicy = definePolicy({
  id: 'invalid',
  rules: ['rule:non-existent-rule'], // ❌ Type error if rule doesn't exist
  strategy: 'preemptive',
});
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

## License

MIT
