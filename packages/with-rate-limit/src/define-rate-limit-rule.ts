import { ContextDefinition, ExtractContextShape, ExtractContextTools, defineRule, deny, type RuleDefinition, type RuleResult } from "@bantai-dev/core";
import { z } from "zod";
import { RateLimitShape, rateLimitSchema } from "./context.js";
import { RateLimitCheckResult } from "./index.js";
import { type RateLimitConfig } from "./tools/rate-limit-helpers.js";
import { RateLimitStorage, rateLimit } from "./tools/rate-limit.js";

/**
 * Type for rule evaluation functions
 */
type RuleEvaluateFnAsync<
  T extends z.ZodRawShape,
  TTools extends Record<string, unknown> = {}
> = (
  input: z.infer<z.ZodObject<T>> & {currentLimit: RateLimitCheckResult},
  context: {
    tools: TTools;
  }
) => Promise<RuleResult>;

/**
 * Type for rule hook functions
 */
type RuleHookFnAsync<
  T extends z.ZodRawShape,
  TTools extends Record<string, unknown> = {}
> = (
  result: RuleResult,
  input: z.infer<z.ZodObject<T>>,
  context: {
    tools: TTools;
  }
) => Promise<void>;

/**
 * Helper type to extract rate limit tools from a context
 */
type ExtractRateLimitTools<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = 
  ExtractContextTools<TContext>;

/**
 * Helper type to extract rate limit input from context shape
 * This ensures rateLimit is available on the input
 */
type ExtractRateLimitInput<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> = 
  TContext['schema'] extends z.ZodObject<infer TShape> 
    ? z.infer<z.ZodObject<TShape & RateLimitShape>> & {
        rateLimit: Partial<z.infer<z.ZodObject<RateLimitShape>>['rateLimit']>;
    }
    : never;

/**
 * Options for defining a rate limit rule
 */
type DefineRateLimitRuleOptions<TContext> = {
  /**
   * Optional hook to run when the rule allows the request.
   * This will be called after the rate limit is incremented.
   */
  onAllow?: RuleHookFnAsync<ExtractContextShape<TContext>, ExtractContextTools<TContext>>;
  /**
   * Optional hook to run when the rule denies the request.
   */
  onDeny?: RuleHookFnAsync<ExtractContextShape<TContext>, ExtractContextTools<TContext>>;
config: Partial<z.infer<typeof rateLimitSchema>['rateLimit']>
};

/**
 * Wrapper around defineRule that automatically handles rate limit checking and incrementing.
 * 
 * This function:
 * 1. Checks the rate limit before evaluating the user's rule
 * 2. If rate limit is exceeded, returns deny immediately
 * 3. If rate limit passes, evaluates the user's rule
 * 4. On allow, automatically increments the rate limit counter
 * 
 * @param context - A context extended with rate limiting capabilities via withRateLimit
 * @param name - Unique name for the rule
 * @param evaluate - User's rule evaluation function
 * @param options - Optional hooks (onAllow, onDeny)
 * @returns A rule definition with rate limiting built-in
 */
export const defineRateLimitRule = <
  TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
  TName extends string = string
>(
  context: TContext,
  name: TName,
  evaluate: RuleEvaluateFnAsync<ExtractContextShape<TContext>, ExtractContextTools<TContext>>,
  options: DefineRateLimitRuleOptions<TContext>
): RuleDefinition<TContext, TName> => {
if(!context.tools.rateLimit || !context.tools.storage) {
  throw new Error('Rate limit and storage are required. Please use the withRateLimit function to extend the context with rate limit capabilities.');
}
  return defineRule(
    context,
    name,
    async (input, ctx) => {
      // Type-safe access to rate limit tools and input
      const tools = ctx.tools as unknown as ExtractRateLimitTools<TContext> & {
        rateLimit: typeof rateLimit & { generateKey?: (input: ExtractContextShape<TContext>) => string };
        storage: RateLimitStorage;
      };
      const typedInput = input as ExtractRateLimitInput<TContext>;


      const key = `rules:${name}:${typedInput?.rateLimit?.key || tools.rateLimit.generateKey?.(input as unknown as ExtractContextShape<TContext>) || `unknown-key`}`;
      const rateLimitConfig ={
        ...typedInput.rateLimit,
        ...options.config,
        key,
      }  as RateLimitConfig

      // Check rate limit for all supported types (fixed-window, sliding-window, token-bucket)
      let rateLimitResult = await tools.rateLimit.checkRateLimit(
        tools.storage,
        rateLimitConfig
      );

      // If rate limit is exceeded, deny immediately
      if (!rateLimitResult.allowed) {
        return deny({ reason: rateLimitResult.reason || 'Rate limit exceeded' });
      }

      // Rate limit passed (or not applicable), evaluate the user's rule
      return await evaluate({...typedInput, currentLimit: rateLimitResult} as z.infer<z.ZodObject<ExtractContextShape<TContext>>> & {currentLimit: RateLimitCheckResult}, ctx);
    },
    {
      onAllow: async (result, input, ctx) => {
        // Type-safe access to rate limit tools and input
        const tools = ctx.tools as unknown as ExtractRateLimitTools<TContext> & {
          rateLimit: typeof rateLimit & { generateKey?: (input: ExtractContextShape<TContext>) => string };
          storage: RateLimitStorage;
        };

        const typedInput = input as ExtractRateLimitInput<TContext>;

        const key = `rules:${name}:${typedInput?.rateLimit?.key || tools.rateLimit.generateKey?.(input as unknown as ExtractContextShape<TContext>) || `unknown-key`}`;

        const rateLimitConfig ={
          ...typedInput.rateLimit,
          ...options.config,
          key
        }  as RateLimitConfig;

       // Increment rate limit counter when rule allows
       await tools.rateLimit.incrementRateLimit(
        tools.storage,
        rateLimitConfig
      );
        // Call user's onAllow hook if provided
        if (options?.onAllow) {
          await options.onAllow(result, typedInput as z.infer<z.ZodObject<ExtractContextShape<TContext>>>, ctx);
        }
      },
      onDeny: options?.onDeny
        ? async (result, input, ctx) => {
            const typedInput = input as z.infer<z.ZodObject<ExtractContextShape<TContext>>>;
            await options.onDeny!(result, typedInput, ctx);
          }
        : undefined,
    }
  );
};
