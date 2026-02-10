import { defineContext, definePolicy } from "@bantai-dev/core";
import { defineTokenQuotaRule, withBantaiLLM, withLLMContext, } from "@bantai-dev/llm";
import { z } from "zod";
import { openai } from "./provider.js";


const appContext = defineContext(z.object({
    userId: z.string(),
    tier: z.enum(["free", "premium", "enterprise"]),
}));

const llmContext = withLLMContext(appContext);

const dailyTokenQuotaRule = defineTokenQuotaRule(llmContext, "Daily Token Quota", {
    quota(input){
        const tieredLimit = {
            free: 10_000,
            premium: 50_000,
            enterprise: 150_000,
        };
        return {
            limitTokens: tieredLimit[input.tier],
            period: "daily",
        }
    },
    identifier(input) {
        return `${input.tier}:${input.userId}`
    },
});


const policy = definePolicy(llmContext, "Token Quota Policy", [dailyTokenQuotaRule]);


const openaiAdapter = openai("gpt-4o-mini", {
    providerOptions: {
        apiKey: process.env.OPENAI_API_KEY,
    },
});


const bantaiLLM = withBantaiLLM(openaiAdapter, {
    preRequestPolicies: [policy],
});

const response = await bantaiLLM.generateText({
    llm:{
        input:{
            prompt: "What is the capital of France?",
        },
    },
    tier:'free',
    userId: "123",
})

console.log(response.text);