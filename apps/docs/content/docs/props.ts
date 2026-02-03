import { ContextDefinition } from '@bantai-dev/core';
import { z } from 'zod';

export type DefineRuleParameters<T extends z.ZodRawShape> = {
    context: ContextDefinition<T, Record<string, unknown>>;
}