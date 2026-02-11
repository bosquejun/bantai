import {
    ContextDefinition,
    defineContext,
    ExtractContextShape,
    ExtractContextTools,
} from "@bantai-dev/core";
import {
    RateLimitStorage,
    withRateLimit,
    type WithRateLimitContext,
} from "@bantai-dev/with-rate-limit";
import { z } from "zod";
import { LLMGenerateTextInput, llmGenerateTextInputSchema } from "./schema.js";
import { tokenUsageEstimator } from "./tools/token-usage-estimator.js";

/**
 * Extract the shape type from openAiContextSchema
 */
export type LLMContextShape =
    typeof llmGenerateTextInputSchema extends z.ZodObject<infer S> ? S : never;

/**
 * Helper type that infers the merged context shape with LLM schema.
 *
 * Important: this represents the Zod *shape* used by `defineContext`, so each
 * property value must be a Zod type. The `llm` field itself is a ZodObject
 * whose internal fields are optional (because of `.partial()`), not an object
 * of plain values.
 */
export type WithLLMShape<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = ExtractContextShape<TContext> & {
    llm: z.ZodOptional<z.ZodObject<LLMContextShape>>;
};

/**
 * Helper type for the intermediate context (with LLM shape but before rate limit)
 */
export type WithLLMBaseContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = ContextDefinition<
    WithLLMShape<TContext>,
    ExtractContextTools<TContext> & {
        llm: {
            tokenUsageEstimator: TokenUsageEstimator;
        };
    }
>;

export type TokenUsageEstimator = (prompt: LLMGenerateTextInput["prompt"]) => Promise<number>;

/**
 * Options for withLLMContext
 */
type WithLLMOptions = {
    storage?: RateLimitStorage;
    tokenUsageEstimator?: TokenUsageEstimator;
};

/**
 * Extends a context with LLM capabilities
 */
export function withLLMContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
>(context: TContext, options: WithLLMOptions = {}): WithLLMContext<TContext> {
    const mergedSchema = context.schema.extend({
        llm: llmGenerateTextInputSchema.partial().optional(),
    });

    const tools = {
        ...context.tools,
        llm: {
            tokenUsageEstimator: options.tokenUsageEstimator || tokenUsageEstimator,
        },
    };

    const ctx = defineContext(mergedSchema, {
        defaultValues: context.defaultValues,
        tools,
    });

    const extendedContext = withRateLimit(ctx, {
        storage: options.storage,
    });

    return extendedContext as unknown as WithLLMContext<TContext>;
}

/**
 * Type alias for a context extended with LLM capabilities
 * The LLM schema is properly inferred as part of the context shape
 * This ensures that ExtractContextShape<WithLLMContext<TContext>> includes the 'llm' property
 *
 */
export type WithLLMContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>> = any,
> = WithRateLimitContext<WithLLMBaseContext<TContext>>;
