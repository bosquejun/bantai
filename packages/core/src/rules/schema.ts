import { z } from "zod";
import { versionSchema } from "../context/schema.js";

export const ruleFnContextSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
    return z
        .object({
            tools: z.record(z.string(), z.unknown()),
        })
        .brand<"RuleFnContext">();
};

export const ruleEvaluateFnSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
    return z
        .function()
        .input([schema, ruleFnContextSchema(schema)])
        .output(ruleResultSchema);
};

export const ruleHookFnSchema = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
    return z
        .function()
        .input([ruleResultSchema, schema, ruleFnContextSchema(schema)])
        .output(z.void());
};

export const ruleResultSchema = z
    .object({
        allowed: z.boolean(),
        reason: z.string().nullable(),
        skipped: z.boolean().default(false),
        meta: z.record(z.string(), z.unknown()).default({}).optional(),
    })
    .brand<"BantaiRuleResult">();

export const ruleSchema = z
    .object({
        name: z.string(),
        id: z.custom<`rule:${string}`>().refine((value) => value.startsWith("rule:"), {
            message: 'ID must start with "rule:"',
        }),
        evaluate: z.function(),
        hooks: z
            .object({
                onAllow: z.function().optional(),
                onDeny: z.function().optional(),
            })
            .optional(),
        version: versionSchema,
    })
    .brand<"BantaiRule">();

export type RuleEvaluateFn<T extends z.ZodRawShape> = z.infer<typeof ruleEvaluateFnSchema<T>>;
