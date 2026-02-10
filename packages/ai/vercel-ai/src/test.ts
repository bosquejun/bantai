import { defineContext, definePolicy } from "@bantai-dev/core";
import { bantaiLLM, defineTokenQuotaRule, withLLMContext } from "@bantai-dev/llm";
import { createRedisStorage } from "@bantai-dev/storage-redis";
import { rateLimit } from "@bantai-dev/with-rate-limit";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { vercelAI } from "./provider.js";

const API_KEY = "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";

const storage = createRedisStorage(
    {
        url: "rediss://default:AandAAIncDIxODM4ODhlYTBkNGM0YTNhOWNkYjU2OTgzNDRiY2MzN3AyNDM0ODU@devoted-tick-43485.upstash.io:6379",
    },
    rateLimit.storageSchema
);

const openrouter = createOpenRouter({
    apiKey: API_KEY,
});

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
            free: 10_000,
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
            free: 100_000,
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
});

const policy = definePolicy(llmContext, "Token Quota Policy", [
    dailyUserTokenQuotaRule,
    dailyOrgTokenQuotaRule,
]);

const openaiAdapter = vercelAI(openrouter("openrouter/free"));

const llm = bantaiLLM(openaiAdapter, {
    policies: [policy],
});

const response = await llm.generateText({
    llm: {
        prompt: "Give me a short story about a cat",
    },
    tier: "free",
    userId: "123",
});

console.log(response.text);
