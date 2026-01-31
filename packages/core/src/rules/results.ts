import { RuleResult, ruleResultSchema } from "./schema.js"



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