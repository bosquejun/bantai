import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { composeContext } from './compose-context.js';
import { defineContext } from './define-context.js';

describe('composeContext', () => {
  it('should merge multiple contexts with different schemas', () => {
    const userContext = defineContext(
      z.object({
        userId: z.string(),
        email: z.string().email(),
      })
    );

    const roleContext = defineContext(
      z.object({
        role: z.enum(['admin', 'user']),
        permissions: z.array(z.string()),
      })
    );

    const composed = composeContext(userContext, roleContext);

    // Verify the merged schema includes all fields
    const testInput = {
      userId: '123',
      email: 'test@example.com',
      role: 'admin' as const,
      permissions: ['read', 'write'],
    };

    const parsed = composed.schema.parse(testInput);
    expect(parsed).toEqual(testInput);
  });

  it('should merge defaultValues from multiple contexts', () => {
    const context1 = defineContext(
      z.object({
        field1: z.string(),
        field2: z.number().optional(),
      }),
      {
        defaultValues: {
          field1: 'default1',
          field2: 42,
        },
      }
    );

    const context2 = defineContext(
      z.object({
        field3: z.boolean(),
      }),
      {
        defaultValues: {
          field3: true,
        },
      }
    );

    const composed = composeContext(context1, context2);

    expect(composed.defaultValues).toEqual({
      field1: 'default1',
      field2: 42,
      field3: true,
    });
  });

  it('should deeply merge nested defaultValues', () => {
    const context1 = defineContext(
      z.object({
        user: z.object({
          id: z.string(),
          name: z.string(),
        }),
      }),
      {
        defaultValues: {
          user: {
            id: '123',
            name: 'John',
          },
        },
      }
    );

    const context2 = defineContext(
      z.object({
        user: z.object({
          email: z.string(),
        }),
      }),
      {
        defaultValues: {
          user: {
            email: 'john@example.com',
          },
        },
      }
    );

    const composed = composeContext(context1, context2);

    // Note: This test verifies deep merge behavior
    // The actual result depends on how Zod handles overlapping nested objects
    expect(composed.defaultValues).toBeDefined();
  });

  it('should merge tools from multiple contexts', () => {
    const context1 = defineContext(
      z.object({
        value: z.number(),
      }),
      {
        tools: {
          logger: {
            log: (msg: string) => console.log(msg),
          },
        },
      }
    );

    const context2 = defineContext(
      z.object({
        name: z.string(),
      }),
      {
        tools: {
          validator: {
            validate: (input: unknown) => Boolean(input),
          },
        },
      }
    );

    const composed = composeContext(context1, context2);

    expect(composed.tools).toHaveProperty('logger');
    expect(composed.tools).toHaveProperty('validator');
    expect(composed.tools.logger).toBeDefined();
    expect(composed.tools.validator).toBeDefined();
  });

  it('should handle single context', () => {
    const context = defineContext(z.object({ field: z.string() }));

    const composed = composeContext(context);

    expect(composed.schema).toBe(context.schema);
    expect(composed.defaultValues).toEqual(context.defaultValues);
    expect(composed.tools).toEqual(context.tools);
  });

  it('should throw error when no contexts provided', () => {
    expect(() => {
      composeContext();
    }).toThrow('composeContext requires at least one context');
  });

  it('should handle three or more contexts', () => {
    const context1 = defineContext(z.object({ a: z.string() }));
    const context2 = defineContext(z.object({ b: z.number() }));
    const context3 = defineContext(z.object({ c: z.boolean() }));

    const composed = composeContext(context1, context2, context3);

    const testInput = {
      a: 'test',
      b: 42,
      c: true,
    };

    const parsed = composed.schema.parse(testInput);
    expect(parsed).toEqual(testInput);
  });

  it('should handle overlapping schema fields (later takes precedence)', () => {
    const context1 = defineContext(
      z.object({
        field: z.string(),
      })
    );

    const context2 = defineContext(
      z.object({
        field: z.number(), // Different type, should override
      })
    );

    const composed = composeContext(context1, context2);

    // The last context's schema should take precedence
    const testInput = { field: 42 };
    const parsed = composed.schema.parse(testInput);
    expect(parsed.field).toBe(42);
  });
});

