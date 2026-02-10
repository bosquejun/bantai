# @bantai-dev/with-audit

> Audit extension for @bantai-dev/core

Add audit logging capabilities to your Bantai contexts. This package provides audit event tracking and sinks for policy evaluations, rule decisions, and custom events.

**Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)

## Installation

```bash
npm install @bantai-dev/with-audit @bantai-dev/core zod
# or
pnpm add @bantai-dev/with-audit @bantai-dev/core zod
# or
yarn add @bantai-dev/with-audit @bantai-dev/core zod
```

**Note**: `@bantai-dev/core` and `zod` are peer dependencies and must be installed separately.

## Quick Start

```typescript
import { z } from "zod";
import { defineContext, defineRule, definePolicy, evaluatePolicy, allow } from "@bantai-dev/core";
import { withAudit } from "@bantai-dev/with-audit";

// 1. Define your base context
const appContext = defineContext(
    z.object({
        userId: z.string(),
    })
);

// 2. Create audit sinks (where events will be sent)
const auditSinks = [
    (event) => console.log("Audit event:", event),
    // Add more sinks: database, logging service, etc.
];

// 3. Extend context with audit capabilities
const contextWithAudit = withAudit(appContext, { sinks: auditSinks });

// 4. Define rules and policies as usual
const userRule = defineRule(contextWithAudit, "check-user", async (input, { tools }) => {
    // Your rule logic here
    return allow({ reason: "User authorized" });
});

const policy = definePolicy(contextWithAudit, "user-policy", [userRule]);

// 5. Evaluate policy - audit events are automatically emitted
const result = await evaluatePolicy(policy, {
    userId: "123",
    audit: {
        trace: {
            traceId: "trace-123",
            requestId: "req-456",
        },
    },
});
```

## How It Works

When you use `withAudit`, the package:

1. **Extends the context schema** with an optional `audit.trace` field for correlation IDs
2. **Adds audit tools** to the context that are automatically used by `evaluatePolicy`
3. **Automatically emits events** during policy evaluation:
    - `policy.start` - When evaluation begins
    - `rule.start` - When each rule evaluation begins
    - `rule.decision` - When each rule makes a decision
    - `rule.end` - When each rule evaluation completes
    - `policy.decision` - When the final policy decision is made
    - `policy.end` - When evaluation completes

All events are automatically enriched with:

- `evaluationId` - Unique ID for this policy evaluation
- `policy` - Policy name and version
- `id` - Unique event ID
- `timestamp` - Unix timestamp in milliseconds

## API Reference

### `withAudit(context, options)`

Extends a Bantai context with audit capabilities.

**Parameters:**

- `context`: A Bantai context definition
- `options`: Configuration object
    - `sinks`: Array of `AuditSink` functions that receive audit events

**Returns:** Extended context with audit tools in `context.tools.audit`

**Type Signature:**

```typescript
function withAudit<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>>(
    context: TContext,
    options: {
        sinks: AuditSink[];
    }
): WithAuditContext<TContext>;
```

### AuditTool

The audit tool provides methods for creating and emitting audit events:

```typescript
type AuditTool<TContext, TName, TRules> = {
    createAuditEvent: (
        policy: PolicyDefinition<TContext, TName, TRules>,
        evaluationId: string
    ) => AuditHandler;
};
```

**`createAuditEvent(policy, evaluationId)`**

Creates an audit handler for a specific policy evaluation. Returns an `AuditHandler` that can emit events.

**Parameters:**

- `policy`: The policy definition for this evaluation
- `evaluationId`: Unique identifier for this policy evaluation

**Returns:** `AuditHandler` with an `emit` method

**Example:**

```typescript
import { generateId } from "@bantai-dev/shared";

const evaluationId = generateId("eval");
const handler = context.tools.audit.createAuditEvent(policy, evaluationId);

handler.emit({
    type: "extension.event",
    meta: { customData: "value" },
});
```

### AuditHandler

An audit handler is returned by `createAuditEvent` and provides an `emit` method:

```typescript
type AuditHandler = {
    emit: (event: Omit<AuditEvent, "evaluationId" | "policy" | "id" | "timestamp">) => string;
};
```

**`emit(event)`**

Emits an audit event. The event is automatically enriched with `evaluationId`, `policy`, `id`, and `timestamp`.

**Parameters:**

- `event`: Partial audit event (without auto-generated fields)

**Returns:** The generated event ID (`event:${string}`)

**Note:** After emitting `policy.end`, the handler cannot emit more events and will throw an error.

### AuditSink

An audit sink is a function that receives validated audit events:

```typescript
type AuditSink = (event: AuditEvent) => void;
```

### AuditEvent

The audit event structure:

```typescript
type AuditEvent = {
    id: `event:${string}`; // Unique event ID (prefixed with "event:")
    type:
        | "policy.start"
        | "rule.start"
        | "rule.decision"
        | "rule.end"
        | "policy.decision"
        | "policy.end"
        | "extension.event";
    timestamp: number; // Unix timestamp in ms
    evaluationId: string; // Unique per policy evaluation
    policy: {
        name: string;
        version?: string;
        id: string; // Policy ID
    };
    rule?: {
        name: string;
        version?: string;
        id: string; // Rule ID
    };
    decision?: {
        outcome: "allow" | "deny" | "skip";
        reason: string | null;
    };
    trace?: {
        traceId?: string;
        requestId?: string;
    };
    meta?: Record<string, unknown>; // Extension-owned data
    auditVersion: string; // Audit schema version
    durationMs?: number | null; // Duration in milliseconds (for timing events)
    parentId?: string; // Parent event ID (for event hierarchies)
};
```

**Note:** All fields except `id`, `timestamp`, `evaluationId`, `policy`, and `auditVersion` are optional and depend on the event type.

## Examples

### Basic Audit Logging

```typescript
import { z } from "zod";
import { defineContext, defineRule, definePolicy, evaluatePolicy } from "@bantai-dev/core";
import { withAudit } from "@bantai-dev/with-audit";

const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [
        (event) => {
            console.log(`[${event.type}] ${event.policy.name}`, event);
        },
    ],
});

const rule = defineRule(context, "check-user", async (input) => {
    return input.userId === "admin" ? allow() : deny({ reason: "Unauthorized" });
});

const policy = definePolicy(context, "auth-policy", [rule]);

// Evaluate with trace information
await evaluatePolicy(policy, {
    userId: "admin",
    audit: {
        trace: {
            traceId: "trace-123",
            requestId: "req-456",
        },
    },
});
```

### Multiple Sinks

You can send audit events to multiple destinations:

```typescript
const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [
        // Console logging
        (event) => console.log("Audit:", event),

        // Database storage
        async (event) => {
            await db.auditEvents.insert(event);
        },

        // External logging service
        async (event) => {
            await fetch("https://logs.example.com/audit", {
                method: "POST",
                body: JSON.stringify(event),
            });
        },
    ],
});
```

### Custom Audit Events

You can emit custom audit events using the audit handler:

```typescript
import { defineContext, definePolicy } from "@bantai-dev/core";
import { generateId } from "@bantai-dev/shared";
import { withAudit } from "@bantai-dev/with-audit";

const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [(event) => console.log(event)],
});

const policy = definePolicy(context, "my-policy", []);

// Get audit handler for custom events
// You need to provide a policy and evaluationId
const evaluationId = generateId("eval");
const auditHandler = context.tools.audit.createAuditEvent(policy, evaluationId);

// Emit custom events
auditHandler.emit({
    type: "extension.event",
    meta: {
        customField: "custom-value",
        action: "user-login",
    },
});

// Note: After policy.end is emitted, the handler cannot emit more events
```

### Database Storage

Store audit events in a database:

```typescript
import { withAudit } from "@bantai-dev/with-audit";

const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [
        async (event) => {
            await db.query(
                "INSERT INTO audit_events (id, type, timestamp, evaluation_id, policy_name, data) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    event.id,
                    event.type,
                    new Date(event.timestamp),
                    event.evaluationId,
                    event.policy.name,
                    JSON.stringify(event),
                ]
            );
        },
    ],
});
```

### Filtering Events

Filter events before sending to sinks:

```typescript
const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [
        (event) => {
            // Only log deny decisions
            if (event.type === "rule.decision" && event.decision?.outcome === "deny") {
                console.error("Denial:", event);
            }
        },
    ],
});
```

### Error Handling

Handle errors in sinks gracefully:

```typescript
const context = withAudit(defineContext(z.object({ userId: z.string() })), {
    sinks: [
        (event) => {
            try {
                // Your sink logic
                sendToService(event);
            } catch (error) {
                console.error("Failed to send audit event:", error);
                // Optionally: send to dead letter queue
            }
        },
    ],
});
```

## Context Schema Extension

When you use `withAudit`, the context schema is automatically extended with:

```typescript
{
  audit?: {
    trace?: {
      traceId?: string;
      requestId?: string;
    };
  };
}
```

This allows you to pass trace information when evaluating policies:

```typescript
await evaluatePolicy(policy, {
    userId: "123",
    audit: {
        trace: {
            traceId: "trace-123",
            requestId: "req-456",
        },
    },
});
```

## Event Types

### `policy.start`

Emitted when policy evaluation begins.

```typescript
{
  type: 'policy.start',
  evaluationId: string,
  policy: { name: string, version?: string },
  trace?: { traceId?: string, requestId?: string },
}
```

### `rule.start`

Emitted when a rule evaluation begins.

```typescript
{
  type: 'rule.start',
  evaluationId: string,
  policy: { name: string, version?: string },
  rule: { name: string },
  trace?: { traceId?: string, requestId?: string },
}
```

### `rule.decision`

Emitted when a rule makes a decision.

```typescript
{
  type: 'rule.decision',
  evaluationId: string,
  policy: { name: string, version?: string },
  rule: { name: string },
  decision: {
    outcome: 'allow' | 'deny' | 'skip',
    reason: string | null,
  },
  trace?: { traceId?: string, requestId?: string },
}
```

### `rule.end`

Emitted when a rule evaluation completes.

```typescript
{
  type: 'rule.end',
  evaluationId: string,
  policy: { name: string, version?: string },
  rule: { name: string },
  trace?: { traceId?: string, requestId?: string },
}
```

### `policy.decision`

Emitted when the final policy decision is made.

```typescript
{
  type: 'policy.decision',
  evaluationId: string,
  policy: { name: string, version?: string },
  decision: {
    outcome: 'allow' | 'deny',
    reason: string,
  },
  trace?: { traceId?: string, requestId?: string },
}
```

### `policy.end`

Emitted when policy evaluation completes.

```typescript
{
  type: 'policy.end',
  evaluationId: string,
  policy: { name: string, version?: string },
  trace?: { traceId?: string, requestId?: string },
}
```

### `extension.event`

Custom events that you can emit manually.

```typescript
{
  type: 'extension.event',
  evaluationId: string,
  policy: { name: string, version?: string },
  meta?: Record<string, unknown>,
  trace?: { traceId?: string, requestId?: string },
}
```

## Integration with Other Packages

### With Rate Limiting

Audit rate limiting decisions:

```typescript
import { withRateLimit } from "@bantai-dev/with-rate-limit";
import { withAudit } from "@bantai-dev/with-audit";

const baseContext = defineContext(z.object({ userId: z.string() }));

const context = withAudit(withRateLimit(baseContext, { storage }), {
    sinks: [(event) => console.log("Rate limit audit:", event)],
});
```

## Type Safety

The package provides full TypeScript type safety:

- **Context extension**: Type-safe context merging with audit tools
- **Event validation**: All events are validated against the audit event schema
- **Schema extension**: Type-safe audit trace fields in context input

## Best Practices

1. **Use multiple sinks**: Separate concerns by using different sinks for different purposes (logging, storage, alerting)

2. **Handle errors**: Wrap sink logic in try-catch to prevent one failing sink from breaking others

3. **Include trace IDs**: Always pass trace information when evaluating policies for better observability

4. **Filter at sink level**: If you need to filter events, do it in the sink function rather than modifying the core package

5. **Async sinks**: Use async sinks for database operations, but be aware that errors won't stop other sinks

## Requirements

- Node.js >= 20.9.0
- TypeScript >= 5.0
- Zod >= 4.3.5
- @bantai-dev/core
- @bantai-dev/shared

## Links

- **Website**: [https://bantai.vercel.app/](https://bantai.vercel.app/)
- **GitHub Repository**: [https://github.com/bosquejun/bantai](https://github.com/bosquejun/bantai)
- **npm Package**: [https://www.npmjs.com/package/@bantai-dev/with-audit](https://www.npmjs.com/package/@bantai-dev/with-audit)

## License

MIT
