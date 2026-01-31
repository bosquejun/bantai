import { z } from "zod";
import { contextSchema } from "./schema.js";



export function defineContext<T extends z.ZodRawShape>(schema: z.ZodObject<T>, options?: {
    defaultValues?: Partial<z.infer<z.ZodObject<T>>>;
}):ContextDefinition<T> {

      
      // Validate at runtime
      const  context = contextSchema.parse({
        schema,
        defaultValues: options?.defaultValues ? schema.partial().parse(options.defaultValues) : {}
      }) as ContextDefinition<T>;

      return context;
}

export type ContextDefinition<T extends z.ZodRawShape> = Omit<z.infer<typeof contextSchema>, 'schema' | 'defaultValues'> &{
    schema: z.ZodObject<T>;
    defaultValues: Partial<z.infer<z.ZodObject<T>>>;
}
