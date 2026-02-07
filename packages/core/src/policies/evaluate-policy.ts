import { AuditTool } from "src/audit/types.js";
import { auditEventSchema } from "src/index.js";
import { z } from "zod";
import { ContextDefinition } from "../context/define-context.js";
import { RuleDefinition } from "../rules/define-rule.js";
import { RuleResult, deny } from "../rules/results.js";
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
    const inputValue = policy.context.schema.parse(inputData) as z.infer<typeof policy.context.schema> & {
        audit?: Partial<Pick<z.infer<typeof auditEventSchema>, 'trace'>>
    }

    const ctx = { tools: policy.context.tools as { audit?:  AuditTool<TContext, TPolicy['name'], ExtractRuleFromPolicy<TPolicy>[]> } };

    const event = ctx.tools.audit?.createAuditPolicy(policy);

    event?.emit({
        type: "policy.start",
        trace: inputValue.audit?.trace,
    });

    const violatedRules:PolicyResult['violatedRules'] = [];
    const strategy = options?.strategy || policy.options?.defaultStrategy || 'preemptive';

    // Store all rule evaluation results (rule instance and result)
    type RuleType = ExtractRuleFromPolicy<TPolicy>;
    const evaluatedRules: Array<{ rule: RuleType; result: RuleResult }> = [];

    const createResult = ({decision, reason}: Pick<PolicyResult, 'decision' | 'reason'>) => {
        const result = policyResultSchema.parse({
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

        event?.emit({
            type: "policy.decision",
            decision: {
                outcome: decision,
                reason,
            },
            trace: inputValue.audit?.trace,
        });

        event?.emit({
            type: "policy.end",
            trace: inputValue.audit?.trace,
        });

        return result;
    }


    
    
    for (const rule of policy.rules.values()) {
        let result: RuleResult;

        event?.emit({
            type: "rule.start",
            rule: {
                name: rule.name,
            },
            trace: inputValue.audit?.trace,
        });

        try {
            result = await rule.evaluate(inputValue, ctx);
        } catch (error) {
            result = deny({ reason: 'rule_evaluation_error' });
        }


        event?.emit({
            type: "rule.decision",
            rule: {
                name: rule.name,
            },
            decision: {
                outcome: result.allowed ? result.skipped ? 'skip' : 'allow' : 'deny',
                reason: result.reason,
            },
            trace: inputValue.audit?.trace,
        });
        

        event?.emit({
            type: "rule.end",
            rule: {
                name: rule.name,
            },
            trace: inputValue.audit?.trace,
        });

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
