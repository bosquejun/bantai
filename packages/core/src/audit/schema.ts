import { z } from "zod";

/**
 * Core audit event schema (v1)
 */
export const auditEventSchema = z.object({
  /** unique event id */
  id: z.string(),

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
  policy: z.object({
    name: z.string(),
    version: z.string().optional(),
  }),

  /** rule identity (only for rule events) */
  rule: z.object({
    name: z.string(),
  }).optional(),

  /** decision outcome (only for decision events) */
  decision: z.object({
    outcome: z.enum(["allow", "deny", "skip"]),
    reason: z.string().nullable(),
  }).optional(),

  /** correlation across systems */
  trace: z.object({
    traceId: z.string().optional(),
    requestId: z.string().optional(),
  }).optional(),

  /** extension-owned data */
  meta: z.record(z.string(), z.unknown()).optional(),
});
