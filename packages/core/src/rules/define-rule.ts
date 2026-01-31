import { ContextDefinition } from "@/context/define-context.js";
import { z } from "zod";
import { RuleResult } from "./results.js";
import { ruleEvaluateFnSchema, ruleSchema } from "./schema.js";



type RuleEvaluateFnAsync<
  T extends z.ZodRawShape,
  TTools extends Record<string, unknown> = {}
> = (
  input: z.infer<z.ZodObject<T>>,
  context: { tools: TTools }
) => Promise<RuleResult>;

type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;
type ExtractTools<T> = T extends ContextDefinition<infer _, infer TTools> ? TTools : {};


// Implementation
export function defineRule<
  TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
  TName extends string = string
>(
  context: TContext,
  name: TName,
  evaluate: RuleEvaluateFnAsync<ExtractShape<TContext['schema']>, ExtractTools<TContext>>
): RuleDefinition<ExtractShape<TContext['schema']>, TName> {

    const evalFnSchema = ruleEvaluateFnSchema(context.schema)

    // Wrap the evaluate function to pass the context with tools
    const wrappedEvaluate = async (input: z.infer<z.ZodObject<ExtractShape<TContext['schema']>>>) => {
        return await evaluate(input, { tools: context.tools as ExtractTools<TContext> });
    };

    const rule = ruleSchema.parse({
        name,
        evaluate: evalFnSchema.implementAsync(wrappedEvaluate as unknown as Parameters<typeof evalFnSchema.implementAsync>[0])
    })

    return rule as RuleDefinition<ExtractShape<TContext['schema']>, TName>;
}


export type RuleDefinition<
  T extends z.ZodRawShape,
  TName extends string = string,
> = Omit<z.infer<typeof ruleSchema>, 'evaluate'> & {
    name: TName;
    evaluate: (input: z.infer<z.ZodObject<T>>) => Promise<RuleResult>;
};