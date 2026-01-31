import z from "zod";



export const ruleEvaluateFnSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
    return z.function().input([schema]).output(ruleResultSchema);
}


export const ruleResultSchema = z.object({
    allowed: z.boolean(),
    reason: z.string().nullable()
}).brand<'RuleResult'>();


export const ruleSchema = z.object({
    name: z.string(),
    evaluate: z.function()
}).brand<'BantaiRule'>();


export type RuleEvaluateFn<T extends z.ZodRawShape> = z.infer<typeof ruleEvaluateFnSchema<T>>;