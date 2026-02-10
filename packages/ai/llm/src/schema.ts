import { z } from "zod";

export const llmInputObjectSchema = z.object({
    role: z.enum(["user", "system", "assistant"]),
    content: z.string(),
});

// export const llmContextSchema = z.object({
//     model: z.string().optional(),
//     prompt: z.string().or(z.array(llmInputObjectSchema)),
//     maxTokens: z.number().default(512).optional(),
// });

export const llmGenerateTextInputSchema = z.object({
    model: z.string().optional(),
    prompt: z.string().or(z.array(llmInputObjectSchema)),
    maxTokens: z.number().default(512).optional(),
});

export const llmGenerateTextOutputSchema = z.object({
    text: z.string(),
    usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
    }),
    providerResponse: z.any().optional(),
});

// export type LLMContext = z.infer<typeof llmContextSchema>;
export type LLMGenerateTextInput = z.infer<typeof llmGenerateTextInputSchema>;
export type LLMGenerateTextOutput = z.infer<typeof llmGenerateTextOutputSchema>;
