import { AuditEvent, defineContext, definePolicy, defineRule, deny, evaluatePolicy } from "@bantai-dev/core";
import z from "zod";
import { buildExplainTree } from "./explain/build-explain-tree.js";
import { withAudit } from "./with-audit.js";


const s = z.object({
  userId: z.string(),
}); 

const c = defineContext(s);

const sinker = () => {
  const events: AuditEvent[] = [];

  return {
    sink: (event: AuditEvent) => {
      events.push(event);
    },
    getEvents: () => events,
  }
}

const { sink, getEvents } = sinker();

const contextWithAudit = withAudit(c, { sinks: [
    sink
] });


const rule1 = defineRule(contextWithAudit, 'rule1', async (input, context) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
    return deny({ reason: 'test',meta: { test: 'test' } });
});

const policy = definePolicy(contextWithAudit, 'policy1', [rule1]);


await evaluatePolicy(policy, { userId: '123', audit: { trace: { traceId: '123' } } });

console.log(buildExplainTree(getEvents()));