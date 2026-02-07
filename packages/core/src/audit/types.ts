import { ContextDefinition, PolicyDefinition, RuleDefinition } from "src/index.js";
import { z } from "zod";
import { auditEventSchema } from "./schema.js";

export type AuditEvent = z.infer<typeof auditEventSchema>;

/** Sink interface: any function that consumes validated events */
export type AuditSink = (event: AuditEvent) => void;

export type AuditHandler = {
    emit: (event: BasicAuditEmitInput) => void;
  };

export type BasicAuditEmitInput = Omit<AuditEvent, "evaluationId" | "policy" | 'id' | 'timestamp'>;

  export type CreateAuditPolicy<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>, TName extends string, TRules extends readonly RuleDefinition<TContext, string>[]> = (policy: PolicyDefinition<TContext, TName, TRules>) => AuditHandler;
  

  export type AuditTool<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>, TName extends string, TRules extends readonly RuleDefinition<TContext, string>[]> = {
    createAuditPolicy: CreateAuditPolicy<TContext, TName, TRules>;
  };