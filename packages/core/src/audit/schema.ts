import { z } from "zod";
import { versionSchema } from "../context/schema.js";
import { policySchema, policyStrategySchema } from "../policies/schema.js";
import { ruleSchema } from "../rules/schema.js";

export const auditPolicyMetaSchema = z.object({
    strategy: policyStrategySchema,
});

/**
 * Core audit event schema (v1)
 */
export const auditEventSchema = z.object({
    /** unique event id */
    id: z
        .custom<`event:${string}`>()
        .refine((value) => value.startsWith("event:"), { message: 'ID must start with "event:"' }),

    /** event type */
    type: z.enum([
        "policy.start",
        "rule.start",
        "rule.end",
        "rule.decision",
        "policy.decision",
        "policy.end",
        "extension.event",
    ]),

    /** unix epoch in ms */
    timestamp: z.number(),

    /** unique per policy evaluation */
    evaluationId: z.string(),

    /** policy identity */
    policy: policySchema.pick({ name: true, version: true, id: true }),

    /** rule identity (only for rule events) */
    rule: ruleSchema.pick({ name: true, version: true, id: true }).optional(),

    /** decision outcome (only for decision events) */
    decision: z
        .object({
            outcome: z.enum(["allow", "deny", "skip"]),
            reason: z.string().nullable(),
        })
        .optional(),

    /** correlation across systems */
    trace: z
        .object({
            traceId: z.string().optional(),
            requestId: z.string().optional(),
        })
        .optional(),

    /** extension-owned data */
    meta: z.record(z.string(), z.unknown()).optional(),

    auditVersion: versionSchema,

    durationMs: z.number().nullable().default(null).optional(),

    parentId: z.string().optional(),
});
