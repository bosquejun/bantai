import { ContextDefinition, defineContext } from "@bantai-dev/core";
import { withStorage } from "@bantai-dev/with-storage";
import { z } from "zod";
import { RateLimitShape, rateLimitSchema } from "./context.js";
import { RateLimitStorage, rateLimit } from "./tools/rate-limit.js";

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
    storage?: RateLimitStorage;
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
    ExtractContextTools<TContext> & { 
      rateLimit: typeof rateLimit, 
      storage: RateLimitStorage,
    }
  > => {
    // Merge the schemas at runtime
    const mergedSchema = context.schema.extend(rateLimitSchema.shape);
  
    return withStorage(defineContext(mergedSchema, {
      tools: {
        ...context.tools,
        rateLimit,
        // Users should provide their own storage implementation
        // For development/testing, they can use a simple in-memory storage
        storage: options.storage,
      },
      defaultValues: {
        ...context.defaultValues,
        ...options.defaultValues && {
          rateLimit:{
            ...options.defaultValues,
          }
        }
      }
    }), options.storage) as ContextDefinition<
      ExtractContextShape<TContext> & RateLimitShape,
      ExtractContextTools<TContext> & { 
        rateLimit: typeof rateLimit, 
        storage: RateLimitStorage,
      }
    >;
  };

  