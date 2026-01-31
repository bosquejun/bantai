import { ContextDefinition } from "@/context/define-context.js";
import { z } from "zod";
import { RuleResult } from "./results.js";
import { ruleEvaluateFnSchema, ruleSchema } from "./schema.js";



type RuleEvaluateFnAsync<T extends z.ZodRawShape> = (
  input: z.infer<z.ZodObject<T>>
) => Promise<RuleResult>;

type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;


// Implementation
export function defineRule<
  TContext extends ContextDefinition<any>,
  TName extends string
>(
  context: TContext,
  name: TName,
  evaluate:  RuleEvaluateFnAsync<ExtractShape<TContext['schema']>>
): RuleDefinition<ExtractShape<TContext['schema']>, TName> {

    const evalFnSchema = ruleEvaluateFnSchema(context.schema)

    const rule = ruleSchema.parse({
        name,
        evaluate: evalFnSchema.implementAsync(evaluate as unknown as Parameters<typeof evalFnSchema.implementAsync>[0])
    })

    return rule as RuleDefinition<ExtractShape<TContext['schema']>, TName>;
}


export type RuleDefinition<
  T extends z.ZodRawShape,
  TName extends string = string
> = Omit<z.infer<typeof ruleSchema>, 'evaluate'> & {
    name: TName;
    evaluate:RuleEvaluateFnAsync<T>
};