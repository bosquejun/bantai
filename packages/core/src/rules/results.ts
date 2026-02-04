import z from "zod";
import { ruleResultSchema } from "./schema.js";



export function allow({reason}: {reason?: string | null} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: true,
        reason,
        skipped: false
    })
}

export function deny({reason}: {reason?: string | null} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: false,
        reason,
        skipped: false
    })
}

export function skip({reason}: {reason?: string | null} = {
    reason: "skipped"
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: true,
        reason,
        skipped: true
    })
}


export type RuleResult = z.infer<typeof ruleResultSchema>;