import { LLMProvider } from "@bantai-dev/llm";
import { ClientOptions, OpenAI } from "openai";
import { ResponseInput } from "openai/resources/responses/responses.js";
import { ChatModel } from "openai/resources/shared";


export type OpenAiOptions = {
    providerOptions?: ClientOptions
}

export const openai = (model: ChatModel, options: OpenAiOptions) => {
    const openaiClient = new OpenAI({   
        ...options.providerOptions || {}
    });

    const adapter: LLMProvider = {
        generateText: async (input) => {
            const messages:ResponseInput =  [{
                role: "user",
                content: input.llm.input.prompt
            }];

            if(input.llm.input.systemPrompt){
                messages.unshift({
                    role: "system",
                    content: input.llm.input.systemPrompt
                });
            }
            const response = await openaiClient.responses.create({
                model: input.llm.model || model,
                input: messages,
            })

            return {
                text: response.output_text,
                usage: {
                    inputTokens: response.usage?.input_tokens || 0,
                    outputTokens: response.usage?.output_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0,
                },
                providerResponse: response,
            };
        },
        defaultModel: model,
    };
    return adapter;
}