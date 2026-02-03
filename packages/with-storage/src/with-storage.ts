import { ContextDefinition, defineContext, ExtractContextShape, ExtractContextTools } from "@bantai-dev/core";
import { z } from "zod";

/**
 * Extends a context with storage capabilities.
 * Adds a storage adapter to the context's tools without modifying the schema.
 */
export const withStorage = <
  TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
  TStorageDataSchema extends z.ZodType,
  TStorageData extends z.infer<TStorageDataSchema>
>(
  context: TContext,
  storage: TStorageData
): ContextDefinition<
  ExtractContextShape<TContext>,
  ExtractContextTools<TContext> & { storage: TStorageData }
> => {
  return defineContext(context.schema, {
    tools: {
      ...context.tools,
      storage,
    },
    defaultValues: context.defaultValues,
  }) as ContextDefinition<
    ExtractContextShape<TContext>,
    ExtractContextTools<TContext> & { storage: TStorageData }
  >;
};