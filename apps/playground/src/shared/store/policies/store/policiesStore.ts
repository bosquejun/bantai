import { useWorkspaceStore } from "../../workspace";
import { INITIAL_POLICY } from "../../utils/initialValues";
import { lintCode } from "../../utils/linting";
import type { Policy } from "../../../types";
import type { PoliciesStore } from "../types/policiesStore.types";

export const usePoliciesStore = (): PoliciesStore => {
    return {
        addPolicy: () => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            const newPolicy = {
                ...INITIAL_POLICY(`policy-${activeWorkspace.policies.length + 1}`),
                isDirty: true,
            };

            updateWorkspace(activeWorkspaceId, {
                policies: [newPolicy, ...activeWorkspace.policies],
            });
        },

        updatePolicy: (policyId, updates) => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            const updatedPolicies = activeWorkspace.policies.map((p) => {
                if (p.id === policyId) {
                    const next = { ...p, ...updates, isDirty: true };
                    if (updates.code !== undefined) {
                        next.errors = lintCode(updates.code);
                    }
                    return next;
                }
                return p;
            });

            updateWorkspace(activeWorkspaceId, {
                policies: updatedPolicies,
            });
        },

        deletePolicy: (policyId) => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            updateWorkspace(activeWorkspaceId, {
                policies: activeWorkspace.policies.filter((p) => p.id !== policyId),
            });
        },
    };
};
