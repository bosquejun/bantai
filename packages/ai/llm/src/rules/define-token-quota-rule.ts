import {
    ContextDefinition,
    ExtractContextShape,
    RuleResult,
    allow,
    defineRule,
    deny,
    skip,
} from "@bantai-dev/core";
import { RuleEvaluateFnAsync } from "@bantai-dev/core/rules";
import {
    RateLimitCheckResult,
    RateLimitConfig,
    RateLimitStorage,
} from "@bantai-dev/with-rate-limit";
import { z } from "zod";
import { WithLLMContext } from "../context.js";
import { llmGenerateTextInputSchema, tokenUsageSchema } from "../schema.js";

type IdentifierFunction<T extends z.ZodRawShape> = (input: z.infer<z.ZodObject<T>>) => string;

export const identifierFunctionSchema = <TSchema extends z.ZodObject<z.ZodRawShape>>(
    schema: TSchema
) => z.function().input([schema]).output(z.string());

const quotaOptionsSchema = z.object({
    limitTokens: z.number(),
    period: z.enum(["daily", "weekly", "monthly"]),
});

type QuotaOptionsFunction<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = (
    input: z.infer<z.ZodObject<ExtractContextShape<TContext>>>
) => z.infer<typeof quotaOptionsSchema>;
export const quotaOptionsFunctionSchema = <TSchema extends z.ZodRawShape>(
    schema: z.ZodObject<TSchema>
) => z.function().input([schema]).output(quotaOptionsSchema);

type TokenQuotaRuleOptions<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
> = {
    identifier: IdentifierFunction<ExtractContextShape<TContext>> | string;
    quota: z.infer<typeof quotaOptionsSchema> | QuotaOptionsFunction<TContext>;
    evaluate?: RuleEvaluateFnAsync<TContext>;
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
>(context: WithLLMContext<TContext>, ruleName: string, options: TokenQuotaRuleOptions<TContext>) {
    const { identifier, quota: quotaOptionsOrFn, evaluate } = options;

    type LLMContextShape = ExtractContextShape<WithLLMContext<TContext>>;
    type ContextInput = z.infer<z.ZodObject<LLMContextShape>>;

    // Validate identifier function signature at runtime
    const identifierFn = identifierFunctionSchema(context.schema).implement((input) => {
        return typeof identifier === "function"
            ? identifier(input as z.infer<z.ZodObject<ExtractContextShape<TContext>>>)
            : identifier;
    });

    // Fix type incompatibility by using the correct input type for the quota function and ensuring the shape is passed correctly
    const quotaFn = quotaOptionsFunctionSchema(context.schema).implement((input) => {
        return typeof quotaOptionsOrFn === "function"
            ? quotaOptionsOrFn(input as z.infer<z.ZodObject<ExtractContextShape<TContext>>>)
            : quotaOptionsOrFn;
    });

    return defineRule(context, ruleName, async (input, ctx) => {
        const typedInput = input as ContextInput & {
            llm: z.infer<typeof llmGenerateTextInputSchema>;
        };

        const meta: TokenQuotaRuleResultMeta = {
            result: null,
            model: typedInput.llm.model!,
            rateLimitConfig: null,
            type: "token-quota",
        };

        if (evaluate) {
            const evaluateResult = await evaluate(
                typedInput as Parameters<typeof evaluate>[0],
                ctx as Parameters<typeof evaluate>[1]
            );
            if (!evaluateResult.allowed) {
                return deny({ reason: evaluateResult.reason, meta });
            } else if (evaluateResult.skipped) {
                return skip({ reason: evaluateResult.reason, meta });
            }
        }

        const quota = quotaFn(typedInput as Parameters<typeof quotaFn>[0]);

        const identifierKey = `llm:${identifierFn(typedInput as Parameters<typeof identifierFn>[0])}`;

        const estimatedInputTokens = await ctx.tools.llm.tokenUsageEstimator(typedInput.llm.prompt);

        const estimatedTotalTokens = estimatedInputTokens + typedInput.llm.maxTokensPerRequest!;

        const rateLimitConfig: RateLimitConfig = {
            type: "token-bucket",
            period: getQuotaPeriod(quota.period),
            limit: quota.limitTokens,
            key: identifierKey,
            cost: estimatedTotalTokens,
        };

        const result = await ctx.tools.rateLimit.checkRateLimit(
            ctx.tools.storage.get("rateLimit") as RateLimitStorage,
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
    usage: z.infer<typeof tokenUsageSchema>,
    context: WithLLMContext<TContext>,
    ruleResult: RuleResult
) {
    const meta = ruleResult.meta as TokenQuotaRuleResultMeta;
    if (!ruleResult.allowed || ruleResult.skipped) {
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
