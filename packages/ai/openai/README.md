# @bantai-dev/openai

OpenAI provider for [@bantai-dev/llm](../llm). Uses the OpenAI Responses API with optional Zod-based structured output.

## Features

- **OpenAI Responses API** – Uses `openai.responses.create()` for chat and structured output.
- **Zod structured output** – Pass `outputSchema` in the LLM input; responses are validated and typed.
- **Policy & token quotas** – Use with `generateText()` from `@bantai-dev/llm` and policies/context from core.

## Installation

```bash
pnpm add @bantai-dev/openai @bantai-dev/llm openai zod
```

## Peer dependencies

- `zod` ^4.3.5

## Usage

### Basic

```ts
import { openai } from "@bantai-dev/openai";
import { generateText, withLLMContext } from "@bantai-dev/llm";
import { defineContext, definePolicy } from "@bantai-dev/core";
import { z } from "zod";

const appContext = defineContext(
  z.object({
    userId: z.string().optional(),
    tier: z.enum(["free", "premium"]),
  })
);

const llmContext = withLLMContext(appContext, { storage }); // storage: see @bantai-dev/llm README
const policy = definePolicy(llmContext, "My Policy", [/* rules */]);

const provider = openai("gpt-4o");

const result = await generateText({
  provider,
  policies: [policy],
  input: {
    llm: {
      prompt: [{ role: "user", content: "Hello" }],
      maxTokensPerRequest: 512,
      outputSchema: z.object({ answer: z.string() }),
    },
    tier: "free",
    userId: "user-1",
  },
});

console.log(result.output); // { answer: "..." }
console.log(result.usage);  // { inputTokens, outputTokens, totalTokens }
```

### With client options

```ts
import { openai } from "@bantai-dev/openai";

const provider = openai("gpt-4o", {
  providerOptions: {
    apiKey: process.env.OPENAI_API_KEY,
    // other OpenAI ClientOptions
  },
});
```

### Prompt formats

- **String** – Converted to a single user message: `prompt: "Hello"`.
- **Messages** – Array of `{ role: "user" | "system" | "assistant", content: string }` passed to the Responses API.

## API

### `openai(model, options?)`

Creates an `LLMProvider` for the OpenAI Responses API.

- **model** – OpenAI chat model id (e.g. `"gpt-4o"`, `"gpt-4o-mini"`). See [OpenAI models](https://platform.openai.com/docs/models).
- **options**
  - **providerOptions** – Optional [OpenAI ClientOptions](https://github.com/openai/openai-node#configuration) (e.g. `apiKey`, `baseURL`).

Returns an adapter with:

- `providerName`: `"openai"`
- `defaultModel`: the given `model`
- `generateText(input, options)` – Calls `openai.responses.create()` with:
  - `input` from `convertPromptToOpenAIMessages(input.llm.prompt)`
  - Optional `text: { format: zodTextFormat(outputSchema, "output") }` when `input.llm.outputSchema` is set

### `convertPromptToOpenAIMessages(prompt)`

Utility to convert the LLM prompt (string or message array) to the format expected by `openai.responses.create()` input. Re-exported for use in custom wrappers if needed.

## Environment

- `OPENAI_API_KEY` – Set for the OpenAI client (or pass via `providerOptions.apiKey`).

## Related

- [@bantai-dev/llm](../llm) – Context, token quota rules, `generateText`/`streamText`.
- [OpenAI Node SDK](https://github.com/openai/openai-node) – Underlying client.

## License

MIT
