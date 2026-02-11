import { PolicyViolationError, allow, defineContext, definePolicy, skip } from "@bantai-dev/core";
import { defineTokenQuotaRule, generateText, withLLMContext } from "@bantai-dev/llm";
import { createRedisStorage } from "@bantai-dev/storage-redis";
import { rateLimit } from "@bantai-dev/with-rate-limit";
import { z } from "zod";
import { openai } from "./provider.js";

const storage = createRedisStorage(
    {
        url: process.env.REDIS_URL,
    },
    rateLimit.storageSchema
);

const appContext = defineContext(
    z.object({
        userId: z.string().optional(),
        orgId: z.string().optional(),
        tier: z.enum(["free", "premium", "enterprise"]),
    })
);

const llmContext = withLLMContext(appContext, {
    storage,
});

const dailyUserTokenQuotaRule = defineTokenQuotaRule(llmContext, "Daily Token Quota", {
    quota(input) {
        const tieredLimit = {
            free: 5_000,
            premium: 50_000,
            enterprise: 150_000,
        };
        return {
            limitTokens: tieredLimit[input.tier],
            period: "daily",
        };
    },
    identifier(input) {
        return `${input.tier}:user:${input.userId || "anonymous"}`;
    },
});

const dailyOrgTokenQuotaRule = defineTokenQuotaRule(llmContext, "Daily Org Token Quota", {
    quota(input) {
        const tieredOrgLimit = {
            free: 0,
            premium: 500_000,
            enterprise: 1_500_000,
        };
        return {
            limitTokens: tieredOrgLimit[input.tier],
            period: "daily",
        };
    },
    identifier(input) {
        return `${input.tier}:org:${input.orgId || "default"}`;
    },
    async evaluate(input) {
        if (!input.orgId) {
            return skip({ reason: "No token quota for non-org users" });
        }
        return allow({ reason: "Org token quota allowed" });
    },
});

const policy = definePolicy(llmContext, "Token Quota Policy", [
    dailyUserTokenQuotaRule,
    dailyOrgTokenQuotaRule,
]);

try {
    console.log("Generating text...");
    const response = await generateText({
        provider: openai("gpt-4o"),
        policies: [policy],
        input: {
            llm: {
                prompt: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that generates short stories about cats. Please follow the following instructions: 
                    
                    - The story should be at least 1000 characters long.
                    - The excerpt should be a summary of the story. 100 characters max and 20 characters min.
                    - The title should be a short title for the story. 50 characters max and 10 characters min.
                    - The story should be written in a way that is easy to understand and follow.
                    - The story should be written in a way that is engaging and interesting.
                    - The story should be written in a way that is grammatically correct.
                    - The story should be written in a way that is easy to understand.
                    `,
                    },
                    {
                        role: "user",
                        content: "Give me a short story about a cat",
                    },
                ],
                maxTokensPerRequest: 100,
                outputSchema: z.object({
                    story: z.string().min(1000),
                    title: z.string().max(50).min(10),
                    excerpt: z.string().max(100).min(20),
                }),
            },
            tier: "free",
            userId: "1234567890",
        },
    });

    console.log(response.output);

    process.exit(0);
} catch (error) {
    if (PolicyViolationError.isPolicyViolationError(error)) {
        error.prettyPrint();
    } else {
        console.error(error);
    }
}
