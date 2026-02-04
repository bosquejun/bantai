import { definePolicy } from "@bantai-dev/core";
import context from "./context";
import { defaultLimitRule, mutationLimitRule } from "./rules";



export const rateLimitPolicy = definePolicy(context, 'rate-limit-policy', [defaultLimitRule, mutationLimitRule]);