import { z } from "zod";
import { ContextDefinition } from "../context/define-context.js";
import { RuleDefinition } from "../rules/define-rule.js";
import { RuleResult } from "../rules/results.js";
import { ruleSchema } from "../rules/schema.js";
import { PolicyDefinition } from "./define-policy.js";
import { PolicyResult, PolicyStrategy, policyResultSchema } from "./schema.js";

type ExtractContextInput<TContext> = TContext extends ContextDefinition<infer S>
    ? S extends z.ZodRawShape
        ? z.infer<z.ZodObject<S>>
        : never
    : never;

type ExtractPolicyContext<TPolicy> = TPolicy extends { context: infer TContext }
    ? TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>
        ? ExtractContextInput<TContext>
        : never
    : never;

type ExtractRuleFromPolicy<TPolicy> = TPolicy extends PolicyDefinition<infer TContext, any, any>
    ? TPolicy['rules'] extends Map<string, infer R>
        ? R extends RuleDefinition<TContext, string>
            ? R
            : never
        : never
    : never;

export async function evaluatePolicy<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TPolicy extends PolicyDefinition<TContext, any, any>
>(
    policy: TPolicy,
    input: ExtractPolicyContext<TPolicy>,
    options?: {
        strategy?: PolicyStrategy
    } 
): Promise<PolicyResult> {
    const inputData = {
        ...(policy.context.defaultValues || {}),
        ...input,
    }
    const inputValue = policy.context.schema.parse(inputData)

    const violatedRules:PolicyResult['violatedRules'] = [];
    const strategy = options?.strategy || policy.options?.defaultStrategy || 'preemptive';

    // Store all rule evaluation results (rule instance and result)
    type RuleType = ExtractRuleFromPolicy<TPolicy>;
    const evaluatedRules: Array<{ rule: RuleType; result: RuleResult }> = [];

    const createResult = ({decision, reason}: Pick<PolicyResult, 'decision' | 'reason'>) => {
        return policyResultSchema.parse({
            decision,
            isAllowed: decision === 'allow',
            reason,
            violatedRules,
            evaluatedRules: evaluatedRules.map(({ rule, result }) => ({
                rule: rule as z.infer<typeof ruleSchema>,
                result,
            })),
            strategy: strategy,
        });
    }


    const ctx = { tools: policy.context.tools };
    
    
    for (const rule of policy.rules.values()) {
        const result = await rule.evaluate(inputValue, ctx);
        
        // Always collect all rules and their results
        evaluatedRules.push({ rule, result });
        
        // For preemptive strategy, trigger hooks immediately
        if (strategy === 'preemptive') {
            if (result.allowed && !result.skipped && rule.hooks?.onAllow) {
                await rule.hooks.onAllow(result, inputValue, ctx);
            } else if (!result.allowed && !result.skipped && rule.hooks?.onDeny) {
                await rule.hooks.onDeny(result, inputValue, ctx);
            }
        }
        
        if(!result.allowed){
            violatedRules.push({    
                name: rule.name,
                result,
            });

            if(strategy === 'preemptive'){
                return createResult({
                    decision:'deny',
                    reason:'policy_violated',
                });
            }
        }
    }

    // Determine final decision
    const finalDecision = violatedRules.length === 0 ? 'allow' : 'deny';
    
    // For non-preemptive strategies, trigger hooks based on final decision
    if (strategy !== 'preemptive') {
        for (const { rule, result } of evaluatedRules) {
            if (finalDecision === 'allow' && result.allowed && !result.skipped && rule.hooks?.onAllow) {
                await rule.hooks.onAllow(result, inputValue, ctx);
            } else if (finalDecision === 'deny' && !result.allowed && !result.skipped && rule.hooks?.onDeny) {
                await rule.hooks.onDeny(result, inputValue, ctx);
            }
        }
    }

    if(violatedRules.length === 0){
        return createResult({
            decision:'allow',
            reason:'policy_enforced',
        });
    }

    return createResult({
        decision:'deny',
        reason:'policy_violated',
    });
}


export type { PolicyResult };
