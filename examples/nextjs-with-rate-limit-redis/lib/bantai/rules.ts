import { allow, skip } from "@bantai-dev/core";
import { defineRateLimitRule } from "@bantai-dev/with-rate-limit";
import context from "./context";

export const defaultLimitRule = defineRateLimitRule(
    context,
    "default-limit",
    async () => {
        return allow();
    },
    {
        config: {
            limit: 50,
            period: "1m",
            type: "sliding-window",
        },
    }
);

export const mutationLimitRule = defineRateLimitRule(
    context,
    "mutation-limit",
    async (input) => {
        if (["GET", "HEAD"].includes(input.method)) {
            return skip();
        }
        return allow();
    },
    {
        config: {
            limit: 5,
            period: "1m",
            type: "sliding-window",
        },
    }
);

export const signupLimitRule = defineRateLimitRule(
    context,
    "signup-limit",
    async (input) => {
        if (input.method !== "POST" || input.endpoint !== "/api/signup") {
            return skip();
        }
        return allow();
    },
    {
        config: {
            limit: 1,
            period: "1h",
            type: "fixed-window",
        },
    }
);

export const aiGenerateLimitRule = defineRateLimitRule(
    context,
    "ai-generate-limit",
    async (input) => {
        if (input.endpoint !== "/api/generate") {
            return skip();
        }
        return allow();
    },
    {
        config: {
            type: "token-bucket",
            limit: 1_000,
            period: "5m",
        },
    }
);
