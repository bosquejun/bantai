import { z } from "zod";
import { ruleResultSchema } from "./schema.js";



export function allow<TMeta extends Record<string, unknown>>({reason, meta}: {reason?: string | null, meta?: TMeta} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: true,
        reason,
        skipped: false,
        meta
    })
}

export function deny<TMeta extends Record<string, unknown>>({reason, meta}: {reason?: string | null, meta?: TMeta} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: false,
        reason,
        skipped: false,
        meta
    })
}

export function skip<TMeta extends Record<string, unknown>>({reason, meta}: {reason?: string | null, meta?: TMeta} = {
    reason: "skipped",
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: true,
        reason,
        skipped: true,
        meta
    })
}


export type RuleResult = z.infer<typeof ruleResultSchema>;