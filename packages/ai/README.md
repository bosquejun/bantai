# Bantai AI packages

Policy and governance for LLM usage: token quotas, rate limits, and structured output across providers.

## Packages

| Package | Description |
|--------|-------------|
| [**@bantai-dev/llm**](./llm) | Core: `withLLMContext`, token quota rules, `generateText` / `streamText`, and the `LLMProvider` interface. |
| [**@bantai-dev/openai**](./openai) | OpenAI Responses API provider with Zod structured output. |
| [**@bantai-dev/vercel-ai**](./vercel-ai) | Vercel AI SDK provider (OpenAI, OpenRouter, etc.) with Zod structured output. |

## Flow

1. **Context** – Define app context with `@bantai-dev/core`, then extend with `withLLMContext()` from `@bantai-dev/llm` (and optional rate-limit storage).
2. **Rules** – Add `defineTokenQuotaRule()` for per-user/org daily/weekly/monthly token limits.
3. **Policy** – Combine rules with `definePolicy()` from core.
4. **Provider** – Use `openai(model)` or `vercelAI(model)` from the provider packages.
5. **Call** – `generateText({ provider, policies, input })` evaluates policies, calls the provider, then consumes token quota.

See each package’s README for installation, usage, and API details.

## License

MIT
