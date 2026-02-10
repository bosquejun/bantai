import { generateId } from "@bantai-dev/shared";
import { z } from "zod";
import { auditPolicyMetaSchema } from "../audit/schema.js";
import { AuditEvent, AuditTool } from "../audit/types.js";
import { ContextDefinition } from "../context/define-context.js";
import { ExtractTools, RuleDefinition, RuleEvalContext } from "../rules/define-rule.js";
import { RuleResult, deny } from "../rules/results.js";
import { ruleSchema } from "../rules/schema.js";
import { PolicyDefinition } from "./define-policy.js";
import { PolicyResult, PolicyStrategy, policyResultSchema } from "./schema.js";

type ExtractContextInput<TContext> =
    TContext extends ContextDefinition<infer S>
        ? S extends z.ZodRawShape
            ? z.infer<z.ZodObject<S>>
            : never
        : never;

export async function evaluatePolicy<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
>(
    policy: PolicyDefinition<TContext, TName, TRules>,
    input: ExtractContextInput<TContext>,
    options?: {
        strategy?: PolicyStrategy;
    }
): Promise<PolicyResult> {
    const inputData = {
        ...(policy.context.defaultValues || {}),
        ...input,
    };

    const evaluationId = generateId("eval");

    const inputValue = policy.context.schema.parse(inputData) as z.infer<
        typeof policy.context.schema
    > & {
        audit?: Partial<Pick<AuditEvent, "trace">>;
    };

    const ctx: RuleEvalContext<TContext> = {
        tools: policy.context.tools as unknown as ExtractTools<TContext>,
    };

    const auditTool = (policy.context.tools as { audit?: AuditTool<TContext, TName, TRules> })
        .audit;
    const event = auditTool?.createAuditEvent(policy, evaluationId);

    const violatedRules: PolicyResult["violatedRules"] = [];
    const strategy = options?.strategy || policy.options?.defaultStrategy || "preemptive";

    const evalPolicyMeta = auditPolicyMetaSchema.parse({
        strategy,
    });

    const policyStartTimestamp = Date.now();

    const policyStartEventId = event?.emit({
        type: "policy.start",
        trace: inputValue.audit?.trace,
        meta: evalPolicyMeta,
    });

    // Store all rule evaluation results (rule instance and result)
    type RuleType = TRules[number];
    const evaluatedRules: Array<{ rule: RuleType; result: RuleResult }> = [];

    const createResult = ({ decision, reason }: Pick<PolicyResult, "decision" | "reason">) => {
        const result = policyResultSchema.parse({
            decision,
            isAllowed: decision === "allow",
            reason,
            violatedRules,
            evaluatedRules: evaluatedRules.map(({ rule, result }) => ({
                rule: rule as z.infer<typeof ruleSchema>,
                result,
            })),
            evaluationId,
            strategy: strategy,
        });

        event?.emit({
            type: "policy.decision",
            decision: {
                outcome: result.isAllowed ? "allow" : "deny",
                reason: result.reason,
            },
            trace: inputValue.audit?.trace,
            meta: evalPolicyMeta,
            parentId: policyStartEventId,
        });

        event?.emit({
            type: "policy.end",
            trace: inputValue.audit?.trace,
            durationMs: Date.now() - policyStartTimestamp,
            meta: evalPolicyMeta,
            parentId: policyStartEventId,
        });

        return result;
    };

    for (const rule of policy.rules.values()) {
        let result: RuleResult;
        const ruleStartTimestamp = Date.now();
        ctx.ruleRef = rule;

        const ruleData = {
            name: rule.name,
            id: rule.id,
            version: rule.version,
        };

        const ruleStartEventId = event?.emit({
            type: "rule.start",
            rule: ruleData,
            trace: inputValue.audit?.trace,
            parentId: policyStartEventId,
        });

        try {
            const ruleInput = inputValue as Parameters<typeof rule.evaluate>[0];
            result = await rule.evaluate(ruleInput, ctx);
        } catch (error: unknown) {
            result = deny({ reason: "rule_evaluation_error" });
        }

        event?.emit({
            type: "rule.decision",
            rule: ruleData,
            decision: {
                outcome: result.allowed ? (result.skipped ? "skip" : "allow") : "deny",
                reason: result.reason,
            },
            trace: inputValue.audit?.trace,
            parentId: ruleStartEventId,
        });

        event?.emit({
            type: "rule.end",
            rule: ruleData,
            trace: inputValue.audit?.trace,
            durationMs: Date.now() - ruleStartTimestamp,
            parentId: ruleStartEventId,
        });

        // Always collect all rules and their results
        evaluatedRules.push({ rule, result });

        // For preemptive strategy, trigger hooks immediately
        if (strategy === "preemptive") {
            if (result.allowed && !result.skipped && rule.hooks?.onAllow) {
                const onAllow = rule.hooks.onAllow;
                const hookInput = inputValue as Parameters<typeof onAllow>[1];
                await onAllow(result, hookInput, ctx);
            } else if (!result.allowed && !result.skipped && rule.hooks?.onDeny) {
                const onDeny = rule.hooks.onDeny;
                const hookInput = inputValue as Parameters<typeof onDeny>[1];
                await onDeny(result, hookInput, ctx);
            }
        }

        if (!result.allowed) {
            violatedRules.push({
                name: rule.name,
                result,
            });

            if (strategy === "preemptive") {
                return createResult({
                    decision: "deny",
                    reason: "policy_violated",
                });
            }
        }
    }

    // Determine final decision
    const finalDecision = violatedRules.length === 0 ? "allow" : "deny";

    // For non-preemptive strategies, trigger hooks based on final decision
    if (strategy !== "preemptive") {
        for (const { rule, result } of evaluatedRules) {
            if (
                finalDecision === "allow" &&
                result.allowed &&
                !result.skipped &&
                rule.hooks?.onAllow
            ) {
                const onAllow = rule.hooks.onAllow;
                const hookInput = inputValue as Parameters<typeof onAllow>[1];
                await onAllow(result, hookInput, ctx);
            } else if (
                finalDecision === "deny" &&
                !result.allowed &&
                !result.skipped &&
                rule.hooks?.onDeny
            ) {
                const onDeny = rule.hooks.onDeny;
                const hookInput = inputValue as Parameters<typeof onDeny>[1];
                await onDeny(result, hookInput, ctx);
            }
        }
    }

    if (violatedRules.length === 0) {
        return createResult({
            decision: "allow",
            reason: "policy_enforced",
        });
    }

    return createResult({
        decision: "deny",
        reason: "policy_violated",
    });
}

export type { PolicyResult };
