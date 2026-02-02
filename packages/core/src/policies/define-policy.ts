import { ContextDefinition } from "@/context/define-context.js";
import { RuleDefinition } from "@/rules/define-rule.js";
import z from "zod";
import { PolicyStrategy, policySchema } from "./schema.js";

type ExtractRuleName<T> = T extends RuleDefinition<infer _, infer N>
    ? N extends string
        ? N
        : never
    : T extends { name: infer N }
    ? N extends string
        ? N
        : never
    : never;

type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;

type RulesMap<TRules extends readonly RuleDefinition<ContextDefinition<z.ZodRawShape, Record<string, unknown>>, string>[]> = {
    [K in ExtractRuleName<TRules[number]>]: Extract<TRules[number], { name: K }>;
};

type Extract<T, U> = T extends U ? T : never;

type AnyRuleDefinition = RuleDefinition<ContextDefinition<z.ZodRawShape, Record<string, unknown>>, string>;

export type PolicyDefinition<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[]
> = Omit<z.infer<typeof policySchema>, 'name' | 'rules'> & {
    name: TName;
    rules: Map<string, TRules[number]> & {
        get<K extends ExtractRuleName<TRules[number]>>(key: K): RulesMap<TRules & readonly AnyRuleDefinition[]>[K] | undefined;
        has<K extends ExtractRuleName<TRules[number]>>(key: K): boolean;
    };
    context: TContext;
};

export function definePolicy<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[]
>(
    context: TContext,
    name: TName,
    rules: TRules,
    options: {
        defaultStrategy?: PolicyStrategy
    } = {
        defaultStrategy: 'preemptive'
    }
): PolicyDefinition<TContext, TName, TRules> {
    const rulesMap = new Map<string, TRules[number]>();
    for (const rule of rules) {
        if (rule && typeof rule === 'object' && 'name' in rule && 'evaluate' in rule) {
            rulesMap.set(rule.name, rule);
        }
    }
    const policy = policySchema.parse({
        name,
        rules: rulesMap,
        context,
        options:{
            defaultStrategy: options.defaultStrategy,
        }
    }) as PolicyDefinition<TContext, TName, TRules>;

    return policy;
}


