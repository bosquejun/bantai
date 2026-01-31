import { z } from 'zod';
import { defineContext } from '../src/context/define-context.js';
import { definePolicy } from '../src/policies/define-policy.js';
import { evaluatePolicy } from '../src/policies/evaluate-policy.js';
import { defineRule } from '../src/rules/define-rule.js';
import { allow, deny } from '../src/rules/results.js';

/**
 * Age Eligibility Example
 * 
 * This example demonstrates how to use the policy/rules system for age validation
 * and eligibility checks. It covers:
 * - Minimum age requirements
 * - Country-specific age requirements
 * - Service-specific age restrictions
 * - Parental consent requirements
 * 
 * Strategy: Preemptive (fail fast on age check)
 */

// Define the context schema for age eligibility
const ageEligibilitySchema = z.object({
  age: z.number().int().min(0).max(150),
  country: z.string().min(2).max(2), // ISO country code
  serviceType: z.enum(['general', 'alcohol', 'gambling', 'social-media', 'financial']),
});

// Create the context
const ageEligibilityContext = defineContext(ageEligibilitySchema);

// Country-specific minimum age requirements (in years)
const COUNTRY_MIN_AGE: Record<string, number> = {
  US: 13, // COPPA requirement
  EU: 16, // GDPR requirement
  UK: 13,
  JP: 13,
  CA: 13,
  AU: 13,
};

// Default minimum age if country not specified
const DEFAULT_MIN_AGE = 13;

// Service-specific age requirements
const SERVICE_AGE_REQUIREMENTS: Record<string, number> = {
  general: 13,
  alcohol: 21, // US legal drinking age
  gambling: 18,
  'social-media': 13,
  financial: 18,
};

// Countries requiring parental consent for ages 13-17
const PARENTAL_CONSENT_COUNTRIES = ['US', 'CA', 'AU'];

/**
 * Rule: Check if user meets minimum age requirement
 */
const minimumAgeCheck = defineRule(
  ageEligibilityContext,
  'minimum-age-check',
  async (input) => {
    const minAge = COUNTRY_MIN_AGE[input.country] || DEFAULT_MIN_AGE;
    
    if (input.age < minAge) {
      return deny({
        reason: `User must be at least ${minAge} years old. Current age: ${input.age}`,
      });
    }
    
    return allow({
      reason: `User age ${input.age} meets minimum requirement of ${minAge} years`,
    });
  }
);

/**
 * Rule: Check country-specific age requirements
 */
const countrySpecificAge = defineRule(
  ageEligibilityContext,
  'country-specific-age',
  async (input) => {
    const countryMinAge = COUNTRY_MIN_AGE[input.country];
    
    if (!countryMinAge) {
      // Country not in our database, use default
      return allow({
        reason: `Country ${input.country} not in database, using default age requirement`,
      });
    }
    
    if (input.age < countryMinAge) {
      return deny({
        reason: `Country ${input.country} requires minimum age of ${countryMinAge} years. Current age: ${input.age}`,
      });
    }
    
    return allow({
      reason: `User meets ${input.country} age requirement of ${countryMinAge} years`,
    });
  }
);

/**
 * Rule: Check service-specific age restrictions
 */
const serviceAgeRestriction = defineRule(
  ageEligibilityContext,
  'service-age-restriction',
  async (input) => {
    const serviceMinAge = SERVICE_AGE_REQUIREMENTS[input.serviceType];
    
    if (!serviceMinAge) {
      return deny({
        reason: `Unknown service type: ${input.serviceType}`,
      });
    }
    
    if (input.age < serviceMinAge) {
      return deny({
        reason: `Service "${input.serviceType}" requires minimum age of ${serviceMinAge} years. Current age: ${input.age}`,
      });
    }
    
    return allow({
      reason: `User age ${input.age} meets service requirement of ${serviceMinAge} years`,
    });
  }
);

/**
 * Rule: Check if parental consent is required
 */
const parentalConsentCheck = defineRule(
  ageEligibilityContext,
  'parental-consent-check',
  async (input) => {
    const requiresConsent = PARENTAL_CONSENT_COUNTRIES.includes(input.country);
    const countryMinAge = COUNTRY_MIN_AGE[input.country] || DEFAULT_MIN_AGE;
    const isMinor = input.age < 18;
    const needsConsent = input.age >= countryMinAge && input.age < 18;
    
    if (requiresConsent && needsConsent) {
      return deny({
        reason: `Parental consent required for users aged ${countryMinAge}-17 in ${input.country}. Current age: ${input.age}`,
      });
    }
    
    if (isMinor && !requiresConsent) {
      return allow({
        reason: `User is ${input.age} years old. Parental consent not required in ${input.country}`,
      });
    }
    
    return allow({
      reason: `User is ${input.age} years old. No parental consent required`,
    });
  }
);

// Define the policy with all rules
const ageEligibilityPolicy = definePolicy(
  ageEligibilityContext,
  'age-eligibility-policy',
  [minimumAgeCheck, countrySpecificAge, serviceAgeRestriction, parentalConsentCheck],
  {
    defaultStrategy: 'preemptive', // Fail fast on first violation
  }
);

// Example usage scenarios
async function runExamples() {
  console.log('=== Age Eligibility Examples ===\n');

  // Example 1: Valid adult user for general service
  console.log('Example 1: Valid adult user (US, general service)');
  const result1 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 25,
    country: 'US',
    serviceType: 'general',
  });
  console.log('Result:', result1);
  console.log('Decision:', result1.decision);
  console.log('Reason:', result1.reason);
  console.log('Violated rules:', result1.violatedRules.length);
  console.log();

  // Example 2: Underage user
  console.log('Example 2: Underage user (US, general service)');
  const result2 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 12,
    country: 'US',
    serviceType: 'general',
  });
  console.log('Result:', result2);
  console.log('Decision:', result2.decision);
  console.log('Reason:', result2.reason);
  if (result2.violatedRules.length > 0) {
    console.log('Violated rule:', result2.violatedRules[0]?.name);
    console.log('Violation reason:', result2.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 3: Age restriction for alcohol service
  console.log('Example 3: Age restriction for alcohol service');
  const result3 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 19,
    country: 'US',
    serviceType: 'alcohol',
  });
  console.log('Result:', result3);
  console.log('Decision:', result3.decision);
  console.log('Reason:', result3.reason);
  if (result3.violatedRules.length > 0) {
    console.log('Violated rule:', result3.violatedRules[0]?.name);
    console.log('Violation reason:', result3.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 4: Valid user for alcohol service
  console.log('Example 4: Valid user for alcohol service');
  const result4 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 22,
    country: 'US',
    serviceType: 'alcohol',
  });
  console.log('Result:', result4);
  console.log('Decision:', result4.decision);
  console.log();

  // Example 5: EU user with GDPR requirement
  console.log('Example 5: EU user (GDPR requirement)');
  const result5 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 15,
    country: 'EU',
    serviceType: 'general',
  });
  console.log('Result:', result5);
  console.log('Decision:', result5.decision);
  if (result5.violatedRules.length > 0) {
    console.log('Violated rule:', result5.violatedRules[0]?.name);
    console.log('Violation reason:', result5.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 6: Parental consent required
  console.log('Example 6: Parental consent required (US, age 15)');
  const result6 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 15,
    country: 'US',
    serviceType: 'general',
  });
  console.log('Result:', result6);
  console.log('Decision:', result6.decision);
  if (result6.violatedRules.length > 0) {
    console.log('Violated rule:', result6.violatedRules[0]?.name);
    console.log('Violation reason:', result6.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 7: Financial service age requirement
  console.log('Example 7: Financial service age requirement');
  const result7 = await evaluatePolicy(ageEligibilityPolicy, {
    age: 17,
    country: 'US',
    serviceType: 'financial',
  });
  console.log('Result:', result7);
  console.log('Decision:', result7.decision);
  if (result7.violatedRules.length > 0) {
    console.log('Violated rule:', result7.violatedRules[0]?.name);
    console.log('Violation reason:', result7.violatedRules[0]?.result.reason);
  }
  console.log();
}

// Export for use in other files
export {
    ageEligibilityContext,
    ageEligibilityPolicy, countrySpecificAge, minimumAgeCheck, parentalConsentCheck, serviceAgeRestriction
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

