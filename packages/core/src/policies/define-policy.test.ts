import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineContext } from '../context/define-context.js';
import { defineRule } from '../rules/define-rule.js';
import { allow, deny } from '../rules/results.js';
import { definePolicy } from './define-policy.js';

describe('definePolicy', () => {
  it('should create a policy with context, name, and rules', () => {
    const schema = z.object({
      age: z.number(),
      role: z.enum(['admin', 'user']),
    });
    const context = defineContext(schema);

    const isAdult = defineRule(context, 'is-adult', async (input) => {
      return input.age >= 18 ? allow() : deny();
    });

    const isAdmin = defineRule(context, 'is-admin', async (input) => {
      return input.role === 'admin' ? allow() : deny();
    });

    const policy = definePolicy(context, 'test-policy', [isAdult, isAdmin]);

    expect(policy.name).toBe('test-policy');
    expect(policy.context.schema).toBe(context.schema);
    expect(policy.context.defaultValues).toEqual(context.defaultValues);
    expect(policy.rules).toBeInstanceOf(Map);
    expect(policy.rules.size).toBe(2);
    expect(policy.rules.has('is-adult')).toBe(true);
    expect(policy.rules.has('is-admin')).toBe(true);
  });

  it('should use default strategy when not specified', () => {
    const schema = z.object({
      age: z.number(),
    });
    const context = defineContext(schema);

    const rule = defineRule(context, 'test-rule', async (_input) => allow());

    const policy = definePolicy(context, 'test-policy', [rule]);

    expect(policy.options.defaultStrategy).toBe('preemptive');
  });

  it('should use custom default strategy', () => {
    const schema = z.object({
      age: z.number(),
    });
    const context = defineContext(schema);

    const rule = defineRule(context, 'test-rule', async (_input) => allow());

    const policy = definePolicy(context, 'test-policy', [rule], {
      defaultStrategy: 'exhaustive',
    });

    expect(policy.options.defaultStrategy).toBe('exhaustive');
  });

  it('should create rules map with correct types', () => {
    const schema = z.object({
      age: z.number(),
      role: z.enum(['admin', 'user']),
    });
    const context = defineContext(schema);

    const isAdult = defineRule(context, 'is-adult', async (_input) => allow());
    const isAdmin = defineRule(context, 'is-admin', async (_input) => allow());

    const policy = definePolicy(context, 'test-policy', [isAdult, isAdmin]);

    const adultRule = policy.rules.get('is-adult');
    const adminRule = policy.rules.get('is-admin');

    expect(adultRule).toBeDefined();
    expect(adminRule).toBeDefined();
    expect(adultRule?.name).toBe('is-adult');
    expect(adminRule?.name).toBe('is-admin');
  });

  it('should handle empty rules array', () => {
    const schema = z.object({
      age: z.number(),
    });
    const context = defineContext(schema);

    const policy = definePolicy(context, 'empty-policy', []);

    expect(policy.rules.size).toBe(0);
  });

  it('should handle single rule', () => {
    const schema = z.object({
      age: z.number(),
    });
    const context = defineContext(schema);

    const rule = defineRule(context, 'single-rule', async () => allow());

    const policy = definePolicy(context, 'single-rule-policy', [rule]);

    expect(policy.rules.size).toBe(1);
    expect(policy.rules.has('single-rule')).toBe(true);
  });

  it('should handle multiple rules with same context', () => {
    const schema = z.object({
      age: z.number(),
      role: z.enum(['admin', 'user']),
      email: z.string().email(),
    });
    const context = defineContext(schema);

    const rule1 = defineRule(context, 'rule-1', async (_input) => allow());
    const rule2 = defineRule(context, 'rule-2', async (_input) => allow());
    const rule3 = defineRule(context, 'rule-3', async (_input) => allow());

    const policy = definePolicy(context, 'multi-rule-policy', [
      rule1,
      rule2,
      rule3,
    ]);

    expect(policy.rules.size).toBe(3);
    expect(policy.rules.has('rule-1')).toBe(true);
    expect(policy.rules.has('rule-2')).toBe(true);
    expect(policy.rules.has('rule-3')).toBe(true);
  });
});

