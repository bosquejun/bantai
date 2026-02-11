import { WithLLMContext } from "@/context.js";
import { consumeTokenQuota } from "@/index.js";
import { LLMProvider, LLMProviderInput } from "@/provider.js";
import { llmGenerateTextInputSchema } from "@/schema.js";
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

export type StreamTextSettings<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
    TStreamTextOptions,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = {
    provider: LLMProvider<TContext, TStreamTextOptions, TOutputSchema>;
    input: LLMProviderInput<TContext, TOutputSchema>;
    policies: PolicyDefinition<TContext, TName, TRules>[];
    providerOptions?: TStreamTextOptions;
};

export async function streamText<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TName extends string,
    TRules extends readonly RuleDefinition<TContext, string>[],
    TStreamTextOptions,
    TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>(
    settings: StreamTextSettings<TContext, TName, TRules, TStreamTextOptions, TOutputSchema>
): Promise<ReadableStream<Uint8Array>> {
    const { provider, input, providerOptions, policies } = settings;

    if (!provider.streamText) {
        throw new Error("Provider does not support streaming");
    }

    // Parse input
    const effectiveInput = {
        ...input,
        llm: llmGenerateTextInputSchema.parse({
            ...input.llm,
            model: input.llm.model || provider.defaultModel,
        }),
    };

    // Evaluate policies BEFORE streaming
    const evaluation: {
        policy: PolicyDefinition<TContext, string, readonly RuleDefinition<TContext, string>[]>;
        result: PolicyResult;
    }[] = [];

    for (const policy of policies) {
        const result = await evaluatePolicy(
            policy,
            effectiveInput as ExtractContextInput<typeof policy>
        );

        throwPolicyViolationErrorOnDeny(result, policy, "LLM streamText policy violation");

        evaluation.push({ policy, result });
    }

    // Call provider.streamText, which returns an async iterable
    const asyncIterable = provider.streamText(
        effectiveInput as LLMProviderInput<TContext, TOutputSchema>,
        { providerOptions }
    );

    // Wrap async iterable into a ReadableStream that tracks token usage
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of asyncIterable) {
                    // chunk could be { text: string, usage?: { promptTokens, completionTokens } }
                    if (chunk.usage) {
                        for (const { result, policy } of evaluation) {
                            if (result.decision === "deny") continue;
                            for (const ruleResult of result.evaluatedRules) {
                                await consumeTokenQuota(
                                    chunk.usage,
                                    policy.context as WithLLMContext<TContext>,
                                    ruleResult.result
                                );
                            }
                        }
                    }

                    // Convert text chunk to Uint8Array for stream
                    const encoded = new TextEncoder().encode(chunk.text || "");
                    controller.enqueue(encoded);
                }
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        },
    });
}
