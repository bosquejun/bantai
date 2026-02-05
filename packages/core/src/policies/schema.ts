
import { z } from "zod";
import { contextSchema } from "../context/schema.js";
import { ruleResultSchema, ruleSchema } from "../rules/schema.js";


export const policyStrategySchema = z.enum(['preemptive', 'exhaustive']);

export const policySchema = z.object({
    name: z.string(),
    rules: z.map(z.string(),ruleSchema),
    options: z.object({
        defaultStrategy: policyStrategySchema,
    }),
    context: contextSchema,
}).brand<'BantaiPolicy'>();


export type PolicyStrategy = z.infer<typeof policyStrategySchema>;

export const policyResultSchema = z.object({
    decision: z.enum(['allow', 'deny']),
    isAllowed: z.boolean(),
    reason: z.enum(['policy_violated', 'policy_enforced']),
    violatedRules: z.array(z.object({
        name: z.string(),
        result: ruleResultSchema,
    })),
    evaluatedRules: z.array(z.object({
        rule: ruleSchema,
        result: ruleResultSchema,
    })),
    strategy: policyStrategySchema,
}).brand<'BantaiPolicyResult'>();

export type PolicyResult = z.infer<typeof policyResultSchema>;