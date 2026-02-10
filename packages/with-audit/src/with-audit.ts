import {
    ContextDefinition,
    ExtractContextShape,
    ExtractContextTools,
    RuleDefinition,
    auditEventSchema,
    defineContext,
    type AuditSink,
    type AuditTool,
} from "@bantai-dev/core";
import { z } from "zod";
import { createWithAuditHandler } from "./handler.js";

export type WithAuditOptions = {
    sinks: AuditSink[];
};

// Create the audit schema for extending contexts
const auditSchema = z
    .object({
        audit: auditEventSchema
            .pick({
                trace: true,
            })
            .partial(),
    })
    .partial();

export type AuditShape = typeof auditSchema extends z.ZodObject<infer S> ? S : never;

/**
 * Helper type that infers the merged context shape with audit schema
 */
type WithAuditShape<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> =
    ExtractContextShape<TContext> & AuditShape;

/**
 * Helper type that infers the merged context tools with audit tools
 */
type WithAuditTools<TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>> =
    ExtractContextTools<TContext> & {
        audit: AuditTool<TContext, string, RuleDefinition<TContext, string>[]>;
    };

export function withAudit<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
>(context: TContext, options: WithAuditOptions): WithAuditContext<TContext> {
    const combinedSinks: AuditSink = (event) => options.sinks.forEach((sink) => sink(event));

    const mergedSchema = context.schema.extend(auditSchema.shape);

    const auditHandler = createWithAuditHandler(combinedSinks);

    const tools: WithAuditTools<TContext> = {
        ...(context.tools as ExtractContextTools<TContext>),
        audit: {
            createAuditEvent: (policy, evaluationId) => auditHandler.init(policy, evaluationId),
            emit: auditHandler.emit,
        },
    };

    return defineContext(mergedSchema, {
        defaultValues: context.defaultValues,
        tools,
    }) as unknown as WithAuditContext<TContext>;
}

export type WithAuditContext<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = ContextDefinition<WithAuditShape<TContext>, WithAuditTools<TContext>>;
