import { z } from 'zod';
import { defineContext } from '../context/define-context.js';
import { defineRule } from '../rules/define-rule.js';
import { allow, deny } from '../rules/results.js';
import { definePolicy } from '../policies/define-policy.js';
import { evaluatePolicy } from '../policies/evaluate-policy.js';

/**
 * Role-Based Access Control (RBAC) Example
 * 
 * This example demonstrates RBAC policies including:
 * - Role validation
 * - Permission checking based on roles
 * - Resource ownership validation
 * - Action-based access control
 * 
 * Strategy: Preemptive (fail fast on access denial)
 */

// Define the context schema for RBAC
const rbacSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'moderator', 'user', 'guest']),
  resource: z.string(),
  action: z.enum(['read', 'write', 'delete', 'update', 'create']),
  resourceOwnerId: z.string().optional(), // Owner of the resource (if applicable)
});

// Create the context
const rbacContext = defineContext(rbacSchema);

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<string, number> = {
  guest: 0,
  user: 1,
  moderator: 2,
  admin: 3,
};

// Role-based permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['read', 'write', 'delete', 'update', 'create'],
  moderator: ['read', 'write', 'update'],
  user: ['read', 'write', 'update'],
  guest: ['read'],
};

// Resource-specific permissions
const RESOURCE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  '/admin': {
    admin: ['read', 'write', 'delete', 'update', 'create'],
  },
  '/users': {
    admin: ['read', 'write', 'delete', 'update', 'create'],
    moderator: ['read', 'update'],
    user: ['read'],
  },
  '/posts': {
    admin: ['read', 'write', 'delete', 'update', 'create'],
    moderator: ['read', 'write', 'delete', 'update'],
    user: ['read', 'write', 'update', 'create'],
    guest: ['read'],
  },
  '/settings': {
    admin: ['read', 'write', 'delete', 'update', 'create'],
    user: ['read', 'update'], // Users can update their own settings
  },
};

/**
 * Rule: Check if user has required role
 */
const roleCheck = defineRule(
  rbacContext,
  'role-check',
  async (input) => {
    const validRoles = ['admin', 'moderator', 'user', 'guest'];
    
    if (!validRoles.includes(input.role)) {
      return deny({
        reason: `Invalid role: ${input.role}. Valid roles are: ${validRoles.join(', ')}`,
      });
    }
    
    return allow({
      reason: `User has valid role: ${input.role}`,
    });
  }
);

/**
 * Rule: Check if role has permission for action
 */
const permissionCheck = defineRule(
  rbacContext,
  'permission-check',
  async (input) => {
    // Check resource-specific permissions first
    const resourcePerms = RESOURCE_PERMISSIONS[input.resource];
    
    if (resourcePerms) {
      const rolePerms = resourcePerms[input.role];
      if (rolePerms && rolePerms.includes(input.action)) {
        return allow({
          reason: `Role ${input.role} has ${input.action} permission for resource ${input.resource}`,
        });
      }
      
      // Check if a higher role has permission (role hierarchy)
      const userRoleLevel = ROLE_HIERARCHY[input.role];
      for (const [role, perms] of Object.entries(resourcePerms)) {
        const roleLevel = ROLE_HIERARCHY[role];
        if (roleLevel > userRoleLevel && perms.includes(input.action)) {
          return deny({
            reason: `Role ${input.role} does not have ${input.action} permission for resource ${input.resource}. Higher role required.`,
          });
        }
      }
      
      return deny({
        reason: `Role ${input.role} does not have ${input.action} permission for resource ${input.resource}`,
      });
    }
    
    // Fall back to general role permissions
    const rolePerms = ROLE_PERMISSIONS[input.role];
    if (!rolePerms || !rolePerms.includes(input.action)) {
      return deny({
        reason: `Role ${input.role} does not have ${input.action} permission`,
      });
    }
    
    return allow({
      reason: `Role ${input.role} has ${input.action} permission`,
    });
  }
);

/**
 * Rule: Check resource ownership
 */
const resourceOwnership = defineRule(
  rbacContext,
  'resource-ownership',
  async (input) => {
    // Admin can access any resource
    if (input.role === 'admin') {
      return allow({
        reason: 'Admin role has access to all resources',
      });
    }
    
    // If resource has an owner, check ownership
    if (input.resourceOwnerId) {
      if (input.userId === input.resourceOwnerId) {
        return allow({
          reason: 'User owns the resource',
        });
      }
      
      // Moderators can access resources they don't own for moderation purposes
      if (input.role === 'moderator' && (input.action === 'read' || input.action === 'update')) {
        return allow({
          reason: 'Moderator can access resources for moderation',
        });
      }
      
      return deny({
        reason: `User ${input.userId} does not own resource owned by ${input.resourceOwnerId}`,
      });
    }
    
    // No owner specified, allow based on permissions
    return allow({
      reason: 'Resource has no specific owner, access based on role permissions',
    });
  }
);

/**
 * Rule: Check action-specific restrictions
 */
const actionRestriction = defineRule(
  rbacContext,
  'action-restriction',
  async (input) => {
    // Delete action requires admin or moderator
    if (input.action === 'delete') {
      if (input.role !== 'admin' && input.role !== 'moderator') {
        return deny({
          reason: `Delete action requires admin or moderator role. Current role: ${input.role}`,
        });
      }
    }
    
    // Create action requires at least user role
    if (input.action === 'create') {
      if (input.role === 'guest') {
        return deny({
          reason: 'Create action requires at least user role. Guest role not allowed',
        });
      }
    }
    
    return allow({
      reason: `Action ${input.action} is allowed for role ${input.role}`,
    });
  }
);

// Define the policy with all rules
const rbacPolicy = definePolicy(
  rbacContext,
  'rbac-policy',
  [roleCheck, permissionCheck, resourceOwnership, actionRestriction],
  {
    defaultStrategy: 'preemptive', // Fail fast on access denial
  }
);

// Example usage scenarios
async function runExamples() {
  console.log('=== RBAC Examples ===\n');

  // Example 1: Admin can delete any resource
  console.log('Example 1: Admin can delete any resource');
  const result1 = await evaluatePolicy(rbacPolicy, {
    userId: 'admin1',
    role: 'admin',
    resource: '/posts',
    action: 'delete',
    resourceOwnerId: 'user123',
  });
  console.log('Result:', result1);
  console.log('Decision:', result1.decision);
  console.log('Reason:', result1.reason);
  console.log();

  // Example 2: User can read posts
  console.log('Example 2: User can read posts');
  const result2 = await evaluatePolicy(rbacPolicy, {
    userId: 'user123',
    role: 'user',
    resource: '/posts',
    action: 'read',
  });
  console.log('Result:', result2);
  console.log('Decision:', result2.decision);
  console.log();

  // Example 3: User cannot delete posts
  console.log('Example 3: User cannot delete posts');
  const result3 = await evaluatePolicy(rbacPolicy, {
    userId: 'user123',
    role: 'user',
    resource: '/posts',
    action: 'delete',
  });
  console.log('Result:', result3);
  console.log('Decision:', result3.decision);
  if (result3.violatedRules.length > 0) {
    console.log('Violated rule:', result3.violatedRules[0]?.name);
    console.log('Violation reason:', result3.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 4: User can update own resource
  console.log('Example 4: User can update own resource');
  const result4 = await evaluatePolicy(rbacPolicy, {
    userId: 'user123',
    role: 'user',
    resource: '/settings',
    action: 'update',
    resourceOwnerId: 'user123', // User owns the resource
  });
  console.log('Result:', result4);
  console.log('Decision:', result4.decision);
  console.log();

  // Example 5: User cannot update other user's resource
  console.log('Example 5: User cannot update other user\'s resource');
  const result5 = await evaluatePolicy(rbacPolicy, {
    userId: 'user123',
    role: 'user',
    resource: '/settings',
    action: 'update',
    resourceOwnerId: 'user456', // Different user owns the resource
  });
  console.log('Result:', result5);
  console.log('Decision:', result5.decision);
  if (result5.violatedRules.length > 0) {
    console.log('Violated rule:', result5.violatedRules[0]?.name);
    console.log('Violation reason:', result5.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 6: Moderator can moderate resources
  console.log('Example 6: Moderator can moderate resources');
  const result6 = await evaluatePolicy(rbacPolicy, {
    userId: 'mod1',
    role: 'moderator',
    resource: '/posts',
    action: 'update',
    resourceOwnerId: 'user123', // Different user owns the resource
  });
  console.log('Result:', result6);
  console.log('Decision:', result6.decision);
  console.log();

  // Example 7: Guest can only read
  console.log('Example 7: Guest can only read');
  const result7 = await evaluatePolicy(rbacPolicy, {
    userId: 'guest1',
    role: 'guest',
    resource: '/posts',
    action: 'read',
  });
  console.log('Result:', result7);
  console.log('Decision:', result7.decision);
  console.log();

  // Example 8: Guest cannot create
  console.log('Example 8: Guest cannot create');
  const result8 = await evaluatePolicy(rbacPolicy, {
    userId: 'guest1',
    role: 'guest',
    resource: '/posts',
    action: 'create',
  });
  console.log('Result:', result8);
  console.log('Decision:', result8.decision);
  if (result8.violatedRules.length > 0) {
    console.log('Violated rule:', result8.violatedRules[0]?.name);
    console.log('Violation reason:', result8.violatedRules[0]?.result.reason);
  }
  console.log();

  // Example 9: Admin access to admin resource
  console.log('Example 9: Admin access to admin resource');
  const result9 = await evaluatePolicy(rbacPolicy, {
    userId: 'admin1',
    role: 'admin',
    resource: '/admin',
    action: 'read',
  });
  console.log('Result:', result9);
  console.log('Decision:', result9.decision);
  console.log();

  // Example 10: User cannot access admin resource
  console.log('Example 10: User cannot access admin resource');
  const result10 = await evaluatePolicy(rbacPolicy, {
    userId: 'user123',
    role: 'user',
    resource: '/admin',
    action: 'read',
  });
  console.log('Result:', result10);
  console.log('Decision:', result10.decision);
  if (result10.violatedRules.length > 0) {
    console.log('Violated rule:', result10.violatedRules[0]?.name);
    console.log('Violation reason:', result10.violatedRules[0]?.result.reason);
  }
  console.log();
}

// Export for use in other files
export {
  rbacContext,
  rbacPolicy,
  roleCheck,
  permissionCheck,
  resourceOwnership,
  actionRestriction,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

