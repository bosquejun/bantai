import { AuditEvent, AuditHandler, AuditSink, auditEventSchema } from "@bantai-dev/core";
import { nanoid } from 'nanoid';

export function createWithAuditHandler(
    policy: { name: string; version?: string },
    sink: AuditSink
  ): AuditHandler {
    let ended = false;
    const evaluationId = `eval_${nanoid()}`;
  
    function emit(event: Omit<AuditEvent, "evaluationId" | "policy" | 'id' | 'timestamp'>) {
      if (ended) throw new Error("Cannot emit events after policy.end");
  
      const fullEvent = {
        ...event,
        evaluationId,
        policy,
        id: `event_${nanoid()}`,
        timestamp: Date.now(),
      };
  
      // validate against core schema
      const validated = auditEventSchema.parse(fullEvent);
  
      // send to sink
      sink(validated);
  
      // mark evaluation ended
      if (validated.type === "policy.end") {
        ended = true;
      }
    }
  
    return { emit };
  }
  