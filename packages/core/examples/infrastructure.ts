import { z } from 'zod';
import { defineContext } from '../context/define-context.js';
import { defineRule } from '../rules/define-rule.js';
import { allow, deny } from '../rules/results.js';
import { definePolicy } from '../policies/define-policy.js';
import { evaluatePolicy } from '../policies/evaluate-policy.js';

/**
 * Infrastructure Example
 * 
 * This example demonstrates infrastructure deployment policies including:
 * - Environment permissions
 * - Resource quotas per environment
 * - Cost budget limits
 * - Region deployment restrictions
 * - Deployment time windows
 * - Resource type restrictions
 * - Auto-scaling limits
 * 
 * Strategy: Exhaustive (collect all infrastructure constraints)
 */

// Define the context schema for infrastructure deployments
const infrastructureSchema = z.object({
  userId: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  resourceType: z.enum(['compute', 'storage', 'database', 'network', 'kubernetes']),
  resourceCount: z.number().int().min(0),
  region: z.string(),
  cost: z.number().min(0), // Estimated monthly cost in USD
  deploymentType: z.enum(['create', 'update', 'delete', 'scale']),
  schedule: z.string().optional(), // Deployment schedule (e.g., "09:00-17:00")
});

// Create the context
const infrastructureContext = defineContext(infrastructureSchema);

// Environment permissions (who can deploy to which environment)
const ENVIRONMENT_PERMISSIONS: Record<string, string[]> = {
  development: ['developer', 'admin', 'devops'],
  staging: ['admin', 'devops', 'qa'],
  production: ['admin', 'devops'], // Only admins and devops can deploy to production
};

// Resource quotas per environment
const RESOURCE_QUOTAS: Record<string, Record<string, number>> = {
  development: {
    compute: 10, // Max 10 compute instances
    storage: 1000, // Max 1000 GB storage
    database: 5, // Max 5 databases
    network: 20, // Max 20 network resources
    kubernetes: 3, // Max 3 k8s clusters
  },
  staging: {
    compute: 20,
    storage: 5000,
    database: 10,
    network: 50,
    kubernetes: 5,
  },
  production: {
    compute: 100,
    storage: 50000,
    database: 50,
    network: 200,
    kubernetes: 10,
  },
};

// Cost budgets per environment (monthly in USD)
const COST_BUDGETS: Record<string, number> = {
  development: 1000, // $1,000/month
  staging: 5000, // $5,000/month
  production: 50000, // $50,000/month
};

// Region restrictions
const REGION_RESTRICTIONS: Record<string, string[]> = {
  development: ['us-east-1', 'us-west-2'], // Only US regions for dev
  staging: ['us-east-1', 'us-west-2', 'eu-west-1'],
  production: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
};

// Deployment time windows (UTC hours)
const DEPLOYMENT_WINDOWS: Record<string, { start: number; end: number }> = {
  development: { start: 0, end: 23 }, // Anytime
  staging: { start: 8, end: 20 }, // 8 AM - 8 PM
  production: { start: 10, end: 16 }, // 10 AM - 4 PM (business hours)
};

// Resource type restrictions by environment
const RESOURCE_TYPE_RESTRICTIONS: Record<string, string[]> = {
  development: ['compute', 'storage', 'database', 'network', 'kubernetes'], // All allowed
  staging: ['compute', 'storage', 'database', 'network', 'kubernetes'], // All allowed
  production: ['compute', 'storage', 'database', 'network', 'kubernetes'], // All allowed, but with stricter limits
};

// Auto-scaling limits
const SCALING_LIMITS: Record<string, { min: number; max: number }> = {
  development: { min: 1, max: 5 },
  staging: { min: 2, max: 10 },
  production: { min: 3, max: 50 },
};

/**
 * Rule: Check environment permissions
 */
const environmentPermissions = defineRule(
  infrastructureContext,
  'environment-permissions',
  async (input) => {
    // In a real implementation, you'd check the user's role/permissions
    // This is a simplified check - assume userId contains role info
    const userRole = input.userId.includes('admin') ? 'admin' : 
                     input.userId.includes('devops') ? 'devops' : 
                     input.userId.includes('qa') ? 'qa' : 'developer';
    
    const allowedRoles = ENVIRONMENT_PERMISSIONS[input.environment];
    if (!allowedRoles) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    if (!allowedRoles.includes(userRole)) {
      return deny({
        reason: `User role ${userRole} does not have permission to deploy to ${input.environment} environment. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }
    
    return allow({
      reason: `User role ${userRole} has permission to deploy to ${input.environment} environment`,
    });
  }
);

/**
 * Rule: Check resource quotas
 */
const resourceQuotaCheck = defineRule(
  infrastructureContext,
  'resource-quota-check',
  async (input) => {
    const quotas = RESOURCE_QUOTAS[input.environment];
    if (!quotas) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    const quota = quotas[input.resourceType];
    if (!quota) {
      return deny({
        reason: `Unknown resource type: ${input.resourceType}`,
      });
    }
    
    // For create and scale actions, check if adding resources would exceed quota
    if (input.deploymentType === 'create' || input.deploymentType === 'scale') {
      if (input.resourceCount > quota) {
        return deny({
          reason: `Resource quota exceeded: ${input.resourceCount} ${input.resourceType} resources requested, but quota is ${quota} for ${input.environment} environment`,
        });
      }
    }
    
    return allow({
      reason: `Resource quota OK: ${input.resourceCount} ${input.resourceType} resources (quota: ${quota} for ${input.environment})`,
    });
  }
);

/**
 * Rule: Check cost budget limits
 */
const costLimitCheck = defineRule(
  infrastructureContext,
  'cost-limit-check',
  async (input) => {
    const budget = COST_BUDGETS[input.environment];
    if (!budget) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    if (input.cost > budget) {
      return deny({
        reason: `Cost budget exceeded: $${input.cost.toFixed(2)} estimated cost exceeds budget of $${budget.toFixed(2)} for ${input.environment} environment`,
      });
    }
    
    // Warn if approaching budget (80% threshold)
    if (input.cost >= budget * 0.8) {
      return allow({
        reason: `Cost budget warning: $${input.cost.toFixed(2)} is ${Math.round((input.cost / budget) * 100)}% of $${budget.toFixed(2)} budget for ${input.environment}`,
      });
    }
    
    return allow({
      reason: `Cost budget OK: $${input.cost.toFixed(2)} (within $${budget.toFixed(2)} budget for ${input.environment})`,
    });
  }
);

/**
 * Rule: Check region restrictions
 */
const regionRestrictions = defineRule(
  infrastructureContext,
  'region-restrictions',
  async (input) => {
    const allowedRegions = REGION_RESTRICTIONS[input.environment];
    if (!allowedRegions) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    if (!allowedRegions.includes(input.region)) {
      return deny({
        reason: `Region ${input.region} is not allowed for ${input.environment} environment. Allowed regions: ${allowedRegions.join(', ')}`,
      });
    }
    
    return allow({
      reason: `Region ${input.region} is allowed for ${input.environment} environment`,
    });
  }
);

/**
 * Rule: Check deployment time windows
 */
const deploymentWindow = defineRule(
  infrastructureContext,
  'deployment-window',
  async (input) => {
    const window = DEPLOYMENT_WINDOWS[input.environment];
    if (!window) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    // For production, enforce time windows strictly
    if (input.environment === 'production' && input.deploymentType !== 'delete') {
      const currentHour = new Date().getUTCHours();
      
      if (currentHour < window.start || currentHour >= window.end) {
        return deny({
          reason: `Deployment outside allowed window: Current time is ${currentHour}:00 UTC, but ${input.environment} deployments are only allowed between ${window.start}:00 and ${window.end}:00 UTC`,
        });
      }
    }
    
    // For staging, warn but allow
    if (input.environment === 'staging' && input.deploymentType !== 'delete') {
      const currentHour = new Date().getUTCHours();
      
      if (currentHour < window.start || currentHour >= window.end) {
        return allow({
          reason: `Deployment outside recommended window: Current time is ${currentHour}:00 UTC. Recommended window: ${window.start}:00 - ${window.end}:00 UTC`,
        });
      }
    }
    
    return allow({
      reason: `Deployment window OK for ${input.environment} environment`,
    });
  }
);

/**
 * Rule: Check resource type restrictions
 */
const resourceTypeRestrictions = defineRule(
  infrastructureContext,
  'resource-type-restrictions',
  async (input) => {
    const allowedTypes = RESOURCE_TYPE_RESTRICTIONS[input.environment];
    if (!allowedTypes) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    if (!allowedTypes.includes(input.resourceType)) {
      return deny({
        reason: `Resource type ${input.resourceType} is not allowed in ${input.environment} environment. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }
    
    return allow({
      reason: `Resource type ${input.resourceType} is allowed in ${input.environment} environment`,
    });
  }
);

/**
 * Rule: Check auto-scaling limits
 */
const scalingLimits = defineRule(
  infrastructureContext,
  'scaling-limits',
  async (input) => {
    if (input.deploymentType !== 'scale') {
      return allow({
        reason: `Scaling limits check only applies to scale operations`,
      });
    }
    
    const limits = SCALING_LIMITS[input.environment];
    if (!limits) {
      return deny({
        reason: `Unknown environment: ${input.environment}`,
      });
    }
    
    if (input.resourceCount < limits.min) {
      return deny({
        reason: `Scaling below minimum: ${input.resourceCount} resources is below minimum ${limits.min} for ${input.environment} environment`,
      });
    }
    
    if (input.resourceCount > limits.max) {
      return deny({
        reason: `Scaling above maximum: ${input.resourceCount} resources exceeds maximum ${limits.max} for ${input.environment} environment`,
      });
    }
    
    return allow({
      reason: `Scaling limits OK: ${input.resourceCount} resources (within ${limits.min}-${limits.max} for ${input.environment})`,
    });
  }
);

// Define the policy with all rules
const infrastructurePolicy = definePolicy(
  infrastructureContext,
  'infrastructure-policy',
  [environmentPermissions, resourceQuotaCheck, costLimitCheck, regionRestrictions, deploymentWindow, resourceTypeRestrictions, scalingLimits],
  {
    defaultStrategy: 'exhaustive', // Collect all infrastructure constraints
  }
);

// Example usage scenarios
async function runExamples() {
  console.log('=== Infrastructure Examples ===\n');

  // Example 1: Valid development deployment
  console.log('Example 1: Valid development deployment');
  const result1 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'developer1',
    environment: 'development',
    resourceType: 'compute',
    resourceCount: 3,
    region: 'us-east-1',
    cost: 100,
    deploymentType: 'create',
  });
  console.log('Result:', result1);
  console.log('Decision:', result1.decision);
  console.log('Reason:', result1.reason);
  console.log();

  // Example 2: Production deployment by unauthorized user
  console.log('Example 2: Production deployment by unauthorized user');
  const result2 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'developer1', // Developer cannot deploy to production
    environment: 'production',
    resourceType: 'compute',
    resourceCount: 5,
    region: 'us-east-1',
    cost: 5000,
    deploymentType: 'create',
  });
  console.log('Result:', result2);
  console.log('Decision:', result2.decision);
  if (result2.violatedRules.length > 0) {
    result2.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 3: Resource quota exceeded
  console.log('Example 3: Resource quota exceeded');
  const result3 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'development',
    resourceType: 'compute',
    resourceCount: 15, // Exceeds quota of 10
    region: 'us-east-1',
    cost: 500,
    deploymentType: 'create',
  });
  console.log('Result:', result3);
  console.log('Decision:', result3.decision);
  if (result3.violatedRules.length > 0) {
    result3.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 4: Cost budget exceeded
  console.log('Example 4: Cost budget exceeded');
  const result4 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'development',
    resourceType: 'compute',
    resourceCount: 5,
    region: 'us-east-1',
    cost: 1500, // Exceeds budget of $1000
    deploymentType: 'create',
  });
  console.log('Result:', result4);
  console.log('Decision:', result4.decision);
  if (result4.violatedRules.length > 0) {
    result4.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 5: Region not allowed
  console.log('Example 5: Region not allowed');
  const result5 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'development',
    resourceType: 'compute',
    resourceCount: 5,
    region: 'ap-southeast-1', // Not allowed for dev
    cost: 500,
    deploymentType: 'create',
  });
  console.log('Result:', result5);
  console.log('Decision:', result5.decision);
  if (result5.violatedRules.length > 0) {
    result5.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 6: Scaling within limits
  console.log('Example 6: Scaling within limits');
  const result6 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'production',
    resourceType: 'compute',
    resourceCount: 10, // Within 3-50 range
    region: 'us-east-1',
    cost: 5000,
    deploymentType: 'scale',
  });
  console.log('Result:', result6);
  console.log('Decision:', result6.decision);
  console.log();

  // Example 7: Scaling exceeds maximum
  console.log('Example 7: Scaling exceeds maximum');
  const result7 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'production',
    resourceType: 'compute',
    resourceCount: 60, // Exceeds max of 50
    region: 'us-east-1',
    cost: 10000,
    deploymentType: 'scale',
  });
  console.log('Result:', result7);
  console.log('Decision:', result7.decision);
  if (result7.violatedRules.length > 0) {
    result7.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 8: Valid production deployment
  console.log('Example 8: Valid production deployment');
  const result8 = await evaluatePolicy(infrastructurePolicy, {
    userId: 'admin1',
    environment: 'production',
    resourceType: 'kubernetes',
    resourceCount: 2,
    region: 'us-east-1',
    cost: 10000,
    deploymentType: 'create',
  });
  console.log('Result:', result8);
  console.log('Decision:', result8.decision);
  console.log();
}

// Export for use in other files
export {
  infrastructureContext,
  infrastructurePolicy,
  environmentPermissions,
  resourceQuotaCheck,
  costLimitCheck,
  regionRestrictions,
  deploymentWindow,
  resourceTypeRestrictions,
  scalingLimits,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

