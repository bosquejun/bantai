import {
    BantaiError,
    BantaiErrorType,
    ExtractPolicyContext,
    PolicyDefinition,
    PolicyResult,
    RuleDefinition,
    evaluatePolicy,
} from "@bantai-dev/core";
import { WithLLMContext } from "./context.js";
import { LLMProvider } from "./provider.js";
import { consumeTokenQuota } from "./rules/define-token-quota-rule.js";
import { LLMGenerateTextInput } from "./schema.js";

type BantaiLLMOptions<TContext extends WithLLMContext<TContext>> = {
    policies: readonly PolicyDefinition<TContext, string, RuleDefinition<TContext, string>[]>[];
    throwOnError?: boolean;
};

export type BantaiLLM<TContext extends WithLLMContext<TContext>> = Omit<
    LLMProvider<TContext>,
    "defaultModel" | "providerName"
>;

export function bantaiLLM<TContext extends WithLLMContext<TContext>>(
    provider: LLMProvider,
    options: BantaiLLMOptions<TContext>
): BantaiLLM<TContext> {
    const evaluation: {
        policy: PolicyDefinition<TContext, string, RuleDefinition<TContext, string>[]>;
        result: PolicyResult;
    }[] = [];
    return {
        generateText: async (input) => {
            const effectiveInput = {
                ...input,
                llm: {
                    ...input.llm,
                    model: input.llm.model || provider.defaultModel,
                },
            };

            for (const policy of options.policies) {
                type PolicyInput = ExtractPolicyContext<typeof policy> & {
                    llm: LLMGenerateTextInput;
                };

                const result = await evaluatePolicy(
                    policy as Parameters<typeof evaluatePolicy>[0],
                    effectiveInput as PolicyInput
                );

                if (result.decision === "deny") {
                    throw new BantaiError("Policy violation", BantaiErrorType.PolicyViolation, {
                        policyName: policy.name,
                    });
                }

                evaluation.push({
                    policy,
                    result,
                });
            }

            const response = await provider.generateText(effectiveInput);

            for (const { result, policy } of evaluation) {
                if (result.decision === "deny") {
                    continue;
                }
                for (const ruleResult of result.evaluatedRules) {
                    await consumeTokenQuota(response.usage, policy.context, ruleResult.result);
                }
            }

            return response;
        },
    };
}
