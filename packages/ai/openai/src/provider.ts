import { LLMProvider, WithLLMContext } from "@bantai-dev/llm";
import { ClientOptions, OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { ResponseInput } from "openai/resources/responses/responses.js";
import { ChatModel } from "openai/resources/shared";
import { convertPromptToOpenAIMessages } from "./utils.js";

export type OpenAiOptions = {
    providerOptions?: ClientOptions;
};
export const openai = (model: ChatModel, options?: OpenAiOptions) => {
    const openaiClient = new OpenAI({
        ...(options?.providerOptions || {}),
    });

    const adapter: LLMProvider<WithLLMContext> = {
        providerName: "openai",
        defaultModel: model,
        generateText: async (input) => {
            const messages: ResponseInput = convertPromptToOpenAIMessages(input.llm.prompt);

            const response = await openaiClient.responses.create({
                model: input.llm.model || model,
                input: messages,
                ...(input.llm.outputSchema && {
                    text: {
                        format: zodTextFormat(input.llm.outputSchema, "output"),
                    },
                }),
            });

            return {
                output: response.output_text,
                usage: {
                    inputTokens: response.usage?.input_tokens || 0,
                    outputTokens: response.usage?.output_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0,
                },
                providerResponse: response,
            };
        },
        async *streamText(input) {
            const messages: ResponseInput = convertPromptToOpenAIMessages(input.llm.prompt);

            const stream = await openaiClient.responses.create({
                model: input.llm.model || model,
                input: messages,
                stream: true,
            });

            for await (const event of stream) {
                if (event.type === "response.output_text.delta") {
                    yield {
                        text: event.delta,
                        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                    };
                } else if (event.type === "response.completed") {
                    yield {
                        text: "",
                        usage: {
                            inputTokens: event.response.usage?.input_tokens || 0,
                            outputTokens: event.response.usage?.output_tokens || 0,
                            totalTokens: event.response.usage?.total_tokens || 0,
                        },
                    };
                }
            }
        },
    };
    return adapter;
};
