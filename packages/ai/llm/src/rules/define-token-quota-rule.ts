import {
    ContextDefinition,
    ExtractContextShape,
    RuleResult,
    allow,
    defineRule,
    deny,
} from "@bantai-dev/core";
import {
    RateLimitCheckResult,
    RateLimitConfig,
    RateLimitStorage,
} from "@bantai-dev/with-rate-limit";
import { z } from "zod";
import { WithLLMContext } from "../context.js";
import { llmGenerateTextInputSchema, llmGenerateTextOutputSchema } from "../schema.js";

type IdentifierFunction<T extends z.ZodRawShape> = (input: z.infer<z.ZodObject<T>>) => string;

export const identifierFunctionSchema = <TSchema extends z.ZodObject<z.ZodRawShape>>(
    schema: TSchema
) => z.function().input([schema]).output(z.string());

const quotaOptionsSchema = z.object({
    limitTokens: z.number(),
    period: z.enum(["daily", "weekly", "monthly"]),
});

type QuotaOptionsFunction<T extends z.ZodRawShape> = (
    input: z.infer<z.ZodObject<T>>
) => z.infer<typeof quotaOptionsSchema>;
export const quotaOptionsFunctionSchema = <TSchema extends z.ZodObject<z.ZodRawShape>>(
    schema: TSchema
) => z.function().input([schema]).output(quotaOptionsSchema);

type TokenQuotaRuleOptions<T extends z.ZodRawShape> = {
    identifier: IdentifierFunction<T> | string;
    quota: z.infer<typeof quotaOptionsSchema> | QuotaOptionsFunction<T>;
};

function getQuotaPeriod(period: z.infer<typeof quotaOptionsSchema>["period"]) {
    switch (period) {
        case "daily":
            return "1d";
        case "weekly":
            return "7d";
        case "monthly":
            return "30d";
    }
}

type TokenQuotaRuleResultMeta = {
    result: RateLimitCheckResult | null;
    model: string;
    rateLimitConfig: RateLimitConfig | null;
    type: "token-quota";
};

export function defineTokenQuotaRule<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
>(
    context: WithLLMContext<TContext>,
    ruleName: string,
    options: TokenQuotaRuleOptions<ExtractContextShape<WithLLMContext<TContext>>>
) {
    const { identifier, quota: quotaOptionsOrFn } = options;

    type LLMContextShape = ExtractContextShape<WithLLMContext<TContext>>;
    type ContextInput = z.infer<z.ZodObject<LLMContextShape>>;

    // Validate identifier function signature at runtime
    const identifierFn = identifierFunctionSchema(context.schema).implement((input) => {
        return typeof identifier === "function" ? identifier(input as ContextInput) : identifier;
    });

    const quotaFn = quotaOptionsFunctionSchema(context.schema).implement((input) => {
        return typeof quotaOptionsOrFn === "function"
            ? quotaOptionsOrFn(input as ContextInput)
            : quotaOptionsOrFn;
    });

    return defineRule(context, ruleName, async (input) => {
        const typedInput = input as ContextInput & {
            llm: z.infer<typeof llmGenerateTextInputSchema>;
        };

        const quota = quotaFn(typedInput as Parameters<typeof quotaFn>[0]);

        const identifierKey = `llm:${identifierFn(typedInput as Parameters<typeof identifierFn>[0])}`;

        const estimatedInputTokens = await context.tools.llm.tokenUsageEstimator(
            typedInput.llm.prompt
        );

        const meta: TokenQuotaRuleResultMeta = {
            result: null,
            model: typedInput.llm.model!,
            rateLimitConfig: null,
            type: "token-quota",
        };

        const estimatedTotalTokens = estimatedInputTokens + typedInput.llm.maxTokens!;

        const rateLimitConfig: RateLimitConfig = {
            type: "token-bucket",
            period: getQuotaPeriod(quota.period),
            limit: quota.limitTokens,
            key: identifierKey,
            cost: estimatedTotalTokens,
        };

        const result = await context.tools.rateLimit.checkRateLimit(
            context.tools.storage.get("rateLimit") as RateLimitStorage,
            rateLimitConfig
        );

        meta.result = result;
        meta.rateLimitConfig = rateLimitConfig;

        if (!result.allowed) {
            return deny({ reason: result.reason, meta });
        }

        return allow({ reason: "Token quota allowed", meta });
    });
}

export async function consumeTokenQuota<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
>(
    usage: z.infer<typeof llmGenerateTextOutputSchema>["usage"],
    context: WithLLMContext<TContext>,
    ruleResult: RuleResult
) {
    const meta = ruleResult.meta as TokenQuotaRuleResultMeta;
    if (!ruleResult.allowed) {
        return;
    }
    if (meta?.type === "token-quota") {
        const rateLimitConfig = meta.rateLimitConfig as RateLimitConfig;
        rateLimitConfig.cost = usage.totalTokens || 0;
        await context.tools.rateLimit.incrementRateLimit(
            context.tools.storage.get("rateLimit") as RateLimitStorage,
            rateLimitConfig
        );
    }
}
