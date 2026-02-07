import { ContextDefinition, ExtractContextShape, defineContext } from "@bantai-dev/core";
import { RateLimitStorage, rateLimit, withRateLimit } from '@bantai-dev/with-rate-limit';
import { createMemoryStorage } from '@bantai-dev/with-storage';
import { z } from "zod";
import { OpenAiSchema } from "./context.js";
import { openAiSchema } from "./index.js";
import { estimateTokens } from "./utils.js";


type OpenAiInput<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = ExtractContextShape<TContext> & OpenAiSchema;

type WithOpenAIOptions<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = {
    defaultValues?: Partial<z.infer<typeof openAiSchema>>;
    storage?: RateLimitStorage;
    generateKey?: (input: OpenAiInput<TContext>) => string;
    estimateTokens?: (input: OpenAiSchema['llm']) => number;
}


export const withOpenAI = <TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>>(context: TContext, options: WithOpenAIOptions<TContext>) => {
    const partialOpenAiSchema = openAiSchema.partial();
    type OpenAiPartialShape = typeof partialOpenAiSchema extends z.ZodObject<infer Shape> ? Shape : z.ZodRawShape;
    const mergedSchema = context.schema.extend(partialOpenAiSchema.shape as OpenAiPartialShape);

    const ctx = defineContext(mergedSchema, {
        tools: {
            ...context.tools,
            openai: {
                llm:{
                    estimateTokens: options.estimateTokens ?? estimateTokens
                }
            }
        }
    })

    const keyGenerator = options.generateKey ?? (({llm}) => {
        return `${llm.model}-${llm.sessionId}`;
    });

    return withRateLimit(ctx, {
        storage: options.storage?? createMemoryStorage(rateLimit.storageSchema),
        generateKey: (input) => {
            return keyGenerator(input as unknown as OpenAiInput<TContext>);
        },
        defaultValues: {

        }
    });
};


const appContext = defineContext(z.object({
    name: z.string(),
    age: z.number()
}));

const withAiContext = withOpenAI(appContext, {
    storage: createMemoryStorage(rateLimit.storageSchema),
    generateKey: (input) => {
        return `${input.llm.model}-${input.llm.sessionId}`;
    }
});

