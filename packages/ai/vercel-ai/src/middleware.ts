import {
    evaluatePolicy,
    throwPolicyViolationErrorOnDeny,
    type ContextDefinition,
    type ExtractContextInput,
    type PolicyDefinition,
    type PolicyResult,
    type RuleDefinition,
} from "@bantai-dev/core";
import {
    consumeTokenQuota,
    llmGenerateTextInputSchema,
    type WithLLMContext,
} from "@bantai-dev/llm";
import { type LanguageModel, type LanguageModelMiddleware, wrapLanguageModel } from "ai";
import { z } from "zod";

export type BantaiMiddlewareOptions = {
    policies: PolicyDefinition<WithLLMContext<any>, any, any>[];
    /**
     * User-defined context values that match the policy's context schema,
     * e.g. { user: { id: "u_123", tier: "free" } }
     */
    contextInput: Record<string, unknown>;
};

type EvaluationEntry = {
    policy: PolicyDefinition<WithLLMContext<any>, any, any>;
    result: PolicyResult;
};

// Convert a LanguageModelV3Prompt (union content types) into the flat
// { role, content: string }[] format expected by bantai's llmGenerateTextInputSchema.
function extractTextFromPrompt(
    prompt: { role: string; content: string | Array<{ type: string; [key: string]: unknown }> }[]
): { role: "user" | "system" | "assistant"; content: string }[] {
    const allowed = ["user", "system", "assistant"];
    return prompt.flatMap((msg) => {
        if (!allowed.includes(msg.role)) return [];
        const role = msg.role as "user" | "system" | "assistant";
        if (typeof msg.content === "string") {
            return [{ role, content: msg.content }];
        }
        const text = msg.content
            .filter((p) => p.type === "text")
            .map((p) => String(p["text"] ?? ""))
            .join("");
        return [{ role, content: text }];
    });
}

function toTokenUsage(usage: {
    inputTokens: { total?: number | undefined } | number | undefined;
    outputTokens: { total?: number | undefined } | number | undefined;
}) {
    // LanguageModelV3Usage has nested inputTokens/outputTokens objects.
    // Guard against both shapes (nested v3 and flat v2) just in case.
    const input =
        typeof usage.inputTokens === "object" ? (usage.inputTokens?.total ?? 0) : (usage.inputTokens ?? 0);
    const output =
        typeof usage.outputTokens === "object" ? (usage.outputTokens?.total ?? 0) : (usage.outputTokens ?? 0);
    return { inputTokens: input, outputTokens: output, totalTokens: input + output };
}

async function runPolicies(
    policies: BantaiMiddlewareOptions["policies"],
    contextInput: Record<string, unknown>,
    llmInput: z.infer<typeof llmGenerateTextInputSchema>
): Promise<EvaluationEntry[]> {
    const input = { ...contextInput, llm: llmInput };
    const evaluation: EvaluationEntry[] = [];
    for (const policy of policies) {
        const result = await evaluatePolicy(
            policy,
            input as ExtractContextInput<typeof policy>
        );
        throwPolicyViolationErrorOnDeny(result, policy, "Bantai policy violation");
        evaluation.push({ policy, result });
    }
    return evaluation;
}

async function consumeAll(
    evaluation: EvaluationEntry[],
    usage: { inputTokens: number; outputTokens: number; totalTokens: number }
) {
    for (const { result, policy } of evaluation) {
        if (result.decision === "deny") continue;
        for (const { result: ruleResult } of result.evaluatedRules) {
            await consumeTokenQuota(usage, policy.context as WithLLMContext, ruleResult);
        }
    }
}

export function createBantaiMiddleware(options: BantaiMiddlewareOptions): LanguageModelMiddleware {
    const { policies, contextInput } = options;

    return {
        specificationVersion: "v3",

        async wrapGenerate({ doGenerate, params, model }) {
            const llmInput = llmGenerateTextInputSchema.parse({
                model: model.modelId,
                prompt: extractTextFromPrompt(
                    params.prompt as Parameters<typeof extractTextFromPrompt>[0]
                ),
                maxTokensPerRequest: params.maxOutputTokens,
            });

            const evaluation = await runPolicies(policies, contextInput, llmInput);
            const response = await doGenerate();

            await consumeAll(evaluation, toTokenUsage(response.usage as Parameters<typeof toTokenUsage>[0]));

            return response;
        },

        async wrapStream({ doStream, params, model }) {
            const llmInput = llmGenerateTextInputSchema.parse({
                model: model.modelId,
                prompt: extractTextFromPrompt(
                    params.prompt as Parameters<typeof extractTextFromPrompt>[0]
                ),
                maxTokensPerRequest: params.maxOutputTokens,
            });

            const evaluation = await runPolicies(policies, contextInput, llmInput);
            const { stream, ...rest } = await doStream();

            const wrappedStream = new ReadableStream<(typeof stream extends ReadableStream<infer T> ? T : never)>({
                async start(controller) {
                    const reader = stream.getReader();
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            if (value.type === "finish") {
                                await consumeAll(
                                    evaluation,
                                    toTokenUsage(
                                        (value as { type: "finish"; usage: Parameters<typeof toTokenUsage>[0] })
                                            .usage
                                    )
                                );
                            }

                            controller.enqueue(value);
                        }
                        controller.close();
                    } catch (err) {
                        controller.error(err);
                    }
                },
            });

            return { stream: wrappedStream, ...rest };
        },
    };
}

/**
 * Wraps a Vercel AI SDK language model with bantai policies.
 * The returned model enforces the given policies on every
 * generateText, streamText, and generateObject call automatically.
 *
 * @example
 * const protectedModel = withBantaiPolicies(openrouter("gpt-4o-mini"), {
 *     policies: [tokenQuotaPolicy],
 *     contextInput: { user: { id: req.user.id, tier: "free" } },
 * });
 * await generateText({ model: protectedModel, prompt: "Hello" });
 */
export function withBantaiPolicies(
    model: LanguageModel,
    options: BantaiMiddlewareOptions
): LanguageModel {
    return wrapLanguageModel({
        model: model as Parameters<typeof wrapLanguageModel>[0]["model"],
        middleware: createBantaiMiddleware(options),
    });
}
