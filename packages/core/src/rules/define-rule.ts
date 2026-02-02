import { z } from "zod";
import { ContextDefinition } from "../context/define-context.js";
import { RuleResult } from "./results.js";
import { ruleEvaluateFnSchema, ruleHookFnSchema, ruleSchema } from "./schema.js";


export type RuleFnContextArgs<TTools extends Record<string, unknown> = {}> = {
  tools: TTools;
}

export type RuleEvaluateFnAsync<
  T extends z.ZodRawShape,
  TTools extends Record<string, unknown> = {}
> = (
  input: z.infer<z.ZodObject<T>>,
  context: RuleFnContextArgs<TTools>
) => Promise<RuleResult>;

export type RuleHookFnAsync<
  T extends z.ZodRawShape,
  TTools extends Record<string, unknown> = {}
> = (
  input: z.infer<z.ZodObject<T>>,
  context: RuleFnContextArgs<TTools>
) => Promise<void>;


type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;
type ExtractTools<T> = T extends ContextDefinition<infer _, infer TTools> ? TTools : {};


// Implementation
export function defineRule<
  TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
  TName extends string = string
>(
  context: TContext,
  name: TName,
  evaluate: RuleEvaluateFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>,
  hooks?:{
    onAllow?: RuleHookFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>;
    onDeny?: RuleHookFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>;
  }
): RuleDefinition<TContext, TName> {

    const evalFnSchema = ruleEvaluateFnSchema(context.schema)

    // Wrap the evaluate function to pass the context with tools
    const wrappedEvaluate = async (input: z.infer<z.ZodObject<ExtractShape<TContext['schema']>>>) => {
        return await evaluate(input, { tools: context.tools as ExtractTools<TContext> });
    };

    const hooksSchema = ruleHookFnSchema(context.schema);
    const wrappedHook = (hook: RuleHookFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>) => async (input: z.infer<z.ZodObject<ExtractShape<TContext['schema']>>>, context: { tools: ExtractTools<TContext> }) => {
        return await hook(input, context);
    };

    const rule = ruleSchema.parse({
        name,
        evaluate: evalFnSchema.implementAsync(wrappedEvaluate as unknown as Parameters<typeof evalFnSchema.implementAsync>[0]),
        hooks: {
          onAllow: hooks?.onAllow ? hooksSchema.implementAsync(wrappedHook(hooks.onAllow) as unknown as Parameters<typeof hooksSchema.implementAsync>[0]) : undefined,
          onDeny: hooks?.onDeny ? hooksSchema.implementAsync(wrappedHook(hooks.onDeny) as unknown as Parameters<typeof hooksSchema.implementAsync>[0]) : undefined,
        }
    })

    return rule as RuleDefinition<TContext, TName>;
}


export type RuleDefinition<
  TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
  TName extends string = string,
> = Omit<z.infer<typeof ruleSchema>, 'evaluate'> & {
    name: TName;
    evaluate: (input: z.infer<z.ZodObject<ExtractShape<TContext['schema']>>>) => Promise<RuleResult>;
    hooks: {
        onAllow?: RuleHookFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>;
        onDeny?: RuleHookFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>;
    };
};