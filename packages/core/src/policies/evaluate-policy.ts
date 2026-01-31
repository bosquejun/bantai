import { ContextDefinition } from "@/context/define-context.js";
import z from "zod";
import { PolicyDefinition } from "./define-policy.js";
import { PolicyResult, PolicyStrategy, policyResultSchema } from "./schema.js";

type ExtractContextInput<TContext> = TContext extends ContextDefinition<infer S>
    ? S extends z.ZodRawShape
        ? z.infer<z.ZodObject<S>>
        : never
    : never;

type ExtractPolicyContext<TPolicy> = TPolicy extends { context: infer TContext }
    ? TContext extends ContextDefinition<z.ZodRawShape>
        ? ExtractContextInput<TContext>
        : never
    : never;

export async function evaluatePolicy<
    TContext extends ContextDefinition<z.ZodRawShape>,
    TPolicy extends PolicyDefinition<TContext, any, any>
>(
    policy: TPolicy,
    input: ExtractPolicyContext<TPolicy>,
    options?: {
        strategy?: PolicyStrategy
    } 
): Promise<PolicyResult> {
    const inputValue = policy.context.schema.parse({
        ...policy.context.defaultValues,
        ...input,
    })

    const violatedRules:PolicyResult['violatedRules'] = [];
    const strategy = options?.strategy || policy.options?.defaultStrategy || 'preemptive';

    const createResult = ({decision, reason}: Pick<PolicyResult, 'decision' | 'reason'>) => {
        return policyResultSchema.parse({
            decision,
            reason,
            violatedRules,
            strategy: strategy,
        });
    }
    
    
    for (const rule of policy.rules.values()) {
        const result = await rule.evaluate(inputValue);
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

