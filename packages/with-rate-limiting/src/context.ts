import { defineContext, type ContextDefinition } from "@bantai-dev/core";
import ms from "ms";
import { z } from "zod";

const windowMsSchema = z.string().refine((value) => {
  const msWindow = ms(value as ms.StringValue);
  return !isNaN(msWindow) && msWindow > 0;
}, {
  message: "Invalid time window",
});

const rateLimitSchema = z.object({
    rateLimit: z.object({
        key: z.string(),
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


type RateLimitShape = typeof rateLimitSchema extends z.ZodObject<infer S> ? S : never;

export const rateLimitingContext = defineContext(rateLimitSchema) satisfies ContextDefinition<RateLimitShape>;
