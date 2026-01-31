import { z } from 'zod';
import { defineContext } from '../context/define-context.js';
import { defineRule } from '../rules/define-rule.js';
import { allow, deny } from '../rules/results.js';
import { definePolicy } from '../policies/define-policy.js';
import { evaluatePolicy } from '../policies/evaluate-policy.js';

/**
 * E-commerce Example
 * 
 * This example demonstrates e-commerce validation policies including:
 * - Inventory availability checks
 * - Purchase quantity limits
 * - Payment method validation
 * - Shipping address validation
 * - Cart total validation (minimum/maximum)
 * 
 * Strategy: Exhaustive (show all validation errors to user)
 */

// Define the context schema for e-commerce
const ecommerceSchema = z.object({
  userId: z.string(),
  cart: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })),
  product: z.object({
    id: z.string(),
    inventory: z.number().int().min(0),
    maxQuantity: z.number().int().min(1).optional(),
    restrictedRegions: z.array(z.string()).optional(),
  }).optional(),
  quantity: z.number().int().min(1).optional(),
  paymentMethod: z.enum(['credit-card', 'debit-card', 'paypal', 'bank-transfer', 'crypto']).optional(),
  shippingAddress: z.object({
    country: z.string().min(2).max(2),
    region: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

// Create the context
const ecommerceContext = defineContext(ecommerceSchema);

// Minimum and maximum cart totals
const MIN_CART_TOTAL = 10; // Minimum $10 order
const MAX_CART_TOTAL = 10000; // Maximum $10,000 order

// Payment method restrictions by region
const PAYMENT_METHOD_RESTRICTIONS: Record<string, string[]> = {
  'credit-card': ['US', 'CA', 'UK', 'EU', 'AU'],
  'debit-card': ['US', 'CA', 'UK', 'EU', 'AU'],
  'paypal': ['US', 'CA', 'UK', 'EU', 'AU', 'MX', 'BR'],
  'bank-transfer': ['EU', 'UK'],
  'crypto': ['US', 'CA', 'UK', 'EU'],
};

// Shipping restrictions by country
const SHIPPING_RESTRICTIONS: Record<string, string[]> = {
  'US': ['CU', 'IR', 'KP', 'SY'], // US embargoed countries
  'EU': ['RU'], // EU restrictions
};

/**
 * Rule: Check inventory availability
 */
const inventoryCheck = defineRule(
  ecommerceContext,
  'inventory-check',
  async (input) => {
    if (!input.product) {
      return allow({
        reason: 'No product specified for inventory check',
      });
    }
    
    if (!input.quantity) {
      return allow({
        reason: 'No quantity specified for inventory check',
      });
    }
    
    if (input.product.inventory < input.quantity) {
      return deny({
        reason: `Insufficient inventory: ${input.quantity} requested, but only ${input.product.inventory} available`,
      });
    }
    
    return allow({
      reason: `Inventory available: ${input.product.inventory} units in stock, ${input.quantity} requested`,
    });
  }
);

/**
 * Rule: Check purchase quantity limits
 */
const quantityLimitCheck = defineRule(
  ecommerceContext,
  'quantity-limit-check',
  async (input) => {
    if (!input.product) {
      return allow({
        reason: 'No product specified for quantity check',
      });
    }
    
    if (!input.quantity) {
      return allow({
        reason: 'No quantity specified for quantity check',
      });
    }
    
    // Check product-specific max quantity
    if (input.product.maxQuantity && input.quantity > input.product.maxQuantity) {
      return deny({
        reason: `Quantity exceeds product limit: ${input.quantity} requested, but maximum is ${input.product.maxQuantity}`,
      });
    }
    
    // General quantity limits
    const MAX_QUANTITY_PER_ITEM = 100;
    if (input.quantity > MAX_QUANTITY_PER_ITEM) {
      return deny({
        reason: `Quantity exceeds general limit: ${input.quantity} requested, but maximum is ${MAX_QUANTITY_PER_ITEM} per item`,
      });
    }
    
    return allow({
      reason: `Quantity OK: ${input.quantity} requested (within limits)`,
    });
  }
);

/**
 * Rule: Check payment method validity
 */
const paymentMethodCheck = defineRule(
  ecommerceContext,
  'payment-method-check',
  async (input) => {
    if (!input.paymentMethod) {
      return allow({
        reason: 'No payment method specified',
      });
    }
    
    if (!input.shippingAddress) {
      return allow({
        reason: 'No shipping address specified, cannot validate payment method',
      });
    }
    
    const allowedMethods = PAYMENT_METHOD_RESTRICTIONS[input.paymentMethod];
    if (!allowedMethods) {
      return deny({
        reason: `Unknown payment method: ${input.paymentMethod}`,
      });
    }
    
    if (!allowedMethods.includes(input.shippingAddress.country)) {
      return deny({
        reason: `Payment method ${input.paymentMethod} is not available in ${input.shippingAddress.country}`,
      });
    }
    
    return allow({
      reason: `Payment method ${input.paymentMethod} is valid for ${input.shippingAddress.country}`,
    });
  }
);

/**
 * Rule: Check shipping address restrictions
 */
const shippingAddressCheck = defineRule(
  ecommerceContext,
  'shipping-address-check',
  async (input) => {
    if (!input.shippingAddress) {
      return allow({
        reason: 'No shipping address specified',
      });
    }
    
    if (!input.product) {
      return allow({
        reason: 'No product specified for shipping check',
      });
    }
    
    // Check product-specific region restrictions
    if (input.product.restrictedRegions && input.product.restrictedRegions.includes(input.shippingAddress.country)) {
      return deny({
        reason: `Product cannot be shipped to ${input.shippingAddress.country} due to product restrictions`,
      });
    }
    
    // Check general shipping restrictions
    for (const [restrictingCountry, restrictedCountries] of Object.entries(SHIPPING_RESTRICTIONS)) {
      if (restrictedCountries.includes(input.shippingAddress.country)) {
        return deny({
          reason: `Shipping to ${input.shippingAddress.country} is restricted from ${restrictingCountry}`,
        });
      }
    }
    
    return allow({
      reason: `Shipping address OK: ${input.shippingAddress.country} is allowed`,
    });
  }
);

/**
 * Rule: Check cart total (minimum and maximum)
 */
const cartTotalCheck = defineRule(
  ecommerceContext,
  'cart-total-check',
  async (input) => {
    if (!input.cart || input.cart.length === 0) {
      return deny({
        reason: 'Cart is empty',
      });
    }
    
    const cartTotal = input.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cartTotal < MIN_CART_TOTAL) {
      return deny({
        reason: `Cart total is below minimum: $${cartTotal.toFixed(2)} is less than minimum $${MIN_CART_TOTAL}`,
      });
    }
    
    if (cartTotal > MAX_CART_TOTAL) {
      return deny({
        reason: `Cart total exceeds maximum: $${cartTotal.toFixed(2)} exceeds maximum $${MAX_CART_TOTAL}`,
      });
    }
    
    return allow({
      reason: `Cart total OK: $${cartTotal.toFixed(2)} (within $${MIN_CART_TOTAL} - $${MAX_CART_TOTAL} range)`,
    });
  }
);

/**
 * Rule: Check cart inventory for all items
 */
const cartInventoryCheck = defineRule(
  ecommerceContext,
  'cart-inventory-check',
  async (input) => {
    if (!input.cart || input.cart.length === 0) {
      return allow({
        reason: 'Cart is empty, no inventory check needed',
      });
    }
    
    // In a real implementation, you'd check inventory for each product in the cart
    // This is a simplified check
    const totalItems = input.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 1000) {
      return deny({
        reason: `Cart contains too many items: ${totalItems} items exceeds limit of 1000`,
      });
    }
    
    return allow({
      reason: `Cart inventory check OK: ${totalItems} total items`,
    });
  }
);

// Define the policy with all rules
const ecommercePolicy = definePolicy(
  ecommerceContext,
  'ecommerce-policy',
  [inventoryCheck, quantityLimitCheck, paymentMethodCheck, shippingAddressCheck, cartTotalCheck, cartInventoryCheck],
  {
    defaultStrategy: 'exhaustive', // Show all validation errors
  }
);

// Example usage scenarios
async function runExamples() {
  console.log('=== E-commerce Examples ===\n');

  // Example 1: Valid cart and checkout
  console.log('Example 1: Valid cart and checkout');
  const result1 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 2, price: 25.99 },
      { productId: 'prod2', quantity: 1, price: 15.50 },
    ],
    product: {
      id: 'prod1',
      inventory: 10,
      maxQuantity: 5,
    },
    quantity: 2,
    paymentMethod: 'credit-card',
    shippingAddress: {
      country: 'US',
      region: 'CA',
      postalCode: '90210',
    },
  });
  console.log('Result:', result1);
  console.log('Decision:', result1.decision);
  console.log('Reason:', result1.reason);
  console.log();

  // Example 2: Insufficient inventory
  console.log('Example 2: Insufficient inventory');
  const result2 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 2, price: 25.99 },
    ],
    product: {
      id: 'prod1',
      inventory: 1, // Only 1 in stock
      maxQuantity: 5,
    },
    quantity: 2, // Requesting 2
    paymentMethod: 'credit-card',
    shippingAddress: {
      country: 'US',
    },
  });
  console.log('Result:', result2);
  console.log('Decision:', result2.decision);
  if (result2.violatedRules.length > 0) {
    result2.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 3: Cart total too low
  console.log('Example 3: Cart total too low');
  const result3 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 1, price: 5.99 }, // Total: $5.99 < $10 minimum
    ],
    paymentMethod: 'credit-card',
    shippingAddress: {
      country: 'US',
    },
  });
  console.log('Result:', result3);
  console.log('Decision:', result3.decision);
  if (result3.violatedRules.length > 0) {
    result3.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 4: Payment method not available in country
  console.log('Example 4: Payment method not available in country');
  const result4 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 2, price: 25.99 },
    ],
    paymentMethod: 'paypal',
    shippingAddress: {
      country: 'JP', // PayPal not available in Japan
    },
  });
  console.log('Result:', result4);
  console.log('Decision:', result4.decision);
  if (result4.violatedRules.length > 0) {
    result4.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 5: Shipping restriction
  console.log('Example 5: Shipping restriction');
  const result5 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 2, price: 25.99 },
    ],
    product: {
      id: 'prod1',
      inventory: 10,
      restrictedRegions: ['CU'], // Cuba restricted
    },
    quantity: 2,
    paymentMethod: 'credit-card',
    shippingAddress: {
      country: 'CU', // Cuba
    },
  });
  console.log('Result:', result5);
  console.log('Decision:', result5.decision);
  if (result5.violatedRules.length > 0) {
    result5.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 6: Quantity exceeds limit
  console.log('Example 6: Quantity exceeds limit');
  const result6 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 10, price: 25.99 },
    ],
    product: {
      id: 'prod1',
      inventory: 20,
      maxQuantity: 5, // Max 5 per order
    },
    quantity: 10, // Requesting 10
    paymentMethod: 'credit-card',
    shippingAddress: {
      country: 'US',
    },
  });
  console.log('Result:', result6);
  console.log('Decision:', result6.decision);
  if (result6.violatedRules.length > 0) {
    result6.violatedRules.forEach((violation) => {
      console.log(`  - ${violation.name}: ${violation.result.reason}`);
    });
  }
  console.log();

  // Example 7: Multiple violations
  console.log('Example 7: Multiple violations');
  const result7 = await evaluatePolicy(ecommercePolicy, {
    userId: 'user123',
    cart: [
      { productId: 'prod1', quantity: 1, price: 2.99 }, // Low total
    ],
    product: {
      id: 'prod1',
      inventory: 0, // Out of stock
      maxQuantity: 5,
    },
    quantity: 1,
    paymentMethod: 'paypal',
    shippingAddress: {
      country: 'JP', // PayPal not available
    },
  });
  console.log('Result:', result7);
  console.log('Decision:', result7.decision);
  console.log('Violated rules:', result7.violatedRules.length);
  result7.violatedRules.forEach((violation) => {
    console.log(`  - ${violation.name}: ${violation.result.reason}`);
  });
  console.log();
}

// Export for use in other files
export {
  ecommerceContext,
  ecommercePolicy,
  inventoryCheck,
  quantityLimitCheck,
  paymentMethodCheck,
  shippingAddressCheck,
  cartTotalCheck,
  cartInventoryCheck,
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

