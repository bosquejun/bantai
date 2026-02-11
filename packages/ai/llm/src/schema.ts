import { policyResultSchema } from "@bantai-dev/core/policies";
import { z } from "zod";

export const llmInputObjectSchema = z.object({
    role: z.enum(["user", "system", "assistant"]),
    content: z.string(),
});

export const llmGenerateTextInputSchema = z.object({
    model: z.string().optional(),
    prompt: z.string().or(z.array(llmInputObjectSchema)),
    maxTokensPerRequest: z.number().default(1024).optional(),
    outputSchema: z.instanceof(z.ZodObject).optional(),
});

export const tokenUsageSchema = z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
});

export const llmGenerateTextOutputSchema = <TSchema extends z.ZodObject<z.ZodRawShape>>(
    outputSchema?: TSchema
) =>
    z.object({
        output: outputSchema || z.string(),
        usage: tokenUsageSchema,
        providerResponse: z.any().optional(),
    });

// export type LLMContext = z.infer<typeof llmContextSchema>;
export type LLMGenerateTextInput<
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = Omit<z.infer<typeof llmGenerateTextInputSchema>, "outputSchema"> & {
    outputSchema?: TOutputSchema;
};
/**
 * When no outputSchema is provided, TOutputSchema defaults to z.ZodObject<z.ZodRawShape>
 * and z.infer is Record<string, unknown>. In that case output is string.
 * When a specific schema is provided, output is the inferred object type only.
 */
export type InferGenerateTextOutput<TOutputSchema extends z.ZodObject<z.ZodRawShape>> =
    z.infer<TOutputSchema> extends Record<string, unknown>
        ? Record<string, unknown> extends z.infer<TOutputSchema>
            ? string
            : z.infer<TOutputSchema>
        : z.infer<TOutputSchema>;

export type LLMGenerateTextOutput<
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
    TGenerateProviderResponse = unknown,
> = Omit<
    z.infer<ReturnType<typeof llmGenerateTextOutputSchema<TOutputSchema>>>,
    "providerResponse" | "output"
> & {
    providerResponse?: TGenerateProviderResponse;
    output: InferGenerateTextOutput<TOutputSchema>;
};

export const generateTextOutputSchema = <TSchema extends z.ZodObject<z.ZodRawShape>>(
    outputSchema?: TSchema
) =>
    llmGenerateTextOutputSchema<TSchema>(outputSchema)
        .extend({
            evaluation: z.array(policyResultSchema),
        })
        .omit({ usage: true })
        .brand<"BantaiGenerateTextOutput">();

export type GenerateTextOutput<
    TGenerateProviderResponse = unknown,
    TOutput = string | Record<string, unknown>,
> = Omit<z.infer<typeof generateTextOutputSchema>, "output"> & {
    providerResponse?: TGenerateProviderResponse;
    output: TOutput;
};
