import { definePolicy } from "@bantai-dev/core";
import context from "./context";
import { aiGenerateLimitRule, defaultLimitRule, mutationLimitRule } from "./rules";

export const rateLimitPolicy = definePolicy(context, "rate-limit-policy", [
    defaultLimitRule,
    mutationLimitRule,
]);

export const aiGenerationPolicy = definePolicy(
    context,
    "ai-generation-policy",
    [aiGenerateLimitRule],
    {
        defaultStrategy: "preemptive",
    }
);
