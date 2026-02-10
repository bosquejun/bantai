import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * Banking System Example
 *
 * This example demonstrates banking transaction policies including:
 * - Balance verification
 * - Daily transaction limits
 * - Transaction type permissions
 * - KYC verification for large transactions
 * - Fraud detection patterns
 * - Recipient account validation
 * - Transaction velocity checks
 *
 * Strategy: Preemptive for critical checks, exhaustive for validation
 */

// Define the context schema for banking transactions
const bankingSchema = z.object({
	userId: z.string(),
	accountId: z.string(),
	transactionType: z.enum([
		"transfer",
		"withdrawal",
		"deposit",
		"payment",
		"wire-transfer",
	]),
	amount: z.number().min(0),
	balance: z.number().min(0),
	dailyTotal: z.number().min(0), // Total transactions today
	recipientAccount: z.string().optional(),
	kycStatus: z.enum(["verified", "pending", "unverified"]).optional(),
	transactionCount: z.number().int().min(0).optional(), // Transactions in last hour
});

// Create the context
const bankingContext = defineContext(bankingSchema);

// Daily transaction limits by type
const DAILY_LIMITS: Record<string, number> = {
	transfer: 10000, // $10,000 per day
	withdrawal: 5000, // $5,000 per day
	deposit: 50000, // $50,000 per day
	payment: 5000, // $5,000 per day
	"wire-transfer": 100000, // $100,000 per day
};

// KYC requirement thresholds
const KYC_REQUIREMENT_THRESHOLD = 10000; // $10,000 requires KYC
const ENHANCED_KYC_THRESHOLD = 50000; // $50,000 requires enhanced KYC

// Velocity limits (transactions per hour)
const VELOCITY_LIMIT = 10; // Max 10 transactions per hour

// Fraud detection patterns
const SUSPICIOUS_AMOUNTS = [9999, 99999, 999999]; // Common fraud amounts (just under limits)

/**
 * Rule: Check account balance
 */
const balanceCheck = defineRule(
	bankingContext,
	"balance-check",
	async (input) => {
		// Deposits don't require balance check
		if (input.transactionType === "deposit") {
			return allow({
				reason: "Deposit transaction does not require balance check",
			});
		}

		if (input.balance < input.amount) {
			return deny({
				reason: `Insufficient balance: $${input.amount.toFixed(2)} requested, but only $${input.balance.toFixed(2)} available`,
			});
		}

		// Check minimum balance requirement (e.g., $100 minimum)
		const MIN_BALANCE = 100;
		const balanceAfterTransaction = input.balance - input.amount;
		if (
			balanceAfterTransaction < MIN_BALANCE &&
			input.transactionType !== "withdrawal"
		) {
			return deny({
				reason: `Transaction would leave balance below minimum: $${balanceAfterTransaction.toFixed(2)} is less than minimum $${MIN_BALANCE}`,
			});
		}

		return allow({
			reason: `Balance sufficient: $${input.balance.toFixed(2)} available, $${input.amount.toFixed(2)} requested`,
		});
	}
);

/**
 * Rule: Check daily transaction limits
 */
const dailyLimitCheck = defineRule(
	bankingContext,
	"daily-limit-check",
	async (input) => {
		const dailyLimit = DAILY_LIMITS[input.transactionType];
		if (!dailyLimit) {
			return deny({
				reason: `Unknown transaction type: ${input.transactionType}`,
			});
		}

		const totalAfterTransaction = input.dailyTotal + input.amount;

		if (totalAfterTransaction > dailyLimit) {
			return deny({
				reason: `Daily limit exceeded: $${input.dailyTotal.toFixed(2)} already used today, $${input.amount.toFixed(2)} would exceed ${input.transactionType} limit of $${dailyLimit.toFixed(2)}`,
			});
		}

		return allow({
			reason: `Daily limit OK: $${input.dailyTotal.toFixed(2)}/$${dailyLimit.toFixed(2)} used today for ${input.transactionType}`,
		});
	}
);

/**
 * Rule: Check transaction type permissions
 */
const transactionTypeCheck = defineRule(
	bankingContext,
	"transaction-type-check",
	async (input) => {
		// Wire transfers require special permissions
		if (input.transactionType === "wire-transfer" && input.amount > 10000) {
			// In a real system, you'd check if user has wire transfer permissions
			return allow({
				reason: "Wire transfer requires special permissions (assumed granted)",
			});
		}

		// Large withdrawals may require advance notice
		if (input.transactionType === "withdrawal" && input.amount > 10000) {
			return allow({
				reason: "Large withdrawal may require advance notice",
			});
		}

		return allow({
			reason: `Transaction type ${input.transactionType} is allowed`,
		});
	}
);

/**
 * Rule: Check KYC verification status
 */
const kycVerification = defineRule(
	bankingContext,
	"kyc-verification",
	async (input) => {
		// KYC not required for small transactions
		if (input.amount < KYC_REQUIREMENT_THRESHOLD) {
			return allow({
				reason: `KYC not required for transactions under $${KYC_REQUIREMENT_THRESHOLD}`,
			});
		}

		if (!input.kycStatus) {
			return deny({
				reason: `KYC verification required for transactions of $${input.amount.toFixed(2)} (threshold: $${KYC_REQUIREMENT_THRESHOLD})`,
			});
		}

		if (input.kycStatus === "unverified") {
			return deny({
				reason: `KYC verification required: Account KYC status is ${input.kycStatus}`,
			});
		}

		if (input.kycStatus === "pending") {
			if (input.amount >= ENHANCED_KYC_THRESHOLD) {
				return deny({
					reason: `Enhanced KYC required for transactions of $${input.amount.toFixed(2)} (threshold: $${ENHANCED_KYC_THRESHOLD}). Current status: pending`,
				});
			}
			return allow({
				reason: `KYC status is pending, but transaction amount is below enhanced KYC threshold`,
			});
		}

		// Enhanced KYC check for very large transactions
		if (
			input.amount >= ENHANCED_KYC_THRESHOLD &&
			input.kycStatus !== "verified"
		) {
			return deny({
				reason: `Enhanced KYC verification required for transactions of $${input.amount.toFixed(2)} (threshold: $${ENHANCED_KYC_THRESHOLD})`,
			});
		}

		return allow({
			reason: `KYC verification OK: Status is ${input.kycStatus}`,
		});
	}
);

/**
 * Rule: Basic fraud detection
 */
const fraudDetection = defineRule(
	bankingContext,
	"fraud-detection",
	async (input) => {
		// Check for suspicious amounts (just under limits)
		if (SUSPICIOUS_AMOUNTS.includes(input.amount)) {
			return deny({
				reason: `Suspicious transaction amount detected: $${input.amount.toFixed(2)}. Please contact support.`,
			});
		}

		// Check for round numbers that are unusually large
		if (input.amount % 1000 === 0 && input.amount > 10000) {
			return allow({
				reason: "Large round number transaction detected (may require additional verification)",
			});
		}

		// Check for very small amounts (potential testing)
		if (input.amount < 1 && input.transactionType !== "deposit") {
			return allow({
				reason: "Very small transaction amount detected (may be a test)",
			});
		}

		return allow({
			reason: "No fraud patterns detected",
		});
	}
);

/**
 * Rule: Validate recipient account
 */
const recipientValidation = defineRule(
	bankingContext,
	"recipient-validation",
	async (input) => {
		// Deposits don't need recipient validation
		if (input.transactionType === "deposit") {
			return allow({
				reason: "Deposit transaction does not require recipient validation",
			});
		}

		// Transfers and wire transfers require recipient
		if (
			input.transactionType === "transfer" ||
			input.transactionType === "wire-transfer"
		) {
			if (!input.recipientAccount) {
				return deny({
					reason: `Recipient account is required for ${input.transactionType} transactions`,
				});
			}

			// Check recipient account format (simplified)
			if (input.recipientAccount.length < 8) {
				return deny({
					reason: "Recipient account number appears invalid (too short)",
				});
			}

			// Can't send to own account
			if (input.recipientAccount === input.accountId) {
				return deny({
					reason: "Cannot transfer to the same account",
				});
			}
		}

		return allow({
			reason: "Recipient validation OK",
		});
	}
);

/**
 * Rule: Check transaction velocity
 */
const velocityCheck = defineRule(
	bankingContext,
	"velocity-check",
	async (input) => {
		if (!input.transactionCount) {
			return allow({
				reason: "Transaction count not provided, skipping velocity check",
			});
		}

		if (input.transactionCount >= VELOCITY_LIMIT) {
			return deny({
				reason: `Transaction velocity limit exceeded: ${input.transactionCount} transactions in the last hour (limit: ${VELOCITY_LIMIT})`,
			});
		}

		// Warn if approaching limit
		if (input.transactionCount >= VELOCITY_LIMIT * 0.8) {
			return allow({
				reason: `High transaction velocity: ${input.transactionCount}/${VELOCITY_LIMIT} transactions in the last hour`,
			});
		}

		return allow({
			reason: `Transaction velocity OK: ${input.transactionCount}/${VELOCITY_LIMIT} transactions in the last hour`,
		});
	}
);

// Define the policy with all rules
const bankingPolicy = definePolicy(
	bankingContext,
	"banking-policy",
	[
		balanceCheck,
		dailyLimitCheck,
		transactionTypeCheck,
		kycVerification,
		fraudDetection,
		recipientValidation,
		velocityCheck,
	],
	{
		defaultStrategy: "preemptive", // Fail fast on critical checks
	}
);

// Example usage scenarios
async function runExamples() {
	console.log("=== Banking System Examples ===\n");

	// Example 1: Valid transfer
	console.log("Example 1: Valid transfer");
	const result1 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 500,
		balance: 5000,
		dailyTotal: 2000,
		recipientAccount: "acc456",
		kycStatus: "verified",
		transactionCount: 2,
	});
	console.log("Result:", result1);
	console.log("Decision:", result1.decision);
	console.log("Reason:", result1.reason);
	console.log();

	// Example 2: Insufficient balance
	console.log("Example 2: Insufficient balance");
	const result2 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 5000,
		balance: 1000, // Insufficient
		dailyTotal: 2000,
		recipientAccount: "acc456",
		kycStatus: "verified",
	});
	console.log("Result:", result2);
	console.log("Decision:", result2.decision);
	if (result2.violatedRules.length > 0) {
		console.log("Violated rule:", result2.violatedRules[0]?.name);
		console.log(
			"Violation reason:",
			result2.violatedRules[0]?.result.reason
		);
	}
	console.log();

	// Example 3: Daily limit exceeded
	console.log("Example 3: Daily limit exceeded");
	const result3 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 5000,
		balance: 10000,
		dailyTotal: 8000, // Already used $8k, requesting $5k more = $13k > $10k limit
		recipientAccount: "acc456",
		kycStatus: "verified",
	});
	console.log("Result:", result3);
	console.log("Decision:", result3.decision);
	if (result3.violatedRules.length > 0) {
		console.log("Violated rule:", result3.violatedRules[0]?.name);
		console.log(
			"Violation reason:",
			result3.violatedRules[0]?.result.reason
		);
	}
	console.log();

	// Example 4: KYC required
	console.log("Example 4: KYC required");
	const result4 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 15000, // Above $10k threshold
		balance: 20000,
		dailyTotal: 2000,
		recipientAccount: "acc456",
		kycStatus: "unverified", // Not verified
	});
	console.log("Result:", result4);
	console.log("Decision:", result4.decision);
	if (result4.violatedRules.length > 0) {
		console.log("Violated rule:", result4.violatedRules[0]?.name);
		console.log(
			"Violation reason:",
			result4.violatedRules[0]?.result.reason
		);
	}
	console.log();

	// Example 5: Fraud detection (suspicious amount)
	console.log("Example 5: Fraud detection (suspicious amount)");
	const result5 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 9999, // Suspicious amount
		balance: 15000,
		dailyTotal: 2000,
		recipientAccount: "acc456",
		kycStatus: "verified",
	});
	console.log("Result:", result5);
	console.log("Decision:", result5.decision);
	if (result5.violatedRules.length > 0) {
		console.log("Violated rule:", result5.violatedRules[0]?.name);
		console.log(
			"Violation reason:",
			result5.violatedRules[0]?.result.reason
		);
	}
	console.log();

	// Example 6: Velocity limit exceeded
	console.log("Example 6: Velocity limit exceeded");
	const result6 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "transfer",
		amount: 100,
		balance: 5000,
		dailyTotal: 2000,
		recipientAccount: "acc456",
		kycStatus: "verified",
		transactionCount: 12, // Exceeds limit of 10
	});
	console.log("Result:", result6);
	console.log("Decision:", result6.decision);
	if (result6.violatedRules.length > 0) {
		console.log("Violated rule:", result6.violatedRules[0]?.name);
		console.log(
			"Violation reason:",
			result6.violatedRules[0]?.result.reason
		);
	}
	console.log();

	// Example 7: Wire transfer
	console.log("Example 7: Wire transfer");
	const result7 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "wire-transfer",
		amount: 50000,
		balance: 100000,
		dailyTotal: 30000,
		recipientAccount: "acc789",
		kycStatus: "verified",
	});
	console.log("Result:", result7);
	console.log("Decision:", result7.decision);
	console.log();

	// Example 8: Deposit (no balance check needed)
	console.log("Example 8: Deposit");
	const result8 = await evaluatePolicy(bankingPolicy, {
		userId: "user123",
		accountId: "acc123",
		transactionType: "deposit",
		amount: 5000,
		balance: 1000,
		dailyTotal: 0,
		kycStatus: "verified",
	});
	console.log("Result:", result8);
	console.log("Decision:", result8.decision);
	console.log();
}

// Export for use in other files
export {
	balanceCheck,
	bankingContext,
	bankingPolicy,
	dailyLimitCheck,
	fraudDetection,
	kycVerification,
	recipientValidation,
	transactionTypeCheck,
	velocityCheck,
};

runExamples().catch(console.error);
