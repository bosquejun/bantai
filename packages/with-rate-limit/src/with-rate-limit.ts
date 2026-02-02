import { ContextDefinition, allow, defineContext, defineRule } from "@bantai-dev/core";
import { z } from "zod";
import { RateLimitShape, rateLimitSchema } from "./context.js";
import { StorageAdapter, createMemoryStorage } from "./storage.js";
import { rateLimitStoreData } from "./tools/fixed-window.js";
import { rateLimit } from "./tools/rate-limit.js";

/**
 * Extracts the shape type from a context
 */
type ExtractContextShape<TContext> = TContext extends ContextDefinition<
  infer S,
  Record<string, unknown>
>
  ? S
  : never;

/**
 * Extracts the tools type from a context
 */
type ExtractContextTools<TContext> = TContext extends ContextDefinition<
  z.ZodRawShape,
  infer TTools
>
  ? TTools
  : Record<string, unknown>;

  export type DefaultRateLimitValues =  Partial<z.infer<typeof rateLimitSchema['shape']['rateLimit']>>


  type WithRateLimitOptions = {
    defaultValues?: DefaultRateLimitValues;
    storage?: StorageAdapter<z.infer<typeof rateLimitStoreData>>;
  }

  /**
   * Extends a context with rate limiting capabilities.
   * Merges the context's shape with the rate limit schema and merges tools.
   */
  export const withRateLimit = <
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>
  >(
    context: TContext,
    options: WithRateLimitOptions = {
    }
  ): ContextDefinition<
    ExtractContextShape<TContext> & RateLimitShape,
    ExtractContextTools<TContext> & { rateLimit: typeof rateLimit, storage: StorageAdapter<z.infer<typeof rateLimitStoreData>> }
  > => {
    // Merge the schemas at runtime
    const mergedSchema = context.schema.extend(rateLimitSchema.shape);
  
    return defineContext(mergedSchema, {
      tools: {
        ...context.tools,
        rateLimit,
        storage: options.storage || createMemoryStorage(rateLimitStoreData),
      },
      defaultValues: {
        ...context.defaultValues,
        rateLimit:{
            ...options.defaultValues,
        }
      }
    }) as ContextDefinition<
      ExtractContextShape<TContext> & RateLimitShape,
      ExtractContextTools<TContext> & { rateLimit: typeof rateLimit, storage: StorageAdapter<z.infer<typeof rateLimitStoreData>> }
    >;
  };

  const baseContext = defineContext(z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      age: z.number().int().min(0),
    }),
    role: z.enum(['admin', 'user']),
  }))

  const ctx = withRateLimit(baseContext, {
    storage: createMemoryStorage(rateLimitStoreData),
  })

  const rule = defineRule(ctx, 'rate-limit-check', async (input, {
    tools
  }) => {
    tools.storage
    return allow();
  }, {
    onAllow: async (input, {tools}) => {
        tools.rateLimit
    },
    onDeny: async (input, {tools}) => {
        tools.rateLimit
    }
  })