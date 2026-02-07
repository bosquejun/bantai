import { defineContext, definePolicy, defineRule, deny, evaluatePolicy } from "@bantai-dev/core";
import z from "zod";
import { withAudit } from "./with-audit.js";


const s = z.object({
  userId: z.string(),
}); 

const c = defineContext(s);


const contextWithAudit = withAudit(c, { sinks: [
    (e) => console.log(e)
] });


const rule1 = defineRule(contextWithAudit, 'rule1', async (input, context) => {
    return deny({ reason: 'test',meta: { test: 'test' } });
});

const policy = definePolicy(contextWithAudit, 'policy1', [rule1]);


const result = await evaluatePolicy(policy, { userId: '123', audit: { trace: { traceId: '123' } } });

console.log(result);