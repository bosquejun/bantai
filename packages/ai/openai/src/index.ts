import { z } from 'zod';

export const openAiSchema = z.object({
    llm: z.object({
        model: z.string(),
        maxTokens: z.number().optional(),
        prompt: z.string(),
        sessionId: z.string()
    })
});

export type OpenAiSchema = z.infer<typeof openAiSchema>;
