import { z } from "zod";
import { contextSchema } from "./schema.js";



export function defineContext<T extends z.ZodRawShape, TTools extends Record<string, unknown> = {}>(schema: z.ZodObject<T>, options?: {
    defaultValues?: Partial<z.infer<z.ZodObject<T>>>;
    tools?: TTools;
}):ContextDefinition<T,TTools> {

      
      // Validate at runtime
      const  context = contextSchema.parse({
        schema,
        defaultValues: options?.defaultValues ? schema.partial().parse(options.defaultValues) : {},
        tools: options?.tools || {}
      }) as ContextDefinition<T,TTools>;

      return context;
}

export type ContextDefinition<T extends z.ZodRawShape, TTools extends Record<string, unknown> = {}> = Omit<z.infer<typeof contextSchema>, 'schema' | 'defaultValues' | 'tools'> &{
    schema: z.ZodObject<T>;
    defaultValues: Partial<z.infer<z.ZodObject<T>>>;
    tools: TTools;
}

