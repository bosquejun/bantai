import { z } from "zod";
import { defineContext } from "../src/context/define-context.js";
import { definePolicy } from "../src/policies/define-policy.js";
import { evaluatePolicy } from "../src/policies/evaluate-policy.js";
import { defineRule } from "../src/rules/define-rule.js";
import { allow, deny } from "../src/rules/results.js";

/**
 * Crypto/NFT Example
 *
 * This example demonstrates crypto and NFT policies including:
 * - Ownership verification
 * - Transfer eligibility
 * - Gas price limits
 * - Collection-specific rules
 * - Royalty enforcement
 * - Marketplace restrictions
 * - Network whitelisting
 *
 * Strategy: Exhaustive (collect all policy violations)
 */

// Define the context schema for crypto/NFT operations
const cryptoNftSchema = z.object({
    userId: z.string(),
    walletAddress: z.string(),
    tokenId: z.string().optional(), // NFT token ID
    collection: z.string().optional(), // Collection address or name
    action: z.enum(["transfer", "list", "buy", "sell", "mint", "burn"]),
    gasPrice: z.number().min(0).optional(), // Gas price in gwei
    network: z.enum(["ethereum", "polygon", "arbitrum", "optimism", "base"]),
    ownershipProof: z.string().optional(), // Proof of ownership
    royaltyPercentage: z.number().min(0).max(100).optional(), // Royalty percentage
    marketplace: z.string().optional(), // Marketplace name
});

// Create the context
const cryptoNftContext = defineContext(cryptoNftSchema);

// Network whitelist
const ALLOWED_NETWORKS: Record<string, boolean> = {
    ethereum: true,
    polygon: true,
    arbitrum: true,
    optimism: true,
    base: true,
};

// Gas price limits by network (in gwei)
const GAS_PRICE_LIMITS: Record<string, { min: number; max: number }> = {
    ethereum: { min: 1, max: 500 },
    polygon: { min: 1, max: 1000 },
    arbitrum: { min: 0.1, max: 10 },
    optimism: { min: 0.1, max: 10 },
    base: { min: 0.1, max: 10 },
};

// Collection-specific policies
const COLLECTION_POLICIES: Record<
    string,
    {
        transferable: boolean;
        royaltyRequired: boolean;
        minRoyalty: number;
        maxRoyalty: number;
        marketplaceRestrictions?: string[];
    }
> = {
    "bored-ape-yacht-club": {
        transferable: true,
        royaltyRequired: true,
        minRoyalty: 2.5,
        maxRoyalty: 10,
    },
    "crypto-punks": {
        transferable: true,
        royaltyRequired: false,
        minRoyalty: 0,
        maxRoyalty: 0,
    },
    "art-blocks": {
        transferable: true,
        royaltyRequired: true,
        minRoyalty: 5,
        maxRoyalty: 10,
        marketplaceRestrictions: ["opensea", "foundation"], // Only allowed marketplaces
    },
};

// Marketplace restrictions
const MARKETPLACE_RESTRICTIONS: Record<
    string,
    {
        allowedNetworks: string[];
        minGasPrice?: number;
    }
> = {
    opensea: {
        allowedNetworks: ["ethereum", "polygon", "arbitrum", "optimism", "base"],
    },
    foundation: {
        allowedNetworks: ["ethereum"],
        minGasPrice: 20,
    },
    looksrare: {
        allowedNetworks: ["ethereum"],
    },
    blur: {
        allowedNetworks: ["ethereum"],
    },
};

/**
 * Rule: Verify NFT/token ownership
 */
const ownershipVerification = defineRule(
    cryptoNftContext,
    "ownership-verification",
    async (input) => {
        // Mint and burn don't require ownership verification
        if (input.action === "mint" || input.action === "burn") {
            return allow({
                reason: `${input.action} action does not require ownership verification`,
            });
        }

        // Transfer, list, and sell require ownership
        if (input.action === "transfer" || input.action === "list" || input.action === "sell") {
            if (!input.ownershipProof) {
                return deny({
                    reason: `Ownership proof required for ${input.action} action`,
                });
            }

            // In a real implementation, you'd verify the ownership proof on-chain
            // This is a simplified check
            if (input.ownershipProof.length < 10) {
                return deny({
                    reason: "Invalid ownership proof format",
                });
            }

            return allow({
                reason: `Ownership verified for ${input.action} action`,
            });
        }

        // Buy action doesn't require ownership (you're buying, not selling)
        return allow({
            reason: `${input.action} action does not require ownership verification`,
        });
    }
);

/**
 * Rule: Check transfer eligibility
 */
const transferEligibility = defineRule(cryptoNftContext, "transfer-eligibility", async (input) => {
    if (input.action !== "transfer") {
        return allow({
            reason: `Transfer eligibility check only applies to transfer action`,
        });
    }

    if (!input.collection) {
        return allow({
            reason: "No collection specified, using default transfer rules",
        });
    }

    const collectionPolicy = COLLECTION_POLICIES[input.collection];
    if (collectionPolicy && !collectionPolicy.transferable) {
        return deny({
            reason: `Collection ${input.collection} does not allow transfers`,
        });
    }

    return allow({
        reason: `Transfer is allowed for collection ${input.collection || "default"}`,
    });
});

/**
 * Rule: Check gas price limits
 */
const gasPriceCheck = defineRule(cryptoNftContext, "gas-price-check", async (input) => {
    if (!input.gasPrice) {
        return allow({
            reason: "Gas price not specified, will use network default",
        });
    }

    const networkLimits = GAS_PRICE_LIMITS[input.network];
    if (!networkLimits) {
        return deny({
            reason: `Unknown network: ${input.network}`,
        });
    }

    if (input.gasPrice < networkLimits.min) {
        return deny({
            reason: `Gas price too low: ${input.gasPrice} gwei is below minimum ${networkLimits.min} gwei for ${input.network}`,
        });
    }

    if (input.gasPrice > networkLimits.max) {
        return deny({
            reason: `Gas price too high: ${input.gasPrice} gwei exceeds maximum ${networkLimits.max} gwei for ${input.network}`,
        });
    }

    // Check marketplace-specific gas price requirements
    if (input.marketplace) {
        const marketplaceRestrictions = MARKETPLACE_RESTRICTIONS[input.marketplace];
        if (
            marketplaceRestrictions?.minGasPrice &&
            input.gasPrice < marketplaceRestrictions.minGasPrice
        ) {
            return deny({
                reason: `Gas price too low for marketplace ${input.marketplace}: ${input.gasPrice} gwei is below minimum ${marketplaceRestrictions.minGasPrice} gwei`,
            });
        }
    }

    return allow({
        reason: `Gas price OK: ${input.gasPrice} gwei (within ${networkLimits.min}-${networkLimits.max} gwei for ${input.network})`,
    });
});

/**
 * Rule: Check collection-specific policies
 */
const collectionPolicy = defineRule(cryptoNftContext, "collection-policy", async (input) => {
    if (!input.collection) {
        return allow({
            reason: "No collection specified, using default policies",
        });
    }

    const collectionRules = COLLECTION_POLICIES[input.collection];
    if (!collectionRules) {
        return allow({
            reason: `No specific policies for collection ${input.collection}`,
        });
    }

    // Check marketplace restrictions
    if (collectionRules.marketplaceRestrictions && input.marketplace) {
        if (!collectionRules.marketplaceRestrictions.includes(input.marketplace)) {
            return deny({
                reason: `Collection ${input.collection} is restricted to marketplaces: ${collectionRules.marketplaceRestrictions.join(", ")}. Current marketplace: ${input.marketplace}`,
            });
        }
    }

    return allow({
        reason: `Collection policy check passed for ${input.collection}`,
    });
});

/**
 * Rule: Check royalty requirements
 */
const royaltyCheck = defineRule(cryptoNftContext, "royalty-check", async (input) => {
    // Only list and sell actions require royalty checks
    if (input.action !== "list" && input.action !== "sell") {
        return allow({
            reason: `Royalty check only applies to list and sell actions`,
        });
    }

    if (!input.collection) {
        return allow({
            reason: "No collection specified, using default royalty rules",
        });
    }

    const collectionRules = COLLECTION_POLICIES[input.collection];
    if (!collectionRules) {
        return allow({
            reason: `No royalty requirements for collection ${input.collection}`,
        });
    }

    if (!collectionRules.royaltyRequired) {
        return allow({
            reason: `Collection ${input.collection} does not require royalties`,
        });
    }

    if (!input.royaltyPercentage) {
        return deny({
            reason: `Collection ${input.collection} requires royalty percentage to be specified`,
        });
    }

    if (input.royaltyPercentage < collectionRules.minRoyalty) {
        return deny({
            reason: `Royalty percentage too low: ${input.royaltyPercentage}% is below minimum ${collectionRules.minRoyalty}% for collection ${input.collection}`,
        });
    }

    if (input.royaltyPercentage > collectionRules.maxRoyalty) {
        return deny({
            reason: `Royalty percentage too high: ${input.royaltyPercentage}% exceeds maximum ${collectionRules.maxRoyalty}% for collection ${input.collection}`,
        });
    }

    return allow({
        reason: `Royalty OK: ${input.royaltyPercentage}% (within ${collectionRules.minRoyalty}-${collectionRules.maxRoyalty}% for collection ${input.collection})`,
    });
});

/**
 * Rule: Check marketplace restrictions
 */
const marketplaceRestrictions = defineRule(
    cryptoNftContext,
    "marketplace-restrictions",
    async (input) => {
        if (!input.marketplace) {
            return allow({
                reason: "No marketplace specified",
            });
        }

        const restrictions = MARKETPLACE_RESTRICTIONS[input.marketplace];
        if (!restrictions) {
            return allow({
                reason: `No specific restrictions for marketplace ${input.marketplace}`,
            });
        }

        if (!restrictions.allowedNetworks.includes(input.network)) {
            return deny({
                reason: `Marketplace ${input.marketplace} does not support network ${input.network}. Allowed networks: ${restrictions.allowedNetworks.join(", ")}`,
            });
        }

        return allow({
            reason: `Marketplace ${input.marketplace} supports network ${input.network}`,
        });
    }
);

/**
 * Rule: Check network whitelist
 */
const networkWhitelist = defineRule(cryptoNftContext, "network-whitelist", async (input) => {
    if (!ALLOWED_NETWORKS[input.network]) {
        return deny({
            reason: `Network ${input.network} is not whitelisted. Allowed networks: ${Object.keys(ALLOWED_NETWORKS).join(", ")}`,
        });
    }

    return allow({
        reason: `Network ${input.network} is whitelisted`,
    });
});

// Define the policy with all rules
const cryptoNftPolicy = definePolicy(
    cryptoNftContext,
    "crypto-nft-policy",
    [
        ownershipVerification,
        transferEligibility,
        gasPriceCheck,
        collectionPolicy,
        royaltyCheck,
        marketplaceRestrictions,
        networkWhitelist,
    ],
    {
        defaultStrategy: "exhaustive", // Collect all policy violations
    }
);

// Example usage scenarios
async function runExamples() {
    console.log("=== Crypto/NFT Examples ===\n");

    // Example 1: Valid NFT transfer
    console.log("Example 1: Valid NFT transfer");
    const result1 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "transfer",
        gasPrice: 50,
        network: "ethereum",
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
    });
    console.log("Result:", result1);
    console.log("Decision:", result1.decision);
    console.log("Reason:", result1.reason);
    console.log();

    // Example 2: Listing NFT with royalty
    console.log("Example 2: Listing NFT with royalty");
    const result2 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "list",
        gasPrice: 50,
        network: "ethereum",
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
        royaltyPercentage: 5,
        marketplace: "opensea",
    });
    console.log("Result:", result2);
    console.log("Decision:", result2.decision);
    console.log();

    // Example 3: Missing ownership proof
    console.log("Example 3: Missing ownership proof");
    const result3 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "transfer",
        gasPrice: 50,
        network: "ethereum",
        // ownershipProof missing
    });
    console.log("Result:", result3);
    console.log("Decision:", result3.decision);
    if (result3.violatedRules.length > 0) {
        result3.violatedRules.forEach((violation) => {
            console.log(`  - ${violation.name}: ${violation.result.reason}`);
        });
    }
    console.log();

    // Example 4: Gas price too high
    console.log("Example 4: Gas price too high");
    const result4 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "transfer",
        gasPrice: 600, // Exceeds ethereum max of 500
        network: "ethereum",
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
    });
    console.log("Result:", result4);
    console.log("Decision:", result4.decision);
    if (result4.violatedRules.length > 0) {
        result4.violatedRules.forEach((violation) => {
            console.log(`  - ${violation.name}: ${violation.result.reason}`);
        });
    }
    console.log();

    // Example 5: Royalty too low
    console.log("Example 5: Royalty too low");
    const result5 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "list",
        gasPrice: 50,
        network: "ethereum",
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
        royaltyPercentage: 1, // Below minimum of 2.5%
        marketplace: "opensea",
    });
    console.log("Result:", result5);
    console.log("Decision:", result5.decision);
    if (result5.violatedRules.length > 0) {
        result5.violatedRules.forEach((violation) => {
            console.log(`  - ${violation.name}: ${violation.result.reason}`);
        });
    }
    console.log();

    // Example 6: Marketplace network mismatch
    console.log("Example 6: Marketplace network mismatch");
    const result6 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "bored-ape-yacht-club",
        action: "list",
        gasPrice: 50,
        network: "polygon", // Foundation only supports ethereum
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
        royaltyPercentage: 5,
        marketplace: "foundation",
    });
    console.log("Result:", result6);
    console.log("Decision:", result6.decision);
    if (result6.violatedRules.length > 0) {
        result6.violatedRules.forEach((violation) => {
            console.log(`  - ${violation.name}: ${violation.result.reason}`);
        });
    }
    console.log();

    // Example 7: Mint action (no ownership needed)
    console.log("Example 7: Mint action");
    const result7 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        collection: "art-blocks",
        action: "mint",
        gasPrice: 50,
        network: "ethereum",
    });
    console.log("Result:", result7);
    console.log("Decision:", result7.decision);
    console.log();

    // Example 8: Collection marketplace restriction
    console.log("Example 8: Collection marketplace restriction");
    const result8 = await evaluatePolicy(cryptoNftPolicy, {
        userId: "user123",
        walletAddress: "0x1234...5678",
        tokenId: "12345",
        collection: "art-blocks", // Restricted to opensea and foundation
        action: "list",
        gasPrice: 50,
        network: "ethereum",
        ownershipProof: "0xabcdef1234567890abcdef1234567890",
        royaltyPercentage: 7,
        marketplace: "blur", // Not in allowed list
    });
    console.log("Result:", result8);
    console.log("Decision:", result8.decision);
    if (result8.violatedRules.length > 0) {
        result8.violatedRules.forEach((violation) => {
            console.log(`  - ${violation.name}: ${violation.result.reason}`);
        });
    }
    console.log();
}

// Export for use in other files
export {
    collectionPolicy,
    cryptoNftContext,
    cryptoNftPolicy,
    gasPriceCheck,
    marketplaceRestrictions,
    networkWhitelist,
    ownershipVerification,
    royaltyCheck,
    transferEligibility,
};

// Run examples if this file is executed directly
runExamples().catch(console.error);
