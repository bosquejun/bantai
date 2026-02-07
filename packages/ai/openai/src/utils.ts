import { OpenAiSchema } from "./context.js";


export const estimateTokens = (inputContext: OpenAiSchema["llm"]) => {
    const inputTokens = Math.ceil(inputContext.input.prompt.length / 4);
    const systemTokens = inputContext.input.systemPrompt
        ? Math.ceil(inputContext.input.systemPrompt.length / 4)
        : 0;

    const outputTokens = inputContext.maxTokens ?? 512;

    return inputTokens + systemTokens + outputTokens;
}