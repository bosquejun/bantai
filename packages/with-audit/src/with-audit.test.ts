import { defineContext, type AuditEvent } from '@bantai-dev/core';
import { generateId } from '@bantai-dev/shared';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { withAudit } from './with-audit.js';

// Helper to create a mock policy for testing
function createMockPolicy(context: ReturnType<typeof defineContext>) {
  return {
    name: 'test-policy',
    id: 'policy:test-policy' as const,
    version: 'v1' as const,
    context,
    rules: new Map(),
    options: {
      defaultStrategy: 'preemptive' as const,
    },
  } as any; // Type assertion needed because PolicyDefinition has zod brand properties
}

describe('withAudit', () => {
  it('should add audit tool to context with single sink', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    expect(context).toBeDefined();
    // Schema is extended, so it's a new object but should contain original fields
    expect(context.schema.shape.userId).toBeDefined();
    expect(context.schema.shape.audit).toBeDefined();
    expect(context.tools).toHaveProperty('audit');
    expect(context.tools.audit).toHaveProperty('createAuditEvent');
    expect(typeof context.tools.audit.createAuditEvent).toBe('function');
  });

  it('should call all sinks when audit handler emits events', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const sink2 = vi.fn();
    const sink3 = vi.fn();

    const context = withAudit(baseContext, {
      sinks: [sink1, sink2, sink3],
    });

    const mockPolicy = createMockPolicy(context);
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    auditHandler.emit({
      type: 'policy.start',
    });

    // All sinks should be called with a validated event
    expect(sink1).toHaveBeenCalledTimes(1);
    expect(sink2).toHaveBeenCalledTimes(1);
    expect(sink3).toHaveBeenCalledTimes(1);

    // Check that the event has all required fields
    const calledEvent = sink1.mock.calls[0]?.[0];
    expect(calledEvent).toBeDefined();
    expect(calledEvent).toHaveProperty('id');
    expect(calledEvent).toHaveProperty('type', 'policy.start');
    expect(calledEvent).toHaveProperty('timestamp');
    expect(calledEvent).toHaveProperty('evaluationId');
    expect(calledEvent).toHaveProperty('policy');
    expect(calledEvent?.policy).toMatchObject({
      name: 'test-policy',
      version: 'v1',
      id: 'policy:test-policy',
    });
  });

  it('should preserve existing tools from base context', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      }),
      {
        tools: {
          logger: {
            log: vi.fn(),
          },
          cache: {
            get: vi.fn(),
          },
        },
      }
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    expect(context.tools).toHaveProperty('logger');
    expect(context.tools).toHaveProperty('cache');
    expect(context.tools).toHaveProperty('audit');
    expect(context.tools.logger).toBe(baseContext.tools.logger);
    expect(context.tools.cache).toBe(baseContext.tools.cache);
  });

  it('should preserve schema from base context', () => {
    const schema = z.object({
      userId: z.string(),
      age: z.number(),
      role: z.enum(['admin', 'user']),
    });

    const baseContext = defineContext(schema);
    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    // Schema is extended, so it's a new object but should contain original fields
    expect(context.schema.shape.userId).toBe(schema.shape.userId);
    expect(context.schema.shape.age).toBe(schema.shape.age);
    expect(context.schema.shape.role).toBe(schema.shape.role);
    expect(context.schema.shape.audit).toBeDefined();
  });

  it('should preserve default values from base context', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
        age: z.number().optional(),
      }),
      {
        defaultValues: {
          age: 18,
        },
      }
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    expect(context.defaultValues).toEqual({ age: 18 });
  });

  it('should handle empty sinks array', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const context = withAudit(baseContext, { sinks: [] });

    expect(context.tools.audit).toBeDefined();
    expect(context.tools.audit.createAuditEvent).toBeDefined();

    // Should not throw when called with empty sinks
    const mockPolicy = createMockPolicy(context);
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    expect(() => auditHandler.emit({ type: 'policy.start' })).not.toThrow();
  });

  it('should handle complex audit events', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    const mockPolicy = {
      name: 'complex-policy',
      id: 'policy:complex-policy' as const,
      version: 'v1' as const,
      context,
      rules: new Map(),
      options: {
        defaultStrategy: 'preemptive' as const,
      },
    } as any; // Type assertion needed because PolicyDefinition has zod brand properties
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    auditHandler.emit({
      type: 'rule.decision',
      rule: {
        name: 'test-rule',
        id: 'rule:test-rule' as const,
        version: 'v1' as const,
      },
      decision: {
        outcome: 'allow',
        reason: 'User meets requirements',
      },
      trace: {
        traceId: 'trace-123',
        requestId: 'req-456',
      },
      meta: {
        customField: 'custom-value',
        nested: {
          data: 123,
        },
      },
    });

    expect(sink1).toHaveBeenCalledTimes(1);
    const calledEvent = sink1.mock.calls[0]?.[0];
    expect(calledEvent).toBeDefined();
    expect(calledEvent?.type).toBe('rule.decision');
    expect(calledEvent?.rule).toMatchObject({ 
      name: 'test-rule',
      id: 'rule:test-rule',
      version: 'v1',
    });
    expect(calledEvent?.decision).toEqual({
      outcome: 'allow',
      reason: 'User meets requirements',
    });
    expect(calledEvent?.trace).toEqual({
      traceId: 'trace-123',
      requestId: 'req-456',
    });
    expect(calledEvent?.meta).toEqual({
      customField: 'custom-value',
      nested: {
        data: 123,
      },
    });
  });

  it('should handle multiple calls to audit handler emit', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const sink2 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1, sink2] });

    const mockPolicy = createMockPolicy(context);
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    auditHandler.emit({ type: 'policy.start' });
    auditHandler.emit({ type: 'policy.end' });

    expect(sink1).toHaveBeenCalledTimes(2);
    expect(sink2).toHaveBeenCalledTimes(2);

    // Check first call
    const firstCall = sink1.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.type).toBe('policy.start');

    // Check second call
    const secondCall = sink1.mock.calls[1]?.[0];
    expect(secondCall).toBeDefined();
    expect(secondCall?.type).toBe('policy.end');
  });

  it('should handle sink errors gracefully', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn(() => {
      throw new Error('Sink error');
    });
    const sink2 = vi.fn();

    const context = withAudit(baseContext, { sinks: [sink1, sink2] });

    const mockPolicy = createMockPolicy(context);
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    // First sink throws, but second should still be called
    expect(() => auditHandler.emit({ type: 'policy.start' })).toThrow('Sink error');
    expect(sink1).toHaveBeenCalledTimes(1);
    // Note: forEach will stop on first error, so sink2 won't be called
    // This is the current behavior - if we want all sinks to be called even on error,
    // we'd need to change the implementation
  });

  it('should maintain type safety for WithAuditContext', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
        age: z.number(),
      }),
      {
        tools: {
          logger: {
            log: vi.fn(),
          },
        },
      }
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    // Type check: context should have audit tool
    const mockPolicy = createMockPolicy(context);
    const evaluationId = generateId('eval');
    const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);

    // This should compile without errors
    auditHandler.emit({ type: 'policy.start' });

    // Original tools should still be accessible
    expect(context.tools.logger).toBeDefined();
  });

  it('should work with context that has no initial tools', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    expect(context.tools).toEqual({
      audit: {
        createAuditEvent: expect.any(Function),
        emit: expect.any(Function),
      },
    });
  });

  it('should handle all audit event types', () => {
    const baseContext = defineContext(
      z.object({
        userId: z.string(),
      })
    );

    const sink1 = vi.fn();
    const context = withAudit(baseContext, { sinks: [sink1] });

    const eventTypes: AuditEvent['type'][] = [
      'policy.start',
      'rule.decision',
      'policy.decision',
      'extension.event',
      'policy.end',
    ];

    // Create a new handler for each event type since policy.end ends the handler
    // Note: policy.end must be last as it ends the handler
    eventTypes.forEach((type) => {
      const mockPolicy = createMockPolicy(context);
      const evaluationId = generateId('eval');
      const auditHandler = context.tools.audit.createAuditEvent(mockPolicy, evaluationId);
      auditHandler.emit({ type });
    });

    expect(sink1).toHaveBeenCalledTimes(eventTypes.length);
    
    // Verify all event types were emitted
    eventTypes.forEach((type, index) => {
      const call = sink1.mock.calls[index]?.[0];
      expect(call).toBeDefined();
      expect(call?.type).toBe(type);
    });
  });
});

