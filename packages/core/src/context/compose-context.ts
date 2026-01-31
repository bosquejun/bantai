import { z } from 'zod';
import { defineContext, type ContextDefinition } from './define-context.js';

type ExtractShape<T> = T extends z.ZodObject<infer S> ? S : never;
type ExtractTools<T> = T extends ContextDefinition<infer _, infer TTools> ? TTools : {};

/**
 * Recursively merges all shapes from an array of contexts
 */
type MergeShapes<
  TContexts extends readonly ContextDefinition<z.ZodRawShape, any>[]
> = TContexts extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends ContextDefinition<infer S, any>
    ? Rest extends readonly ContextDefinition<z.ZodRawShape, any>[]
      ? S & MergeShapes<Rest>
      : S
    : never
  : z.ZodRawShape;

/**
 * Recursively merges all tools from an array of contexts
 */
type MergeTools<
  TContexts extends readonly ContextDefinition<any, Record<string, unknown>>[]
> = TContexts extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends ContextDefinition<any, infer T>
    ? Rest extends readonly ContextDefinition<any, Record<string, unknown>>[]
      ? T & MergeTools<Rest>
      : T
    : {}
  : {};

/**
 * Deeply merges two objects, with later values taking precedence for conflicts
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      const targetValue = result[key];
      const sourceValue = source[key];

      if (
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue) &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Merges multiple ZodObject shapes into a single shape
 */
function mergeZodShapes<T extends readonly z.ZodRawShape[]>(
  shapes: T
): z.ZodRawShape {
  const merged: Record<string, z.ZodTypeAny> = {};

  for (const shape of shapes) {
    Object.assign(merged, shape);
  }

  return merged as z.ZodRawShape;
}

/**
 * Composes multiple contexts into a single context with deeply merged schemas, defaultValues, and tools.
 *
 * @param contexts - Array of context definitions to compose
 * @returns A new context definition with all contexts merged
 *
 * @example
 * ```ts
 * const userContext = defineContext(z.object({ userId: z.string() }));
 * const roleContext = defineContext(z.object({ role: z.enum(['admin', 'user']) }));
 * const composed = composeContext(userContext, roleContext);
 * // composed.schema includes both userId and role
 * ```
 */
export function composeContext<
  TContexts extends readonly ContextDefinition<
    z.ZodRawShape,
    Record<string, unknown>
  >[]
>(
  ...contexts: TContexts
): ContextDefinition<MergeShapes<TContexts>, MergeTools<TContexts>> {
  if (contexts.length === 0) {
    throw new Error('composeContext requires at least one context');
  }

  if (contexts.length === 1) {
    return contexts[0] as any;
  }

  // Extract all shapes
  const shapes = contexts.map(
    (ctx) => ctx.schema.shape
  ) as ExtractShape<TContexts[number]['schema']>[];

  // Merge all shapes into one
  const mergedShape = mergeZodShapes(shapes);

  // Create merged schema
  const mergedSchema = z.object(mergedShape);

  // Deep merge all defaultValues
  let mergedDefaultValues: Record<string, unknown> = {};
  for (const ctx of contexts) {
    mergedDefaultValues = deepMerge(
      mergedDefaultValues,
      ctx.defaultValues || {}
    );
  }

  // Deep merge all tools
  let mergedTools: Record<string, unknown> = {};
  for (const ctx of contexts) {
    mergedTools = deepMerge(mergedTools, ctx.tools || {});
  }

  return defineContext(mergedSchema, {
    defaultValues: mergedDefaultValues as any,
    tools: mergedTools as any,
  }) as any;
}
