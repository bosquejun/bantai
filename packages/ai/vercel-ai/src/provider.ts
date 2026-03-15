import { LLMProvider, WithLLMContext } from "@bantai-dev/llm";
import { LanguageModel, Output, generateText, streamText as vercelStreamText } from "ai";
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
        async *streamText(input, options) {
            const messages = convertPromptToVercelAIMessages(input.llm.prompt);

            const result = vercelStreamText({
                ...(options?.providerOptions || {}),
                model,
                messages,
            });

            for await (const chunk of result.fullStream) {
                if (chunk.type === "text-delta") {
                    yield {
                        text: chunk.text,
                        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                    };
                } else if (chunk.type === "finish") {
                    yield {
                        text: "",
                        usage: {
                            inputTokens: chunk.totalUsage.inputTokens || 0,
                            outputTokens: chunk.totalUsage.outputTokens || 0,
                            totalTokens: chunk.totalUsage.totalTokens || 0,
                        },
                    };
                }
            }
        },
    };
    return adapter;
};
