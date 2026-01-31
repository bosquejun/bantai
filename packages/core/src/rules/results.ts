import z from "zod";
import { ruleResultSchema } from "./schema.js";



export function allow({reason}: {reason?: string | null} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: true,
        reason
    })
}

export function deny({reason}: {reason?: string | null} = {
    reason: null
}): RuleResult {
    return ruleResultSchema.parse({
        allowed: false,
        reason
    })
}


export type RuleResult = z.infer<typeof ruleResultSchema>;