import { LLMProvider } from "@bantai-dev/llm";
import { generateText, LanguageModel } from "ai";
import { convertPromptToVercelAIMessages } from "./utils.js";

export const vercelAI = (model: LanguageModel) => {
    const adapter: LLMProvider = {
        providerName: "vercel-ai",
        generateText: async (input) => {
            const prompt = convertPromptToVercelAIMessages(input.llm.prompt);
            const response = await generateText({
                model,
                prompt,
            });

            return {
                text: response.text,
                usage: {
                    inputTokens: response.usage.inputTokens || 0,
                    outputTokens: response.usage.outputTokens || 0,
                    totalTokens: response.usage.totalTokens || 0,
                },
                providerResponse: response,
            };
        },
        defaultModel: typeof model === "string" ? model : model.modelId,
    };
    return adapter;
};
