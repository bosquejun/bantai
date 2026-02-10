import { allow, defineContext, definePolicy, evaluatePolicy } from "@bantai-dev/core";
import z from "zod";
import { defineRateLimitRule } from "./index.js";
import { withRateLimit } from "./with-rate-limit.js";

const s = z.object({
    userId: z.string(),
    endpoint: z.string(),
});

const c = defineContext(s);

const rateLimitContext = withRateLimit(c);

const rateLimit = defineRateLimitRule(
    rateLimitContext,
    "rateLimit",
    async (input) => {
        return allow({ reason: "Rate limit exceeded" });
    },
    {
        config: {
            limit: 1,
            period: "1m",
            type: "fixed-window",
        },
    }
);

const policy = definePolicy(rateLimitContext, "rateLimitPolicy", [rateLimit]);

const result = await evaluatePolicy(policy, {
    userId: "123",
    endpoint: "/api/test",
});
const result1 = await evaluatePolicy(policy, {
    userId: "123",
    endpoint: "/api/test",
});

console.log(result);

console.log(result1);
