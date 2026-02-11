# @bantai-dev/vercel-ai

[Vercel AI SDK](https://sdk.vercel.ai/) provider for [@bantai-dev/llm](../llm). Works with any model supported by the AI SDK (OpenAI, OpenRouter, Anthropic, etc.) and supports structured output via Zod.

## Features

- **Vercel AI SDK** – Uses `generateText` from the `ai` package with your chosen model.
- **Any model** – Pass any `LanguageModel` (e.g. `createOpenAI()`, `createOpenRouter()`, `createAnthropic()`).
- **Zod structured output** – Pass `outputSchema` in the LLM input; uses `Output.object({ schema })` under the hood.
- **Policy & token quotas** – Use with `generateText()` from `@bantai-dev/llm` and policies/context from core.

## Installation

```bash
pnpm add @bantai-dev/vercel-ai @bantai-dev/llm ai zod
```

For OpenRouter:

```bash
pnpm add @openrouter/ai-sdk-provider
```

## Peer dependencies

- `zod` ^4.3.5

## Usage

### With OpenRouter

```ts
import { vercelAI } from "@bantai-dev/vercel-ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, withLLMContext } from "@bantai-dev/llm";
import { defineContext, definePolicy } from "@bantai-dev/core";
import { z } from "zod";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const provider = vercelAI(openrouter("openai/gpt-4o")); // or e.g. "upstage/solar-pro-3:free"

const appContext = defineContext(
  z.object({
    userId: z.string().optional(),
    tier: z.enum(["free", "premium"]),
  })
);

const llmContext = withLLMContext(appContext, { storage });
const policy = definePolicy(llmContext, "My Policy", [/* rules */]);

const result = await generateText({
  provider,
  policies: [policy],
  input: {
    llm: {
      prompt: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello in JSON with a 'message' field." },
      ],
      maxTokensPerRequest: 256,
      outputSchema: z.object({ message: z.string() }),
    },
    tier: "free",
    userId: "user-1",
  },
});

console.log(result.output); // { message: "..." }
```

### With OpenAI (AI SDK)

```ts
import { createOpenAI } from "@openai/ai-sdk-provider"; // or from "ai/openai"
import { vercelAI } from "@bantai-dev/vercel-ai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const provider = vercelAI(openai("gpt-4o"));
```

### Provider options

Pass through options to the AI SDK `generateText` call:

```ts
const result = await generateText({
  provider,
  policies: [policy],
  input: { llm: { prompt: "Hello" }, /* context */ },
  providerOptions: {
    // e.g. maxTokens, temperature, etc. – depends on AI SDK
  },
});
```

### Prompt formats

- **String** – Single user message: `prompt: "Hello"`.
- **Messages** – Array of `{ role: "user" | "system" | "assistant", content: string }` passed to the AI SDK as `messages`.

## Utilities

### `convertPromptToVercelAIMessages(prompt)`

Converts the LLM prompt (string or message array) to the `ModelMessage[]` format expected by the AI SDK. Used internally by the provider.

### `convertUIMessagesToPrompt(uiMessages)`

Converts Vercel AI SDK `UIMessage[]` (e.g. from a chat UI) to the prompt format expected by `@bantai-dev/llm` (array of `{ role, content }`). Useful when wiring UI to `generateText` with policies.

## API

### `vercelAI(model)`

Creates an `LLMProvider` that delegates to the Vercel AI SDK `generateText`.

- **model** – A `LanguageModel` from the AI SDK (e.g. from `createOpenRouter()`, `createOpenAI()`).

Returns an adapter with:

- `providerName`: `"vercel-ai"`
- `defaultModel`: `model.modelId` or the string model id
- `generateText(input, options)` – Calls AI SDK `generateText` with:
  - `messages` from `convertPromptToVercelAIMessages(input.llm.prompt)`
  - Optional `output: Output.object({ schema: input.llm.outputSchema })` when `outputSchema` is set
  - Merged `providerOptions` from the second argument

## Environment

- **OpenRouter**: `OPENROUTER_API_KEY`
- **OpenAI**: `OPENAI_API_KEY` (when using OpenAI via AI SDK)

## Related

- [@bantai-dev/llm](../llm) – Context, token quota rules, `generateText`/`streamText`.
- [Vercel AI SDK](https://sdk.vercel.ai/) – Documentation and providers.

## License

MIT
