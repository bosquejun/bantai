import { z } from "zod";


export const contextSchema = z.object({
    schema: z.instanceof(z.ZodObject),
    defaultValues: z.record(z.string(), z.unknown()).optional(),
}).brand<'BantaiContext'>();
  
