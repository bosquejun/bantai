import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * Name Validation Example
 *
 * This example demonstrates name validation policies including:
 * - Length constraints
 * - Format validation (letters, spaces, hyphens, apostrophes)
 * - Country-specific name formats
 * - Profanity/blocked words detection
 * - Special character validation
 *
 * Strategy: Exhaustive (collect all validation errors)
 */

// Define the context schema for name validation
const nameValidationSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	fullName: z.string().optional(),
	country: z.string().min(2).max(2).optional(), // ISO country code
});

// Create the context
const nameValidationContext = defineContext(nameValidationSchema);

// Blocked words/profanity list (simplified example)
const BLOCKED_WORDS = new Set([
	"admin",
	"administrator",
	"root",
	"system",
	"test",
	"null",
	"undefined",
	"guest",
	"user",
]);

// Name length constraints
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 50;
const MIN_FULL_NAME_LENGTH = 2;
const MAX_FULL_NAME_LENGTH = 100;

// Country-specific name format rules
const COUNTRY_NAME_FORMATS: Record<
	string,
	{
		allowNumbers: boolean;
		allowSpecialChars: boolean;
		allowedSpecialChars?: string[];
	}
> = {
	US: {
		allowNumbers: false,
		allowSpecialChars: true,
		allowedSpecialChars: ["'", "-"],
	},
	UK: {
		allowNumbers: false,
		allowSpecialChars: true,
		allowedSpecialChars: ["'", "-"],
	},
	JP: { allowNumbers: false, allowSpecialChars: false },
	CN: { allowNumbers: false, allowSpecialChars: false },
	KR: { allowNumbers: false, allowSpecialChars: false },
	BR: {
		allowNumbers: false,
		allowSpecialChars: true,
		allowedSpecialChars: ["'", "-"],
	},
	MX: {
		allowNumbers: false,
		allowSpecialChars: true,
		allowedSpecialChars: ["'", "-"],
	},
};

// Default format rules
const DEFAULT_FORMAT = {
	allowNumbers: false,
	allowSpecialChars: true,
	allowedSpecialChars: ["'", "-"],
};

/**
 * Rule: Check name length constraints
 */
const nameLengthCheck = defineRule(
	nameValidationContext,
	"name-length-check",
	async (input) => {
		const violations: string[] = [];

		if (input.firstName) {
			if (input.firstName.length < MIN_NAME_LENGTH) {
				violations.push(
					`First name must be at least ${MIN_NAME_LENGTH} character(s) long`
				);
			}
			if (input.firstName.length > MAX_NAME_LENGTH) {
				violations.push(
					`First name must be no more than ${MAX_NAME_LENGTH} characters long`
				);
			}
		}

		if (input.lastName) {
			if (input.lastName.length < MIN_NAME_LENGTH) {
				violations.push(
					`Last name must be at least ${MIN_NAME_LENGTH} character(s) long`
				);
			}
			if (input.lastName.length > MAX_NAME_LENGTH) {
				violations.push(
					`Last name must be no more than ${MAX_NAME_LENGTH} characters long`
				);
			}
		}

		if (input.fullName) {
			if (input.fullName.length < MIN_FULL_NAME_LENGTH) {
				violations.push(
					`Full name must be at least ${MIN_FULL_NAME_LENGTH} characters long`
				);
			}
			if (input.fullName.length > MAX_FULL_NAME_LENGTH) {
				violations.push(
					`Full name must be no more than ${MAX_FULL_NAME_LENGTH} characters long`
				);
			}
		}

		// Check if at least one name field is provided
		if (!input.firstName && !input.lastName && !input.fullName) {
			return deny({
				reason: "At least one name field (firstName, lastName, or fullName) must be provided",
			});
		}

		if (violations.length > 0) {
			return deny({
				reason: violations.join("; "),
			});
		}

		return allow({
			reason: "Name length meets requirements",
		});
	}
);

/**
 * Rule: Check name format (letters, spaces, hyphens, apostrophes)
 */
const nameFormatCheck = defineRule(
	nameValidationContext,
	"name-format-check",
	async (input) => {
		const violations: string[] = [];

		// Basic format: letters, spaces, hyphens, apostrophes
		const basicFormatRegex = /^[a-zA-Z\s'-]+$/;

		if (input.firstName && !basicFormatRegex.test(input.firstName)) {
			violations.push(
				"First name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed"
			);
		}

		if (input.lastName && !basicFormatRegex.test(input.lastName)) {
			violations.push(
				"Last name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed"
			);
		}

		if (input.fullName && !basicFormatRegex.test(input.fullName)) {
			violations.push(
				"Full name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed"
			);
		}

		// Check for consecutive special characters
		const consecutiveSpecialRegex = /['-]{2,}/;
		if (input.firstName && consecutiveSpecialRegex.test(input.firstName)) {
			violations.push(
				"First name contains consecutive special characters"
			);
		}
		if (input.lastName && consecutiveSpecialRegex.test(input.lastName)) {
			violations.push(
				"Last name contains consecutive special characters"
			);
		}
		if (input.fullName && consecutiveSpecialRegex.test(input.fullName)) {
			violations.push(
				"Full name contains consecutive special characters"
			);
		}

		if (violations.length > 0) {
			return deny({
				reason: violations.join("; "),
			});
		}

		return allow({
			reason: "Name format is valid",
		});
	}
);

/**
 * Rule: Check country-specific name formats
 */
const countrySpecificFormat = defineRule(
	nameValidationContext,
	"country-specific-format",
	async (input) => {
		if (!input.country) {
			return allow({
				reason: "No country specified, using default format rules",
			});
		}

		const formatRules =
			COUNTRY_NAME_FORMATS[input.country] || DEFAULT_FORMAT;
		const violations: string[] = [];

		const checkName = (name: string, fieldName: string) => {
			if (formatRules.allowNumbers && /[0-9]/.test(name)) {
				violations.push(
					`${fieldName} contains numbers, which are not allowed for country ${input.country}`
				);
			}

			if (!formatRules.allowSpecialChars) {
				const specialCharRegex = /[^a-zA-Z\s]/;
				if (specialCharRegex.test(name)) {
					violations.push(
						`${fieldName} contains special characters, which are not allowed for country ${input.country}`
					);
				}
			} else if (formatRules.allowedSpecialChars) {
				// Check for disallowed special characters
				const allowedChars = formatRules.allowedSpecialChars.join("");
				const disallowedSpecialRegex = new RegExp(
					`[^a-zA-Z\\s${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`
				);
				if (disallowedSpecialRegex.test(name)) {
					violations.push(
						`${fieldName} contains special characters not allowed for country ${input.country}. Allowed: ${formatRules.allowedSpecialChars.join(", ")}`
					);
				}
			}
		};

		if (input.firstName) {
			checkName(input.firstName, "First name");
		}
		if (input.lastName) {
			checkName(input.lastName, "Last name");
		}
		if (input.fullName) {
			checkName(input.fullName, "Full name");
		}

		if (violations.length > 0) {
			return deny({
				reason: violations.join("; "),
			});
		}

		return allow({
			reason: `Name format meets requirements for country ${input.country}`,
		});
	}
);

/**
 * Rule: Check for profanity/blocked words
 */
const profanityCheck = defineRule(
	nameValidationContext,
	"profanity-check",
	async (input) => {
		const violations: string[] = [];

		const checkName = (name: string, fieldName: string) => {
			const nameLower = name.toLowerCase();

			// Check for exact matches
			if (BLOCKED_WORDS.has(nameLower)) {
				violations.push(
					`${fieldName} contains a blocked word: "${name}"`
				);
				return;
			}

			// Check if name contains blocked words
			for (const blocked of BLOCKED_WORDS) {
				if (nameLower.includes(blocked)) {
					violations.push(
						`${fieldName} contains a blocked word: "${blocked}"`
					);
				}
			}
		};

		if (input.firstName) {
			checkName(input.firstName, "First name");
		}
		if (input.lastName) {
			checkName(input.lastName, "Last name");
		}
		if (input.fullName) {
			checkName(input.fullName, "Full name");
		}

		if (violations.length > 0) {
			return deny({
				reason: violations.join("; "),
			});
		}

		return allow({
			reason: "Name does not contain blocked words",
		});
	}
);

/**
 * Rule: Check special character usage
 */
const specialCharacterCheck = defineRule(
	nameValidationContext,
	"special-character-check",
	async (input) => {
		const violations: string[] = [];

		// Check for names that start or end with special characters
		const startsWithSpecial = /^['-]/;
		const endsWithSpecial = /['-]$/;

		if (input.firstName) {
			if (startsWithSpecial.test(input.firstName)) {
				violations.push(
					"First name cannot start with a special character"
				);
			}
			if (endsWithSpecial.test(input.firstName)) {
				violations.push(
					"First name cannot end with a special character"
				);
			}
		}

		if (input.lastName) {
			if (startsWithSpecial.test(input.lastName)) {
				violations.push(
					"Last name cannot start with a special character"
				);
			}
			if (endsWithSpecial.test(input.lastName)) {
				violations.push(
					"Last name cannot end with a special character"
				);
			}
		}

		if (input.fullName) {
			if (startsWithSpecial.test(input.fullName)) {
				violations.push(
					"Full name cannot start with a special character"
				);
			}
			if (endsWithSpecial.test(input.fullName)) {
				violations.push(
					"Full name cannot end with a special character"
				);
			}
		}

		if (violations.length > 0) {
			return deny({
				reason: violations.join("; "),
			});
		}

		return allow({
			reason: "Special characters are used correctly",
		});
	}
);

// Define the policy with all rules
const nameValidationPolicy = definePolicy(
	nameValidationContext,
	"name-validation-policy",
	[
		nameLengthCheck,
		nameFormatCheck,
		countrySpecificFormat,
		profanityCheck,
		specialCharacterCheck,
	],
	{
		defaultStrategy: "exhaustive", // Collect all validation errors
	}
);

// Example usage scenarios
async function runExamples() {
	console.log("=== Name Validation Examples ===\n");

	// Example 1: Valid name
	console.log("Example 1: Valid name");
	const result1 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "John",
		lastName: "Doe",
		country: "US",
	});
	console.log("Result:", result1);
	console.log("Decision:", result1.decision);
	console.log("Reason:", result1.reason);
	console.log("Violated rules:", result1.violatedRules.length);
	console.log();

	// Example 2: Name with hyphen (valid)
	console.log("Example 2: Name with hyphen");
	const result2 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "Mary-Jane",
		lastName: "O'Connor",
		country: "US",
	});
	console.log("Result:", result2);
	console.log("Decision:", result2.decision);
	console.log();

	// Example 3: Name too short
	console.log("Example 3: Name too short");
	const result3 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "",
		lastName: "Doe",
		country: "US",
	});
	console.log("Result:", result3);
	console.log("Decision:", result3.decision);
	console.log("Violated rules:", result3.violatedRules.length);
	result3.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 4: Invalid characters
	console.log("Example 4: Invalid characters");
	const result4 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "John123",
		lastName: "Doe",
		country: "US",
	});
	console.log("Result:", result4);
	console.log("Decision:", result4.decision);
	console.log("Violated rules:", result4.violatedRules.length);
	result4.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 5: Blocked word
	console.log("Example 5: Blocked word");
	const result5 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "Admin",
		lastName: "User",
		country: "US",
	});
	console.log("Result:", result5);
	console.log("Decision:", result5.decision);
	console.log("Violated rules:", result5.violatedRules.length);
	result5.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 6: Country-specific format (Japan - no special chars)
	console.log("Example 6: Country-specific format (Japan)");
	const result6 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "Taro",
		lastName: "O'Connor", // Apostrophe not allowed in JP
		country: "JP",
	});
	console.log("Result:", result6);
	console.log("Decision:", result6.decision);
	console.log("Violated rules:", result6.violatedRules.length);
	result6.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();

	// Example 7: Full name format
	console.log("Example 7: Full name format");
	const result7 = await evaluatePolicy(nameValidationPolicy, {
		fullName: "Jean-Pierre LaFleur",
		country: "US",
	});
	console.log("Result:", result7);
	console.log("Decision:", result7.decision);
	console.log();

	// Example 8: Multiple violations
	console.log("Example 8: Multiple violations");
	const result8 = await evaluatePolicy(nameValidationPolicy, {
		firstName: "-Admin123",
		lastName: "Test",
		country: "US",
	});
	console.log("Result:", result8);
	console.log("Decision:", result8.decision);
	console.log("Violated rules:", result8.violatedRules.length);
	result8.violatedRules.forEach((violation) => {
		console.log(`  - ${violation.name}: ${violation.result.reason}`);
	});
	console.log();
}

// Export for use in other files
export {
	countrySpecificFormat,
	nameFormatCheck,
	nameLengthCheck,
	nameValidationContext,
	nameValidationPolicy,
	profanityCheck,
	specialCharacterCheck,
};

// Run examples if this file is executed directly
runExamples().catch(console.error);
