import { AuditEvent } from "@bantai-dev/core";

export type AuditNode = AuditEvent & { children: AuditNode[] };

export function buildExplainTree(events: AuditEvent[]): AuditNode[] {
    const nodeMap = new Map<string, AuditNode>();
    const roots: AuditNode[] = [];

    // initialize nodes
    for (const ev of events) {
        nodeMap.set(ev.id, { ...ev, children: [] });
    }

    // link children to parents
    for (const ev of events) {
        const node = nodeMap.get(ev.id)!;
        if (ev.parentId) {
            const parent = nodeMap.get(ev.parentId);
            if (parent) parent.children.push(node);
            else roots.push(node); // fallback if parent not found
        } else {
            roots.push(node);
        }
    }

    return roots;
}
