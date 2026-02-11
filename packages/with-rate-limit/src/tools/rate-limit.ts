import { StorageAdapter } from "@bantai-dev/with-storage";
import { z } from "zod";
import { checkRateLimit, incrementRateLimit } from "./rate-limit-helpers.js";

const storageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("fixed-window"),
        count: z.number().int().min(0),
    }),
    z.object({
        type: z.literal("sliding-window"),
        timestamps: z.array(z.number().int().min(0)),
    }),
    z.object({
        type: z.literal("token-bucket"),
        remainingTokens: z.number().int().min(0),
        lastRefillAt: z.number().int().min(0),
    }),
]);

export type RateLimitStoreData = z.infer<typeof storageSchema>;

export type RateLimitStorage = StorageAdapter<RateLimitStoreData>;

export const rateLimit = {
    checkRateLimit,
    incrementRateLimit,
    storageSchema,
};
