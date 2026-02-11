import { LLMProvider, WithLLMContext } from "@bantai-dev/llm";
import { LanguageModel, Output, generateText } from "ai";
import { convertPromptToVercelAIMessages } from "./utils.js";

type GenerateTextOptions = Omit<Parameters<typeof generateText>[0], "model" | "prompt" | "output">;

export const vercelAI = (model: LanguageModel) => {
    const adapter: LLMProvider<WithLLMContext, GenerateTextOptions> = {
        providerName: "vercel-ai",
        defaultModel: typeof model === "string" ? model : model.modelId,
        generateText: async (input, options) => {
            const messages = convertPromptToVercelAIMessages(input.llm.prompt);

            const response = await generateText({
                ...(options?.providerOptions || {}),
                model,
                messages,
                ...(input.llm.outputSchema
                    ? { output: Output.object({ schema: input.llm.outputSchema }) }
                    : {}),
            });

            return {
                output: response.output,
                usage: {
                    inputTokens: response.usage.inputTokens || 0,
                    outputTokens: response.usage.outputTokens || 0,
                    totalTokens: response.usage.totalTokens || 0,
                },
                providerResponse: response,
            };
        },
    };
    return adapter;
};
