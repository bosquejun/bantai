import { z } from "zod";
import { contextSchema } from "./schema.js";

export function defineContext<T extends z.ZodRawShape, TTools extends Record<string, unknown> = {}>(
    schema: z.ZodObject<T>,
    options?: {
        defaultValues?: Partial<z.infer<z.ZodObject<T>>>;
        tools?: TTools;
    }
): ContextDefinition<T, TTools> {
    let defaultValues = {};

    if (Boolean(options?.defaultValues)) {
        defaultValues = schema.partial().parse(options?.defaultValues);
    }
    // Validate at runtime
    const context = contextSchema.parse({
        schema,
        defaultValues,
        tools: options?.tools || {},
    }) as ContextDefinition<T, TTools>;

    return context;
}

export type ContextDefinition<
    T extends z.ZodRawShape,
    TTools extends Record<string, unknown> = {},
> = Omit<z.infer<typeof contextSchema>, "schema" | "defaultValues" | "tools"> & {
    schema: z.ZodObject<T>;
    defaultValues: Partial<z.infer<z.ZodObject<T>>>;
    tools: TTools;
};

/**
 * Extracts the shape type from a context
 */
export type ExtractContextShape<TContext> =
    TContext extends ContextDefinition<infer S, Record<string, unknown>> ? S : never;

/**
 * Extracts the tools type from a context
 */
export type ExtractContextTools<TContext> =
    TContext extends ContextDefinition<z.ZodRawShape, infer TTools>
        ? TTools
        : Record<string, unknown>;
