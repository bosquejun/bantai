import { ContextDefinition, defineContext, ExtractContextShape, ExtractContextTools } from "@bantai-dev/core";
import { withStorage } from "@bantai-dev/with-storage";
import { z } from "zod";
import { rateLimitSchema, RateLimitShape } from "./context.js";
import { rateLimit, RateLimitStorage } from "./tools/rate-limit.js";


  export type DefaultRateLimitValues =  Partial<z.infer<typeof rateLimitSchema['shape']['rateLimit']>>

  /**
   * Helper type that infers the merged context shape with rate limit schema
   */
  type WithRateLimitShape<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = 
    ExtractContextShape<TContext> & Partial<RateLimitShape>;

    type RateLimitTools<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = typeof rateLimit & { generateKey?: (input: ExtractContextShape<TContext>) => string }

  /**
   * Helper type that infers the merged context tools with rate limit tools
   */
  type WithRateLimitTools<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = 
    ExtractContextTools<TContext> & { 
      rateLimit: RateLimitTools<TContext>, 
      storage: RateLimitStorage,
    };

  /**
   * Return type for withRateLimit that properly infers the merged context
   */
  export type WithRateLimitReturnType<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>
  > = ContextDefinition<
    WithRateLimitShape<TContext>,
    WithRateLimitTools<TContext>
  >;

  type WithRateLimitOptions<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = {
    defaultValues?: DefaultRateLimitValues;
    storage?: RateLimitStorage;
    generateKey?: (input: ExtractContextShape<TContext>) => string;
  }

  /**
   * Extends a context with rate limiting capabilities.
   * Merges the context's shape with the rate limit schema and merges tools.
   */
  export const withRateLimit = <
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>
  >(
    context: TContext,
    options: WithRateLimitOptions<TContext> = {
    }
  ): WithRateLimitReturnType<TContext> => {
    // Merge the schemas at runtime
    const mergedSchema = context.schema.extend(rateLimitSchema.partial().shape as z.ZodRawShape);

    const defaultValues = {
      ...context.defaultValues,
      ...(Boolean(options.defaultValues) && {
        rateLimit:{
          ...(options.defaultValues || {}),
        }
      })
    }

    const tools = {
      ...context.tools,
      rateLimit: {
        ...rateLimit,
        generateKey: options.generateKey,
      },
      // Users should provide their own storage implementation
      // For development/testing, they can use a simple in-memory storage
      storage: options.storage,
    }
  
    return withStorage(defineContext(mergedSchema, {
      tools,
      defaultValues
    }), options.storage) as WithRateLimitReturnType<TContext>;
  };


  /**
   * Type alias for a context extended with rate limiting capabilities
   */
  export type WithRateLimitContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>
  > = WithRateLimitReturnType<TContext>;