import { normalizeId } from "@bantai-dev/shared";
import { z } from "zod";
import { ContextDefinition } from "../context/define-context.js";
import { RuleResult } from "./results.js";
import { ruleEvaluateFnSchema, ruleHookFnSchema, ruleSchema } from "./schema.js";

export type RuleEvalContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = {
    tools: ExtractTools<TContext>;
    ruleRef?: RuleDefinition<TContext, string>;
};

export type RuleEvaluateFnAsync<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = (
    input: z.infer<z.ZodObject<ExtractShape<TContext["schema"]>>>,
    context: RuleEvalContext<TContext>
) => Promise<RuleResult>;

export type RuleHookFnAsync<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = (
    result: RuleResult,
    input: z.infer<z.ZodObject<ExtractShape<TContext["schema"]>>>,
    context: RuleEvalContext<TContext>
) => Promise<void>;

type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;
export type ExtractTools<T> = T extends ContextDefinition<infer _, infer TTools> ? TTools : {};

// Implementation
export function defineRule<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string = string,
>(
    context: TContext,
    name: TName,
    evaluate: RuleEvaluateFnAsync<TContext>,
    hooks?: {
        onAllow?: RuleHookFnAsync<TContext>;
        onDeny?: RuleHookFnAsync<TContext>;
    }
): RuleDefinition<TContext, TName> {
    const evalFnSchema = ruleEvaluateFnSchema(context.schema);

    // Wrap the evaluate function to pass the context with tools
    const wrappedEvaluate = async (
        input: z.infer<z.ZodObject<ExtractShape<TContext["schema"]>>>,
        context: RuleEvalContext<TContext>
    ) => {
        return await evaluate(input, context);
    };

    const hooksSchema = ruleHookFnSchema(context.schema);
    const wrappedHook =
        (hook: RuleHookFnAsync<TContext>) =>
        async (
            result: RuleResult,
            input: z.infer<z.ZodObject<ExtractShape<TContext["schema"]>>>,
            context: RuleEvalContext<TContext>
        ) => {
            return await hook(result, input, context);
        };

    const rule = ruleSchema.parse({
        name,
        id: `rule:${normalizeId(name)}`,
        evaluate: evalFnSchema.implementAsync(
            wrappedEvaluate as unknown as Parameters<typeof evalFnSchema.implementAsync>[0]
        ),
        hooks: {
            onAllow: hooks?.onAllow
                ? hooksSchema.implementAsync(
                      wrappedHook(hooks.onAllow) as unknown as Parameters<
                          typeof hooksSchema.implementAsync
                      >[0]
                  )
                : undefined,
            onDeny: hooks?.onDeny
                ? hooksSchema.implementAsync(
                      wrappedHook(hooks.onDeny) as unknown as Parameters<
                          typeof hooksSchema.implementAsync
                      >[0]
                  )
                : undefined,
        },
    });

    return rule as RuleDefinition<TContext, TName>;
}

export type RuleDefinition<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string = string,
> = Omit<z.infer<typeof ruleSchema>, "evaluate"> & {
    name: TName;
    evaluate: (
        input: z.infer<z.ZodObject<ExtractShape<TContext["schema"]>>>,
        context: RuleEvalContext<TContext>
    ) => Promise<RuleResult>;
    hooks: {
        onAllow?: RuleHookFnAsync<TContext>;
        onDeny?: RuleHookFnAsync<TContext>;
    };
};
