import {
    AuditEvent,
    AuditHandler,
    AuditSink,
    PolicyDefinition,
    auditEventSchema,
} from "@bantai-dev/core";
import { generateId } from "@bantai-dev/shared";

export function createWithAuditHandler(sink: AuditSink) {
    let ended = false;
    let evaluationId: string;
    let policy: Pick<PolicyDefinition<any, any, any>, "name" | "version" | "id">;

    function init(
        _policy: Pick<PolicyDefinition<any, any, any>, "name" | "version" | "id">,
        _evaluationId: string
    ): AuditHandler {
        policy = _policy;
        evaluationId = _evaluationId;
        return { emit };
    }

    function emit(event: Omit<AuditEvent, "evaluationId" | "policy" | "id" | "timestamp">) {
        if (ended) throw new Error("Cannot emit events after policy.end");

        const fullEvent = {
            ...event,
            evaluationId,
            policy,
            id: generateId("event"),
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

        return validated.id;
    }

    return { emit, init };
}
