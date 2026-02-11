# @bantai-dev/llm

Policy and governance for AI and LLM usage. Integrates with [@bantai-dev/core](https://github.com/bosquejun/bantai) to enforce token quotas, rate limits, and custom rules before and after LLM calls.

## Features

- **LLM context** – Extend any app context with `withLLMContext()` for prompt/model/usage tracking
- **Token quota rules** – `defineTokenQuotaRule()` for per-user or per-org daily/weekly/monthly token limits
- **Policy-first** – Evaluate policies (from core) before calling the provider; consume quota after a successful call
- **Provider-agnostic** – Use with [@bantai-dev/openai](./openai) or [@bantai-dev/vercel-ai](./vercel-ai)
- **Structured output** – Optional Zod schema for typed LLM output

## Installation

```bash
pnpm add @bantai-dev/llm @bantai-dev/core zod
```

`@bantai-dev/with-rate-limit` is a dependency of this package; you don’t need to install it separately. For token quota rules you only need a storage implementation (e.g. Redis) that matches the rate-limit storage schema.

## Peer dependencies

- `zod` ^4.3.5

## Quick start

1. Define your app context with `defineContext` from `@bantai-dev/core`.
2. Extend it with `withLLMContext(context, { storage })` (storage must implement the rate-limit schema; see `@bantai-dev/with-rate-limit` for the schema and adapters).
3. Add token quota rules with `defineTokenQuotaRule(llmContext, ruleName, options)`.
4. Combine rules into a policy with `definePolicy(llmContext, policyName, rules)` from core.
5. Call `generateText({ provider, policies, input })` with a provider from `@bantai-dev/openai` or `@bantai-dev/vercel-ai`.

## API

### `withLLMContext(context, options?)`

Extends a context with LLM fields and rate-limit–backed token tracking.

- **context** – A context created with `defineContext` from `@bantai-dev/core`.
- **options**
    - `storage` – Optional rate-limit storage (must conform to the schema from the bundled `@bantai-dev/with-rate-limit`). Required for token quota rules.
    - `tokenUsageEstimator` – Optional `(prompt) => Promise<number>`. Defaults to an internal estimator.

Returns a context that includes `llm` (prompt, model, maxTokensPerRequest, outputSchema) and `rateLimit` tools.

### `defineTokenQuotaRule(context, ruleName, options)`

Defines a rule that allows or denies a request based on a token quota (e.g. daily per user).

- **context** – Must be from `withLLMContext(...)`.
- **ruleName** – Human-readable name for the rule.
- **options**
    - **identifier** – `(input) => string` or a fixed string. Used as part of the rate-limit key (e.g. `user:123`, `org:abc`).
    - **quota** – `{ limitTokens, period }` or `(input) => { limitTokens, period }`. `period`: `"daily"` | `"weekly"` | `"monthly"`.
    - **evaluate** – Optional async rule. Return `skip()` to skip this rule, or `allow()`/`deny()` to override (e.g. skip org quota when there is no org).

The rule uses the context’s `llm.tokenUsageEstimator` and `maxTokensPerRequest` to reserve tokens before the call, then consumes actual usage after the provider returns.

### `generateText(settings)`

Runs policy evaluation, calls the provider’s `generateText`, then consumes token quota for rules that allowed the request.

- **settings**
    - **provider** – An `LLMProvider` from `@bantai-dev/openai` or `@bantai-dev/vercel-ai`.
    - **policies** – Array of policies (from `definePolicy`).
    - **input** – Context input including `llm: { prompt, model?, maxTokensPerRequest?, outputSchema? }` and any other context fields.
    - **providerOptions** – Optional; passed to the provider’s `generateText`.

Returns a promise of `{ output, usage, evaluation, providerResponse? }`. If any policy denies, throws a policy violation error from core.

### Types

- **LLMProvider** – Interface implemented by providers: `generateText`, optional `streamText`, `defaultModel`, `providerName`.
- **WithLLMContext** – Type for a context extended with `withLLMContext`.
- **LLMGenerateTextInput** – `prompt` (string or messages), `model?`, `maxTokensPerRequest?`, `outputSchema?`.
- **LLMGenerateTextOutput** – `output`, `usage: { inputTokens, outputTokens, totalTokens }`, `providerResponse?`.

## Providers

- **[@bantai-dev/openai](../openai)** – OpenAI Responses API with Zod structured output.
- **[@bantai-dev/vercel-ai](../vercel-ai)** – Vercel AI SDK (and OpenRouter, etc.) with structured output.

## License

MIT
