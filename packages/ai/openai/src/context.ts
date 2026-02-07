import { defineContext } from '@bantai-dev/core';
import { z } from 'zod';
import { estimateTokens } from './utils.js';

export const openAiSchema = z.object({
    llm: z.object({
        model: z.string(),
        maxTokens: z.number().optional(),
        sessionId: z.string(),
        input: z.object({
            prompt: z.string(),
            systemPrompt: z.string().optional(), 
        })
    })
});

export type OpenAiSchema = z.infer<typeof openAiSchema>;


export const openAiContext = defineContext(openAiSchema, {
    tools: {
        llm: {
            estimateTokens
        }
    }
});

