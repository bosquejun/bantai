import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * Rate Limiting Example
 *
 * This example demonstrates API rate limiting policies including:
 * - Per-user rate limiting
 * - Endpoint-specific rate limits
 * - Time window-based rate limiting
 * - Request count tracking
 *
 * Strategy: Preemptive (fail fast on rate limit)
 */

// Define the context schema for rate limiting
const rateLimitingSchema = z.object({
    userId: z.string(),
    endpoint: z.string(),
    timestamp: z.number().int(), // Unix timestamp in milliseconds
    requestCount: z.number().int().min(0), // Number of requests in current time window
});

// Create the context
const rateLimitingContext = defineContext(rateLimitingSchema);

// Default rate limits (requests per time window)
const DEFAULT_RATE_LIMIT = 100; // requests per hour
const DEFAULT_TIME_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Endpoint-specific rate limits
const ENDPOINT_RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
    "/api/auth/login": { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
    "/api/auth/register": { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
    "/api/payment/process": { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
    "/api/data/export": { limit: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 requests per day
    "/api/search": { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
    "/api/upload": { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 requests per hour
};

// User tier-based rate limits
const USER_TIER_LIMITS: Record<string, { limit: number; windowMs: number }> = {
    free: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 requests per hour
    premium: { limit: 1000, windowMs: 60 * 60 * 1000 }, // 1000 requests per hour
    enterprise: { limit: 10000, windowMs: 60 * 60 * 1000 }, // 10000 requests per hour
};

/**
 * Rule: Check rate limit based on request count
 */
const rateLimitCheck = defineRule(rateLimitingContext, "rate-limit-check", async (input) => {
    const endpointConfig = ENDPOINT_RATE_LIMITS[input.endpoint];
    const limit = endpointConfig?.limit || DEFAULT_RATE_LIMIT;
    const windowMs = endpointConfig?.windowMs || DEFAULT_TIME_WINDOW;

    if (input.requestCount >= limit) {
        return deny({
            reason: `Rate limit exceeded: ${input.requestCount}/${limit} requests in the last ${windowMs / 1000 / 60} minutes`,
        });
    }

    return allow({
        reason: `Rate limit OK: ${input.requestCount}/${limit} requests in the current window`,
    });
});

/**
 * Rule: Check endpoint-specific rate limits
 */
const endpointSpecificLimit = defineRule(
    rateLimitingContext,
    "endpoint-specific-limit",
    async (input) => {
        const endpointConfig = ENDPOINT_RATE_LIMITS[input.endpoint];

        if (!endpointConfig) {
            // No specific limit for this endpoint, use default
            return allow({
                reason: `No specific rate limit for endpoint ${input.endpoint}, using default`,
            });
        }

        const { limit, windowMs } = endpointConfig;

        if (input.requestCount >= limit) {
            const windowMinutes = Math.floor(windowMs / 1000 / 60);
            return deny({
                reason: `Endpoint ${input.endpoint} rate limit exceeded: ${input.requestCount}/${limit} requests per ${windowMinutes} minutes`,
            });
        }

        return allow({
            reason: `Endpoint ${input.endpoint} rate limit OK: ${input.requestCount}/${limit} requests`,
        });
    }
);

/**
 * Rule: Check time window validity
 */
const timeWindowCheck = defineRule(rateLimitingContext, "time-window-check", async (input) => {
    const endpointConfig = ENDPOINT_RATE_LIMITS[input.endpoint];
    const windowMs = endpointConfig?.windowMs || DEFAULT_TIME_WINDOW;
    const currentTime = Date.now();
    const windowStart = currentTime - windowMs;

    // Check if the timestamp is within the current window
    // In a real implementation, you'd check against stored request timestamps
    // This is a simplified check
    if (input.timestamp < windowStart) {
        // Timestamp is outside the current window, reset would be needed
        return allow({
            reason: "Request timestamp is outside current rate limit window",
        });
    }

    return allow({
        reason: "Request timestamp is within current rate limit window",
    });
});

// Define the policy with all rules
const rateLimitingPolicy = definePolicy(
    rateLimitingContext,
    "rate-limiting-policy",
    [rateLimitCheck, endpointSpecificLimit, timeWindowCheck],
    {
        defaultStrategy: "preemptive", // Fail fast on rate limit
    }
);

// Example usage scenarios
async function runExamples() {
    console.log("=== Rate Limiting Examples ===\n");

    // Example 1: Valid request within limit
    console.log("Example 1: Valid request within limit");
    const result1 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/search",
        timestamp: Date.now(),
        requestCount: 50,
    });
    console.log("Result:", result1);
    console.log("Decision:", result1.decision);
    console.log("Reason:", result1.reason);
    console.log();

    // Example 2: Rate limit exceeded
    console.log("Example 2: Rate limit exceeded");
    const result2 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/search",
        timestamp: Date.now(),
        requestCount: 150,
    });
    console.log("Result:", result2);
    console.log("Decision:", result2.decision);
    console.log("Reason:", result2.reason);
    if (result2.violatedRules.length > 0) {
        console.log("Violated rule:", result2.violatedRules[0]?.name);
        console.log("Violation reason:", result2.violatedRules[0]?.result.reason);
    }
    console.log();

    // Example 3: Endpoint-specific limit (login)
    console.log("Example 3: Endpoint-specific limit (login)");
    const result3 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/auth/login",
        timestamp: Date.now(),
        requestCount: 6, // Exceeds limit of 5
    });
    console.log("Result:", result3);
    console.log("Decision:", result3.decision);
    if (result3.violatedRules.length > 0) {
        console.log("Violated rule:", result3.violatedRules[0]?.name);
        console.log("Violation reason:", result3.violatedRules[0]?.result.reason);
    }
    console.log();

    // Example 4: Endpoint-specific limit (payment)
    console.log("Example 4: Endpoint-specific limit (payment)");
    const result4 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/payment/process",
        timestamp: Date.now(),
        requestCount: 11, // Exceeds limit of 10
    });
    console.log("Result:", result4);
    console.log("Decision:", result4.decision);
    if (result4.violatedRules.length > 0) {
        console.log("Violated rule:", result4.violatedRules[0]?.name);
        console.log("Violation reason:", result4.violatedRules[0]?.result.reason);
    }
    console.log();

    // Example 5: Valid request for sensitive endpoint
    console.log("Example 5: Valid request for sensitive endpoint");
    const result5 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/auth/register",
        timestamp: Date.now(),
        requestCount: 2, // Within limit of 3
    });
    console.log("Result:", result5);
    console.log("Decision:", result5.decision);
    console.log();

    // Example 6: Data export endpoint (daily limit)
    console.log("Example 6: Data export endpoint (daily limit)");
    const result6 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/data/export",
        timestamp: Date.now(),
        requestCount: 6, // Exceeds limit of 5 per day
    });
    console.log("Result:", result6);
    console.log("Decision:", result6.decision);
    if (result6.violatedRules.length > 0) {
        console.log("Violated rule:", result6.violatedRules[0]?.name);
        console.log("Violation reason:", result6.violatedRules[0]?.result.reason);
    }
    console.log();

    // Example 7: Default endpoint (no specific limit)
    console.log("Example 7: Default endpoint (no specific limit)");
    const result7 = await evaluatePolicy(rateLimitingPolicy, {
        userId: "user123",
        endpoint: "/api/unknown",
        timestamp: Date.now(),
        requestCount: 50, // Within default limit of 100
    });
    console.log("Result:", result7);
    console.log("Decision:", result7.decision);
    console.log();
}

// Export for use in other files
export {
    endpointSpecificLimit,
    rateLimitCheck,
    rateLimitingContext,
    rateLimitingPolicy,
    timeWindowCheck,
};

// Run examples if this file is executed directly
runExamples().catch(console.error);
