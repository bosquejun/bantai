import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * AI Token Quota Example
 *
 * This example demonstrates AI token quota management with quality degrading:
 * - Daily token quota limits
 * - Single request size limits
 * - Tier-based limits (free, premium, enterprise)
 * - Quality degradation when approaching limits
 * - Time window management
 *
 * Strategy: Exhaustive (collect all quota violations for user feedback)
 */

// Define the context schema for AI token quota
const aiTokenQuotaSchema = z.object({
	userId: z.string(),
	model: z.string(), // AI model name (e.g., 'gpt-4', 'claude-3')
	tokensUsed: z.number().int().min(0), // Tokens used in current time window
	tokensRequested: z.number().int().min(0), // Tokens requested in this request
	tier: z.enum(["free", "premium", "enterprise"]),
	timeWindow: z.enum(["hour", "day", "month"]),
});

// Create the context
const aiTokenQuotaContext = defineContext(aiTokenQuotaSchema);

// Tier-based daily token quotas
const TIER_QUOTAS: Record<
	string,
	{ daily: number; hourly: number; monthly: number }
> = {
	free: {
		daily: 10000, // 10k tokens per day
		hourly: 1000, // 1k tokens per hour
		monthly: 100000, // 100k tokens per month
	},
	premium: {
		daily: 100000, // 100k tokens per day
		hourly: 10000, // 10k tokens per hour
		monthly: 2000000, // 2M tokens per month
	},
	enterprise: {
		daily: 1000000, // 1M tokens per day
		hourly: 100000, // 100k tokens per hour
		monthly: 20000000, // 20M tokens per month
	},
};

// Model-specific limits (max tokens per request)
const MODEL_LIMITS: Record<string, number> = {
	"gpt-4": 8192,
	"gpt-4-turbo": 128000,
	"gpt-3.5-turbo": 16385,
	"claude-3-opus": 200000,
	"claude-3-sonnet": 200000,
	"claude-3-haiku": 200000,
};

// Default model limit
const DEFAULT_MODEL_LIMIT = 4096;

// Quality degradation thresholds (percentage of quota used)
const DEGRADATION_THRESHOLDS = {
	warning: 0.7, // 70% - warn user
	degrade: 0.85, // 85% - start degrading quality
	critical: 0.95, // 95% - severe degradation
};

/**
 * Rule: Check daily token quota
 */
const dailyQuotaCheck = defineRule(
	aiTokenQuotaContext,
	"daily-quota-check",
	async (input) => {
		const quota = TIER_QUOTAS[input.tier];
		if (!quota) {
			return deny({
				reason: `Invalid tier: ${input.tier}`,
			});
		}

		const quotaLimit =
			quota[
				input.timeWindow === "day"
					? "daily"
					: input.timeWindow === "hour"
						? "hourly"
						: "monthly"
			];
		const totalAfterRequest = input.tokensUsed + input.tokensRequested;

		if (totalAfterRequest > quotaLimit) {
			return deny({
				reason: `Token quota exceeded: ${input.tokensUsed}/${quotaLimit} tokens used, requesting ${input.tokensRequested} more would exceed ${input.timeWindow} limit`,
			});
		}

		// Check degradation thresholds
		const usagePercent = totalAfterRequest / quotaLimit;
		if (usagePercent >= DEGRADATION_THRESHOLDS.critical) {
			return allow({
				reason: `Token quota critical: ${Math.round(usagePercent * 100)}% used. Quality will be severely degraded.`,
			});
		}

		if (usagePercent >= DEGRADATION_THRESHOLDS.degrade) {
			return allow({
				reason: `Token quota high: ${Math.round(usagePercent * 100)}% used. Quality degradation may apply.`,
			});
		}

		if (usagePercent >= DEGRADATION_THRESHOLDS.warning) {
			return allow({
				reason: `Token quota warning: ${Math.round(usagePercent * 100)}% used. Approaching limit.`,
			});
		}

		return allow({
			reason: `Token quota OK: ${input.tokensUsed}/${quotaLimit} tokens used (${Math.round(usagePercent * 100)}%)`,
		});
	}
);

/**
 * Rule: Check single request size
 */
const requestSizeCheck = defineRule(
	aiTokenQuotaContext,
	"request-size-check",
	async (input) => {
		const modelLimit = MODEL_LIMITS[input.model] || DEFAULT_MODEL_LIMIT;

		if (input.tokensRequested > modelLimit) {
			return deny({
				reason: `Request size exceeds model limit: ${input.tokensRequested} tokens requested, but ${input.model} has a limit of ${modelLimit} tokens per request`,
			});
		}

		// Check against tier-based single request limits
		const tierRequestLimits: Record<string, number> = {
			free: 2000,
			premium: 8000,
			enterprise: 50000,
		};

		const tierLimit = tierRequestLimits[input.tier];
		if (input.tokensRequested > tierLimit) {
			return deny({
				reason: `Request size exceeds tier limit: ${input.tokensRequested} tokens requested, but ${input.tier} tier has a limit of ${tierLimit} tokens per request`,
			});
		}

		return allow({
			reason: `Request size OK: ${input.tokensRequested} tokens requested (within ${input.model} limit of ${modelLimit} and ${input.tier} tier limit of ${tierLimit})`,
		});
	}
);

/**
 * Rule: Check tier-based limits
 */
const tierLimitCheck = defineRule(
	aiTokenQuotaContext,
	"tier-limit-check",
	async (input) => {
		const quota = TIER_QUOTAS[input.tier];
		if (!quota) {
			return deny({
				reason: `Invalid tier: ${input.tier}`,
			});
		}

		const quotaLimit =
			quota[
				input.timeWindow === "day"
					? "daily"
					: input.timeWindow === "hour"
						? "hourly"
						: "monthly"
			];
		const remaining = quotaLimit - input.tokensUsed;

		if (remaining < input.tokensRequested) {
			return deny({
				reason: `Insufficient quota remaining: ${remaining} tokens remaining, but ${input.tokensRequested} tokens requested for ${input.tier} tier`,
			});
		}

		return allow({
			reason: `Tier limit OK: ${remaining} tokens remaining for ${input.tier} tier`,
		});
	}
);

/**
 * Rule: Apply quality degradation when approaching limits
 */
const degradingQuality = defineRule(
	aiTokenQuotaContext,
	"degrading-quality",
	async (input) => {
		const quota = TIER_QUOTAS[input.tier];
		if (!quota) {
			return allow({
				reason: "Invalid tier, skipping quality degradation check",
			});
		}

		const quotaLimit =
			quota[
				input.timeWindow === "day"
					? "daily"
					: input.timeWindow === "hour"
						? "hourly"
						: "monthly"
			];
		const totalAfterRequest = input.tokensUsed + input.tokensRequested;
		const usagePercent = totalAfterRequest / quotaLimit;

		if (usagePercent >= DEGRADATION_THRESHOLDS.critical) {
			// At 95%+, suggest using a cheaper/faster model
			return allow({
				reason: `CRITICAL: ${Math.round(usagePercent * 100)}% quota used. Recommend switching to a faster/cheaper model (e.g., gpt-3.5-turbo or claude-3-haiku)`,
			});
		}

		if (usagePercent >= DEGRADATION_THRESHOLDS.degrade) {
			// At 85%+, suggest reducing request size
			return allow({
				reason: `WARNING: ${Math.round(usagePercent * 100)}% quota used. Consider reducing request size or using a more efficient model`,
			});
		}

		if (usagePercent >= DEGRADATION_THRESHOLDS.warning) {
			// At 70%+, just warn
			return allow({
				reason: `NOTICE: ${Math.round(usagePercent * 100)}% quota used. Monitor usage to avoid hitting limits`,
			});
		}

		return allow({
			reason: `Quality OK: ${Math.round(usagePercent * 100)}% quota used, no degradation needed`,
		});
	}
);

// Define the policy with all rules
const aiTokenQuotaPolicy = definePolicy(
	aiTokenQuotaContext,
	"ai-token-quota-policy",
	[dailyQuotaCheck, requestSizeCheck, tierLimitCheck, degradingQuality],
	{
		defaultStrategy: "exhaustive", // Collect all quota violations
	}
);

// Example usage scenarios
async function runExamples() {
	console.log("=== AI Token Quota Examples ===\n");

	// Example 1: Valid request within free tier limits
	console.log("Example 1: Valid request within free tier limits");
	const result1 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-3.5-turbo",
		tokensUsed: 5000,
		tokensRequested: 1000,
		tier: "free",
		timeWindow: "day",
	});
	console.log("Result:", result1);
	console.log("Decision:", result1.decision);
	console.log("Reason:", result1.reason);
	console.log();

	// Example 2: Exceeding daily quota
	console.log("Example 2: Exceeding daily quota");
	const result2 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-3.5-turbo",
		tokensUsed: 9500,
		tokensRequested: 2000, // Would exceed 10k limit
		tier: "free",
		timeWindow: "day",
	});
	console.log("Result:", result2);
	console.log("Decision:", result2.decision);
	if (result2.violatedRules.length > 0) {
		result2.violatedRules.forEach((violation) => {
			console.log(`  - ${violation.name}: ${violation.result.reason}`);
		});
	}
	console.log();

	// Example 3: Request size exceeds model limit
	console.log("Example 3: Request size exceeds model limit");
	const result3 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-3.5-turbo",
		tokensUsed: 5000,
		tokensRequested: 20000, // Exceeds gpt-3.5-turbo limit of 16385
		tier: "free",
		timeWindow: "day",
	});
	console.log("Result:", result3);
	console.log("Decision:", result3.decision);
	if (result3.violatedRules.length > 0) {
		result3.violatedRules.forEach((violation) => {
			console.log(`  - ${violation.name}: ${violation.result.reason}`);
		});
	}
	console.log();

	// Example 4: Approaching quota limit (degradation warning)
	console.log("Example 4: Approaching quota limit (degradation warning)");
	const result4 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-4",
		tokensUsed: 8500, // 85% of 10k
		tokensRequested: 500,
		tier: "free",
		timeWindow: "day",
	});
	console.log("Result:", result4);
	console.log("Decision:", result4.decision);
	console.log("All rule results:");
	result4.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 5: Premium tier with higher limits
	console.log("Example 5: Premium tier with higher limits");
	const result5 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "premium1",
		model: "gpt-4-turbo",
		tokensUsed: 50000,
		tokensRequested: 10000,
		tier: "premium",
		timeWindow: "day",
	});
	console.log("Result:", result5);
	console.log("Decision:", result5.decision);
	console.log();

	// Example 6: Critical quota usage
	console.log("Example 6: Critical quota usage");
	const result6 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-3.5-turbo",
		tokensUsed: 9600, // 96% of 10k
		tokensRequested: 200,
		tier: "free",
		timeWindow: "day",
	});
	console.log("Result:", result6);
	console.log("Decision:", result6.decision);
	console.log();

	// Example 7: Enterprise tier large request
	console.log("Example 7: Enterprise tier large request");
	const result7 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "enterprise1",
		model: "claude-3-opus",
		tokensUsed: 500000,
		tokensRequested: 30000,
		tier: "enterprise",
		timeWindow: "day",
	});
	console.log("Result:", result7);
	console.log("Decision:", result7.decision);
	console.log();

	// Example 8: Hourly quota check
	console.log("Example 8: Hourly quota check");
	const result8 = await evaluatePolicy(aiTokenQuotaPolicy, {
		userId: "user123",
		model: "gpt-3.5-turbo",
		tokensUsed: 800, // 80% of 1k hourly limit
		tokensRequested: 150,
		tier: "free",
		timeWindow: "hour",
	});
	console.log("Result:", result8);
	console.log("Decision:", result8.decision);
	console.log();
}

// Export for use in other files
export {
	aiTokenQuotaContext,
	aiTokenQuotaPolicy,
	dailyQuotaCheck,
	degradingQuality,
	requestSizeCheck,
	tierLimitCheck,
};

runExamples();
