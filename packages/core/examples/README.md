# Examples

This directory contains real-world examples demonstrating how to use the Bantai policy/rules system for various use cases, from basic validation to complex business logic.

## Overview

The examples are organized from simple to complex, covering a wide range of scenarios:

- **Basic Validation**: Age eligibility, password validation, name validation
- **Access Control**: Rate limiting, RBAC (Role-Based Access Control)
- **Resource Management**: AI token quota with quality degrading
- **Business Logic**: E-commerce, banking systems, crypto/NFT, infrastructure

Each example includes:

- Context definitions with Zod schemas
- Multiple rules demonstrating different validation patterns
- Policy definitions with appropriate strategies
- Example usage scenarios showing both success and failure cases

## Examples

### Basic Validation

#### [age-eligibility.ts](./age-eligibility.ts)

Age validation and eligibility checks including:

- Minimum age requirements
- Country-specific age requirements (COPPA, GDPR)
- Service-specific age restrictions (alcohol, gambling, financial services)
- Parental consent requirements

**Strategy**: Preemptive (fail fast on age check)

#### [password-validation.ts](./password-validation.ts)

Comprehensive password validation including:

- Length requirements (minimum and maximum)
- Complexity requirements (uppercase, lowercase, numbers, special characters)
- Common password detection
- Password reuse prevention
- Pattern detection (sequential, repeated characters, keyboard patterns)

**Strategy**: Exhaustive (collect all validation errors to show user)

#### [name-validation.ts](./name-validation.ts)

Name format and validation including:

- Length constraints
- Format validation (letters, spaces, hyphens, apostrophes)
- Country-specific name formats
- Profanity/blocked words detection
- Special character validation

**Strategy**: Exhaustive (collect all validation errors)

### Access Control

#### [rate-limiting.ts](./rate-limiting.ts)

API rate limiting policies including:

- Per-user rate limiting
- Endpoint-specific rate limits
- Time window-based rate limiting
- Request count tracking

**Strategy**: Preemptive (fail fast on rate limit)

#### [rbac.ts](./rbac.ts)

Role-Based Access Control (RBAC) including:

- Role validation
- Permission checking based on roles
- Resource ownership validation
- Action-based access control
- Role hierarchy support

**Strategy**: Preemptive (fail fast on access denial)

### Resource Management

#### [ai-token-quota.ts](./ai-token-quota.ts)

AI token quota management with quality degrading including:

- Daily/hourly/monthly token quotas
- Single request size limits
- Tier-based limits (free, premium, enterprise)
- Quality degradation when approaching limits
- Model-specific limits

**Strategy**: Exhaustive (collect all quota violations for user feedback)

### Business Logic

#### [ecommerce.ts](./ecommerce.ts)

E-commerce validation policies including:

- Inventory availability checks
- Purchase quantity limits
- Payment method validation
- Shipping address validation
- Cart total validation (minimum/maximum)

**Strategy**: Exhaustive (show all validation errors to user)

#### [banking-system.ts](./banking-system.ts)

Banking transaction policies including:

- Balance verification
- Daily transaction limits
- Transaction type permissions
- KYC verification for large transactions
- Fraud detection patterns
- Recipient account validation
- Transaction velocity checks

**Strategy**: Preemptive (fail fast on critical checks)

#### [crypto-nft.ts](./crypto-nft.ts)

Crypto and NFT policies including:

- Ownership verification
- Transfer eligibility
- Gas price limits
- Collection-specific rules
- Royalty enforcement
- Marketplace restrictions
- Network whitelisting

**Strategy**: Exhaustive (collect all policy violations)

#### [infrastructure.ts](./infrastructure.ts)

Infrastructure deployment policies including:

- Environment permissions
- Resource quotas per environment
- Cost budget limits
- Region deployment restrictions
- Deployment time windows
- Resource type restrictions
- Auto-scaling limits

**Strategy**: Exhaustive (collect all infrastructure constraints)

## Running Examples

Each example file can be run directly to see the policy evaluation in action:

```bash
# Using tsx or ts-node
tsx packages/core/src/examples/age-eligibility.ts

# Or import and use in your code
import { ageEligibilityPolicy, evaluatePolicy } from '@bantai-dev/core/examples/age-eligibility';
```

## Learning Path

1. **Start with basic validation** (`age-eligibility.ts`, `password-validation.ts`, `name-validation.ts`)
    - Learn how to define contexts and rules
    - Understand preemptive vs exhaustive strategies
    - See simple validation patterns

2. **Move to access control** (`rate-limiting.ts`, `rbac.ts`)
    - Learn about stateful policies
    - Understand permission hierarchies
    - See how to handle different user roles

3. **Explore resource management** (`ai-token-quota.ts`)
    - Learn about quota management
    - Understand quality degradation patterns
    - See tier-based access control

4. **Study complex business logic** (`ecommerce.ts`, `banking-system.ts`, `crypto-nft.ts`, `infrastructure.ts`)
    - Learn about multi-rule policies
    - Understand complex validation scenarios
    - See real-world policy patterns

## Key Concepts

### Context

A context defines the input schema for your policy. It uses Zod for type-safe validation.

```typescript
const schema = z.object({
    age: z.number(),
    country: z.string(),
});

const context = defineContext(schema);
```

### Rules

Rules are individual validation checks that return `allow()` or `deny()`.

```typescript
const ageCheck = defineRule(context, "age-check", async (input) => {
    return input.age >= 18
        ? allow({ reason: "User is an adult" })
        : deny({ reason: "User is not an adult" });
});
```

### Policies

Policies combine multiple rules and define the evaluation strategy.

```typescript
const policy = definePolicy(context, "my-policy", [rule1, rule2], {
    defaultStrategy: "preemptive", // or 'exhaustive'
});
```

### Strategies

- **Preemptive**: Stops evaluation on first violation (fail fast)
- **Exhaustive**: Evaluates all rules and collects all violations

### Evaluation

```typescript
const result = await evaluatePolicy(policy, {
    age: 25,
    country: "US",
});

console.log(result.decision); // 'allow' or 'deny'
console.log(result.reason); // Why the decision was made
console.log(result.violatedRules); // Array of violated rules
```

## Best Practices

1. **Use preemptive strategy** for critical checks that should fail fast (e.g., authentication, rate limiting)
2. **Use exhaustive strategy** for validation where you want to show all errors (e.g., form validation, quota information)
3. **Provide clear reasons** in your `allow()` and `deny()` calls to help with debugging and user feedback
4. **Keep rules focused** - each rule should check one specific thing
5. **Use context defaults** for optional fields with sensible defaults
6. **Document your policies** - add comments explaining business logic and thresholds

## Contributing

When adding new examples:

- Follow the existing file structure
- Include comprehensive comments
- Provide multiple example scenarios (both success and failure cases)
- Use appropriate strategy (preemptive vs exhaustive)
- Export all rules and policies for reuse
