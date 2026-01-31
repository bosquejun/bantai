import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineContext } from '../context/define-context.js';
import { defineRule } from '../rules/define-rule.js';
import { allow, deny } from '../rules/results.js';
import { definePolicy } from './define-policy.js';
import { evaluatePolicy } from './evaluate-policy.js';

describe('evaluatePolicy', () => {
  describe('preemptive strategy', () => {
    it('should return allow when all rules pass', async () => {
      const schema = z.object({
        age: z.number(),
        role: z.enum(['admin', 'user']),
      });
      const context = defineContext(schema);

      const isAdult = defineRule(context, 'is-adult', async (input) => {
        return input.age >= 18 ? allow({ reason: 'User is an adult' }) : deny();
      });

      const isAdmin = defineRule(context, 'is-admin', async (input) => {
        return input.role === 'admin' ? allow({ reason: 'User is an admin' }) : deny();
      });

      const policy = definePolicy(context, 'test-policy', [isAdult, isAdmin]);

      const result = await evaluatePolicy(policy, { age: 18, role: 'admin' });

      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('policy_enforced');
      expect(result.violatedRules).toHaveLength(0);
      expect(result.strategy).toBe('preemptive');
    });

    it('should return deny on first violation with preemptive strategy', async () => {
      const schema = z.object({
        age: z.number(),
        role: z.enum(['admin', 'user']),
      });
      const context = defineContext(schema);

      const isAdult = defineRule(context, 'is-adult', async (input) => {
        return input.age >= 18 ? allow() : deny({ reason: 'User is not an adult' });
      });

      const isAdmin = defineRule(context, 'is-admin', async (input) => {
        return input.role === 'admin' ? allow() : deny({ reason: 'User is not an admin' });
      });

      const policy = definePolicy(context, 'test-policy', [isAdult, isAdmin]);

      const result = await evaluatePolicy(policy, { age: 17, role: 'admin' });


      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('policy_violated');
      expect(result.violatedRules).toHaveLength(1);
      const violatedRule = result.violatedRules[0]!;
      expect(violatedRule.name).toBe('is-adult');
      expect(result.strategy).toBe('preemptive');
    });

    it('should stop evaluation after first violation', async () => {
      const schema = z.object({
        age: z.number(),
        role: z.enum(['admin', 'user']),
      });
      const context = defineContext(schema);

      let evaluationCount = 0;

      const rule1 = defineRule(context, 'rule-1', async (input) => {
        evaluationCount++;
        return deny({ reason: 'First rule failed' });
      });

      const rule2 = defineRule(context, 'rule-2', async (input) => {
        evaluationCount++;
        return allow();
      });

      const policy = definePolicy(context, 'test-policy', [rule1, rule2]);

      await evaluatePolicy(policy, { age: 18, role: 'admin' }, { strategy: 'preemptive' });

      expect(evaluationCount).toBe(1);
    });
  });

  describe('exhaustive strategy', () => {
    it('should evaluate all rules even if some fail', async () => {
      const schema = z.object({
        age: z.number(),
        role: z.enum(['admin', 'user']),
      });
      const context = defineContext(schema);

      const isAdult = defineRule(context, 'is-adult', async (input) => {
        return input.age >= 18 ? allow() : deny({ reason: 'User is not an adult' });
      });

      const isAdmin = defineRule(context, 'is-admin', async (input) => {
        return input.role === 'admin' ? allow() : deny({ reason: 'User is not an admin' });
      });

      const policy = definePolicy(context, 'test-policy', [isAdult, isAdmin]);

      const result = await evaluatePolicy(policy, { age: 17, role: 'user' }, { strategy: 'exhaustive' });

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('policy_violated');
      expect(result.violatedRules).toHaveLength(2);
      expect(result.strategy).toBe('exhaustive');
    });

    it('should collect all violations with exhaustive strategy', async () => {
      const schema = z.object({
        value: z.number(),
      });
      const context = defineContext(schema);

      const rule1 = defineRule(context, 'rule-1', async (input) => {
        return input.value > 0 ? allow() : deny({ reason: 'Value must be positive' });
      });

      const rule2 = defineRule(context, 'rule-2', async (input) => {
        return input.value < 100 ? allow() : deny({ reason: 'Value must be less than 100' });
      });

      const rule3 = defineRule(context, 'rule-3', async (input) => {
        return input.value % 2 === 0 ? allow() : deny({ reason: 'Value must be even' });
      });

      const policy = definePolicy(context, 'test-policy', [rule1, rule2, rule3]);

      const result = await evaluatePolicy(policy, { value: -5 }, { strategy: 'exhaustive' });

      expect(result.decision).toBe('deny');
      expect(result.violatedRules).toHaveLength(2);
      expect(result.violatedRules.map((r) => r.name)).toEqual(['rule-1', 'rule-3']);
    });
  });

  describe('strategy options', () => {
    it('should use policy default strategy when not specified', async () => {
      const schema = z.object({
        age: z.number(),
      });
      const context = defineContext(schema);

      const rule = defineRule(context, 'test-rule', async (_input) => deny());

      const policy = definePolicy(context, 'test-policy', [rule], {
        defaultStrategy: 'exhaustive',
      });

      const result = await evaluatePolicy(policy, { age: 18 });

      expect(result.strategy).toBe('exhaustive');
    });

    it('should override policy default strategy with option', async () => {
      const schema = z.object({
        age: z.number(),
      });
      const context = defineContext(schema);

      const rule = defineRule(context, 'test-rule', async (_input) => deny());

      const policy = definePolicy(context, 'test-policy', [rule], {
        defaultStrategy: 'exhaustive',
      });

      const result = await evaluatePolicy(policy, { age: 18 }, { strategy: 'preemptive' });

      expect(result.strategy).toBe('preemptive');
    });
  });

  describe('edge cases', () => {
    it('should handle empty policy', async () => {
      const schema = z.object({
        age: z.number(),
      });
      const context = defineContext(schema);

      const policy = definePolicy(context, 'empty-policy', []);

      const result = await evaluatePolicy(policy, { age: 18 });

      expect(result.decision).toBe('allow');
      expect(result.reason).toBe('policy_enforced');
      expect(result.violatedRules).toHaveLength(0);
    });

    it('should handle async rule evaluations', async () => {
      const schema = z.object({
        value: z.number(),
      });
      const context = defineContext(schema);

      const rule = defineRule(context, 'async-rule', async (input) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return input.value > 0 ? allow() : deny();
      });

      const policy = definePolicy(context, 'test-policy', [rule]);

      const result = await evaluatePolicy(policy, { value: 5 });

      expect(result.decision).toBe('allow');
    });

    it('should preserve violated rule results', async () => {
      const schema = z.object({
        age: z.number(),
      });
      const context = defineContext(schema);

      const rule = defineRule(context, 'age-check', async (input) => {
        return deny({ reason: 'Age requirement not met' });
      });

      const policy = definePolicy(context, 'test-policy', [rule]);

      const result = await evaluatePolicy(policy, { age: 17 }, { strategy: 'exhaustive' });

      expect(result.violatedRules).toHaveLength(1);
      const violatedRule = result.violatedRules[0]!;
      expect(violatedRule.name).toBe('age-check');
      expect(violatedRule.result.allowed).toBe(false);
      expect(violatedRule.result.reason).toBe('Age requirement not met');
    });
  });
});

