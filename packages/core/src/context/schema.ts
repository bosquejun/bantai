import { z } from "zod";

export const versionSchema = z.enum(["v1"]).default("v1").optional();

export const contextSchema = z
    .object({
        schema: z.instanceof(z.ZodObject),
        defaultValues: z.record(z.string(), z.unknown()).optional(),
        tools: z.record(z.string(), z.unknown()).default({}),
        version: versionSchema,
    })
    .brand<"BantaiContext">();
