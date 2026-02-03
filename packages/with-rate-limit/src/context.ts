import { defineContext, type ContextDefinition } from "@bantai-dev/core";
import ms from "ms";
import { z } from "zod";
import { rateLimit } from "./tools/rate-limit.js";

export const windowMsSchema = z.string().refine((value) => {
  const msWindow = ms(value as ms.StringValue);
  return !isNaN(msWindow) && msWindow > 0;
}, {
  message: "Invalid time window",
});

export const rateLimitSchema = z.object({
    rateLimit: z.object({
        key: z.string().optional(),
    }).and(z.discriminatedUnion('type', [
        z.object({
          type: z.literal('token-bucket'),
          capacity: z.number().int().min(0),
          refillRate: windowMsSchema,
        }),
        z.object({
          type: z.enum(['fixed-window', 'sliding-window']),
          limit: z.number().int().min(0),
          windowMs: windowMsSchema
        })
      ]))
});


export type RateLimitShape = typeof rateLimitSchema extends z.ZodObject<infer S> ? S : never;

export const rateLimitingContext = defineContext(rateLimitSchema, {
  tools: {
    rateLimit
  }
}) satisfies ContextDefinition<RateLimitShape>;

