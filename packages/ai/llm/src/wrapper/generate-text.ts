import { WithLLMContext } from "@/context.js";
import { consumeTokenQuota } from "@/index.js";
import { LLMProvider, LLMProviderInput } from "@/provider.js";
import {
    GenerateTextOutput,
    InferGenerateTextOutput,
    generateTextOutputSchema,
    llmGenerateTextInputSchema,
} from "@/schema.js";
import {
    ContextDefinition,
    ExtractContextInput,
    PolicyDefinition,
    PolicyResult,
    RuleDefinition,
    evaluatePolicy,
    throwPolicyViolationErrorOnDeny,
} from "@bantai-dev/core";
import { z } from "zod";

export type GenerateTextSettings<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
    TGenerateTextOptions,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = {
    /** Schema-agnostic so TOutputSchema is inferred from input only */
    provider: LLMProvider<any, TGenerateTextOptions, z.ZodObject<z.ZodRawShape>>;
    input: LLMProviderInput<TContext, TOutputSchema>;
    policies: PolicyDefinition<TContext, TName, TRules>[];
    providerOptions?: TGenerateTextOptions;
};

export async function generateText<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
    TGenerateTextOptions,
    TGenerateProviderResponse,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>(
    settings: GenerateTextSettings<TContext, TName, TRules, TGenerateTextOptions, TOutputSchema>
): Promise<GenerateTextOutput<TGenerateProviderResponse, InferGenerateTextOutput<TOutputSchema>>> {
    const { provider, input, providerOptions, policies } = settings;

    const evaluation: {
        policy: PolicyDefinition<TContext, string, readonly RuleDefinition<TContext, string>[]>;
        result: PolicyResult;
    }[] = [];

    const effectiveInput = {
        ...input,
        llm: llmGenerateTextInputSchema.parse({
            ...input.llm,
            model: input.llm.model || provider.defaultModel,
        }),
    };

    // evaluate policies
    for (const policy of policies) {
        const result = await evaluatePolicy(
            policy,
            effectiveInput as ExtractContextInput<typeof policy>
        );

        throwPolicyViolationErrorOnDeny(result, policy, "LLM generate text policy violation");

        evaluation.push({ policy, result });
    }

    // execute provider's generateText method
    const response = await provider.generateText(
        effectiveInput as LLMProviderInput<TContext, TOutputSchema>,
        { providerOptions }
    );

    // apply side effects like token quota consumption
    for (const { result, policy } of evaluation) {
        if (result.decision === "deny") {
            continue;
        }
        for (const ruleResult of result.evaluatedRules) {
            await consumeTokenQuota(
                response.usage,
                policy.context as WithLLMContext<TContext>,
                ruleResult.result
            );
        }
    }

    const output = generateTextOutputSchema(input.llm.outputSchema).parse({
        ...response,
        evaluation: evaluation.map(({ result }) => result),
    });

    // return response with evaluation (cast preserves TOutputSchema inference for output)
    return output as unknown as GenerateTextOutput<
        TGenerateProviderResponse,
        InferGenerateTextOutput<TOutputSchema>
    >;
}
