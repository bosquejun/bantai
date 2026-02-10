import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * Password Validation Example
 *
 * This example demonstrates comprehensive password validation policies including:
 * - Length requirements (minimum and maximum)
 * - Complexity requirements (uppercase, lowercase, numbers, special characters)
 * - Common password detection
 * - Password reuse prevention
 * - Pattern detection (sequential, repeated characters, etc.)
 *
 * Strategy: Exhaustive (collect all validation errors to show user)
 */

// Define the context schema for password validation
const passwordValidationSchema = z.object({
	password: z.string(),
	userId: z.string().optional(), // Optional for new user registration
	previousPasswords: z.array(z.string()).optional(), // Previous passwords to check against
});

// Create the context
const passwordValidationContext = defineContext(passwordValidationSchema);

// Common passwords that should be rejected
const COMMON_PASSWORDS = new Set([
	"password",
	"password123",
	"12345678",
	"123456789",
	"1234567890",
	"qwerty",
	"abc123",
	"letmein",
	"welcome",
	"admin",
	"monkey",
	"dragon",
	"master",
	"sunshine",
	"princess",
	"football",
	"iloveyou",
]);

// Minimum and maximum password length
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Rule: Check password length requirements
 */
const lengthCheck = defineRule(
	passwordValidationContext,
	"length-check",
	async (input) => {
		const length = input.password.length;

		if (length < MIN_PASSWORD_LENGTH) {
			return deny({
				reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long. Current length: ${length}`,
			});
		}

		if (length > MAX_PASSWORD_LENGTH) {
			return deny({
				reason: `Password must be no more than ${MAX_PASSWORD_LENGTH} characters long. Current length: ${length}`,
			});
		}

		return allow({
			reason: `Password length ${length} meets requirements (${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters)`,
		});
	}
);

/**
 * Rule: Check password complexity requirements
 */
const complexityCheck = defineRule(
	passwordValidationContext,
	"complexity-check",
	async (input) => {
		const password = input.password;
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumber = /[0-9]/.test(password);
		const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
			password
		);

		const missingRequirements: string[] = [];

		if (!hasUpperCase) {
			missingRequirements.push("uppercase letter");
		}
		if (!hasLowerCase) {
			missingRequirements.push("lowercase letter");
		}
		if (!hasNumber) {
			missingRequirements.push("number");
		}
		if (!hasSpecialChar) {
			missingRequirements.push("special character");
		}

		if (missingRequirements.length > 0) {
			return deny({
				reason: `Password must contain at least one ${missingRequirements.join(", ")}`,
			});
		}

		return allow({
			reason: "Password meets complexity requirements (uppercase, lowercase, number, special character)",
		});
	}
);

/**
 * Rule: Check against common passwords
 */
const commonPasswordCheck = defineRule(
	passwordValidationContext,
	"common-password-check",
	async (input) => {
		const passwordLower = input.password.toLowerCase();

		if (COMMON_PASSWORDS.has(passwordLower)) {
			return deny({
				reason: "Password is too common and easily guessable. Please choose a more unique password",
			});
		}

		// Check if password is just a common password with numbers appended
		for (const common of COMMON_PASSWORDS) {
			if (
				passwordLower.startsWith(common) &&
				passwordLower.length <= common.length + 3
			) {
				return deny({
					reason: "Password is based on a common password. Please choose a more unique password",
				});
			}
		}

		return allow({
			reason: "Password is not in the common passwords list",
		});
	}
);

/**
 * Rule: Check password reuse
 */
const passwordReuseCheck = defineRule(
	passwordValidationContext,
	"password-reuse-check",
	async (input) => {
		if (!input.previousPasswords || input.previousPasswords.length === 0) {
			return allow({
				reason: "No previous passwords to check against",
			});
		}

		const passwordLower = input.password.toLowerCase();

		for (const previousPassword of input.previousPasswords) {
			if (passwordLower === previousPassword.toLowerCase()) {
				return deny({
					reason: "Password has been used before. Please choose a different password",
				});
			}
		}

		return allow({
			reason: `Password is not in the list of ${input.previousPasswords.length} previous passwords`,
		});
	}
);

/**
 * Rule: Check for common patterns
 */
const patternCheck = defineRule(
	passwordValidationContext,
	"pattern-check",
	async (input) => {
		const password = input.password;

		// Check for sequential characters (e.g., "12345", "abcde")
		const sequentialPattern =
			/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i;
		if (sequentialPattern.test(password)) {
			return deny({
				reason: 'Password contains sequential characters. Please avoid patterns like "12345" or "abcde"',
			});
		}

		// Check for repeated characters (e.g., "aaaa", "1111")
		const repeatedPattern = /(.)\1{3,}/;
		if (repeatedPattern.test(password)) {
			return deny({
				reason: "Password contains too many repeated characters. Please use more variety",
			});
		}

		// Check for keyboard patterns (e.g., "qwerty", "asdfgh")
		const keyboardPatterns = [
			"qwerty",
			"asdfgh",
			"zxcvbn",
			"qazwsx",
			"1qaz2wsx",
		];
		const passwordLower = password.toLowerCase();
		for (const pattern of keyboardPatterns) {
			if (passwordLower.includes(pattern)) {
				return deny({
					reason: 'Password contains keyboard patterns. Please avoid patterns like "qwerty"',
				});
			}
		}

		return allow({
			reason: "Password does not contain common patterns",
		});
	}
);

// Define the policy with all rules
const passwordValidationPolicy = definePolicy(
	passwordValidationContext,
	"password-validation-policy",
	[
		lengthCheck,
		complexityCheck,
		commonPasswordCheck,
		passwordReuseCheck,
		patternCheck,
	],
	{
		defaultStrategy: "exhaustive", // Collect all validation errors
	}
);

// Example usage scenarios
async function runExamples() {
	console.log("=== Password Validation Examples ===\n");

	// Example 1: Valid strong password
	console.log("Example 1: Valid strong password");
	const result1 = await evaluatePolicy(passwordValidationPolicy, {
		password: "MyStr0ng!P@ssw0rd",
		userId: "user123",
	});
	console.log("Result:", result1);
	console.log("Decision:", result1.decision);
	console.log("Reason:", result1.reason);
	console.log("Violated rules:", result1.violatedRules.length);
	console.log();

	// Example 2: Password too short
	console.log("Example 2: Password too short");
	const result2 = await evaluatePolicy(passwordValidationPolicy, {
		password: "Short1!",
		userId: "user123",
	});
	console.log("Result:", result2);
	console.log("Decision:", result2.decision);
	console.log("Violated rules:", result2.violatedRules.length);
	result2.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 3: Missing complexity requirements
	console.log("Example 3: Missing complexity requirements");
	const result3 = await evaluatePolicy(passwordValidationPolicy, {
		password: "alllowercase123",
		userId: "user123",
	});
	console.log("Result:", result3);
	console.log("Decision:", result3.decision);
	console.log("Violated rules:", result3.violatedRules.length);
	result3.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 4: Common password
	console.log("Example 4: Common password");
	const result4 = await evaluatePolicy(passwordValidationPolicy, {
		password: "password123",
		userId: "user123",
	});
	console.log("Result:", result4);
	console.log("Decision:", result4.decision);
	console.log("Violated rules:", result4.violatedRules.length);
	result4.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 5: Password reuse
	console.log("Example 5: Password reuse");
	const result5 = await evaluatePolicy(passwordValidationPolicy, {
		password: "MyStr0ng!P@ssw0rd",
		userId: "user123",
		previousPasswords: [
			"MyStr0ng!P@ssw0rd",
			"OldP@ssw0rd123",
			"Previous1!Pass",
		],
	});
	console.log("Result:", result5);
	console.log("Decision:", result5.decision);
	console.log("Violated rules:", result5.violatedRules.length);
	result5.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 6: Sequential pattern
	console.log("Example 6: Sequential pattern");
	const result6 = await evaluatePolicy(passwordValidationPolicy, {
		password: "MyPass12345!",
		userId: "user123",
	});
	console.log("Result:", result6);
	console.log("Decision:", result6.decision);
	console.log("Violated rules:", result6.violatedRules.length);
	result6.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 7: Multiple violations
	console.log("Example 7: Multiple violations");
	const result7 = await evaluatePolicy(passwordValidationPolicy, {
		password: "pass",
		userId: "user123",
	});
	console.log("Result:", result7);
	console.log("Decision:", result7.decision);
	console.log("Violated rules:", result7.violatedRules.length);
	result7.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();
}

// Export for use in other files
export {
	commonPasswordCheck,
	complexityCheck,
	lengthCheck,
	passwordReuseCheck,
	passwordValidationContext,
	passwordValidationPolicy,
	patternCheck,
};

// Run examples if this file is executed directly
runExamples().catch(console.error);
