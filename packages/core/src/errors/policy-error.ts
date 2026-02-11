import z from "zod";
import { ContextDefinition, PolicyDefinition, PolicyResult, RuleDefinition } from "../index.js";
import { BantaiError, BantaiErrorType } from "./bantai-error.js";

export class PolicyViolationError<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
> extends BantaiError {
    policy: PolicyDefinition<TContext, TName, TRules>;
    result: PolicyResult;

    constructor(
        policy: PolicyDefinition<TContext, TName, TRules>,
        result: PolicyResult,
        errorMessage = "Policy violated error"
    ) {
        super(errorMessage, BantaiErrorType.PolicyViolation, {
            policyName: policy.name,
            timestamp: Date.now(),
            additionalInfo: {
                result,
            },
        });
        this.policy = policy;
        this.result = result;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            result: this.result,
        };
    }

    prettify() {
        return `[Policy] ${this.policy.name} violated: ${this.result.reason}\n
        ${this.result.violatedRules.map((rule) => `- ${rule.name}: ${rule.result.reason}`).join("\n")}
        \n\n
        `;
    }

    prettyPrint() {
        throw new Error(this.prettify());
    }

    static isPolicyViolationError<T extends PolicyViolationError<any, any, any>>(
        error: unknown
    ): error is T {
        return error instanceof PolicyViolationError;
    }
}

export function throwPolicyViolationErrorOnDeny<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
>(
    result: PolicyResult,
    policy: PolicyDefinition<TContext, TName, TRules>,
    errorMessage = "Policy violated error"
) {
    if (result.decision === "allow") return;
    throw new PolicyViolationError(policy, result, errorMessage);
}
