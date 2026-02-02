import { ContextDefinition, defineContext } from "@bantai-dev/core";
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
  
    return defineContext(mergedSchema, {
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
    }    ) as ContextDefinition<
      ExtractContextShape<TContext> & RateLimitShape,
      ExtractContextTools<TContext> & { 
        rateLimit: typeof rateLimit, 
        storage: RateLimitStorage,
      }
    >;
  };

  // const baseContext = defineContext(z.object({
  //   user: z.object({
  //     id: z.string(),
  //     name: z.string(),
  //     age: z.number().int().min(0),
  //   }),
  //   role: z.enum(['admin', 'user']),
  // }))

  // const storage = createMemoryStorage(rateLimit.storageSchema)

  // const ctx = withRateLimit(baseContext, {
  //   storage,
  // })

  // // Example: Rate limit rule using abstracted helper functions
  // const rule = defineRule(ctx, 'rate-limit-check', async (input, { tools }) => {
  //   // Check if rate limit configuration exists
  //   if (!input.rateLimit) {
  //     return deny({ reason: 'rate_limit_not_configured' });
  //   }

  //   // Only support fixed-window and sliding-window for now
  //   if (input.rateLimit.type !== 'fixed-window' && input.rateLimit.type !== 'sliding-window') {
  //     return deny({ reason: 'unsupported_rate_limit_type' });
  //   }

  //   // Use the abstracted checkRateLimit function
  //   const result = await tools.rateLimit.checkRateLimit(
  //     tools.storage,
  //     {
  //       type: input.rateLimit.type,
  //       key: input.rateLimit.key,
  //       limit: input.rateLimit.limit,
  //       windowMs: input.rateLimit.windowMs,
  //     }
  //   );

  //   // Return allow or deny based on the check result
  //   if (result.allowed) {
  //     return allow({ reason: result.reason });
  //   } else {
  //     return deny({ reason: result.reason });
  //   }
  // }, {
  //   // Increment counter when rule allows using the abstracted function
  //   onAllow: async (input, { tools }) => {
  //     if (!input.rateLimit) return;

  //     // Only increment for supported types
  //     if (input.rateLimit.type === 'fixed-window' || input.rateLimit.type === 'sliding-window') {
  //       // Use the abstracted incrementRateLimit function
  //       await tools.rateLimit.incrementRateLimit(
  //         tools.storage,
  //         {
  //           type: input.rateLimit.type,
  //           key: input.rateLimit.key,
  //           limit: input.rateLimit.limit,
  //           windowMs: input.rateLimit.windowMs,
  //         }
  //       );

  //       // Optional: log successful increment
  //       console.log(`Rate limit incremented for key: ${input.rateLimit.key}`);
  //     }
  //   },
  // })
  
