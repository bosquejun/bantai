import { ContextDefinition, ExtractContextShape } from "@bantai-dev/core";
import { z } from "zod";
import { LLMGenerateTextInput, LLMGenerateTextOutput, tokenUsageSchema } from "./schema.js";

export type LLMProviderInput<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = Omit<z.infer<z.ZodObject<ExtractContextShape<TContext>>>, "rateLimit"> & {
    llm: LLMGenerateTextInput<TOutputSchema>;
};

export interface LLMProvider<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TGenerateTextOptions = unknown,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
    TGenerateProviderResponse = unknown,
> {
    generateText(
        input: LLMProviderInput<TContext, TOutputSchema>,
        options?: { providerOptions?: TGenerateTextOptions }
    ): Promise<LLMGenerateTextOutput<TOutputSchema, TGenerateProviderResponse>>;
    /** Streaming text generation (optional) */
    streamText?: (
        input: LLMProviderInput<TContext, TOutputSchema>,
        options?: { providerOptions?: TGenerateTextOptions }
    ) => AsyncIterable<{
        text: string;
        usage: z.infer<typeof tokenUsageSchema>;
        raw?: Partial<LLMGenerateTextOutput<TOutputSchema, TGenerateProviderResponse>>;
    }>;
    defaultModel: string;
    providerName: string;
}
