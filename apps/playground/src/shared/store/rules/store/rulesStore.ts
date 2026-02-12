import { useWorkspaceStore } from "../../workspace";
import { INITIAL_RULE } from "../../utils/initialValues";
import { lintCode } from "../../utils/linting";
import type { Rule } from "../../../types";
import type { RulesStore } from "../types/rulesStore.types";

export const useRulesStore = (): RulesStore => {
    return {
        addRule: () => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            const newRule = {
                ...INITIAL_RULE(`rule-${activeWorkspace.rules.length + 1}`),
                isDirty: true,
            };

            updateWorkspace(activeWorkspaceId, {
                rules: [newRule, ...activeWorkspace.rules],
            });
        },

        updateRule: (ruleId, updates) => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            const updatedRules = activeWorkspace.rules.map((r) => {
                if (r.id === ruleId) {
                    const next = { ...r, ...updates, isDirty: true };
                    if (updates.code !== undefined) {
                        next.errors = lintCode(updates.code);
                    }
                    return next;
                }
                return r;
            });

            updateWorkspace(activeWorkspaceId, {
                rules: updatedRules,
            });
        },

        deleteRule: (ruleId) => {
            const workspaceStore = useWorkspaceStore.getState();
            const { activeWorkspaceId, workspaces, updateWorkspace } = workspaceStore;
            const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

            if (!activeWorkspaceId || !activeWorkspace) return;

            updateWorkspace(activeWorkspaceId, {
                rules: activeWorkspace.rules.filter((r) => r.id !== ruleId),
            });
        },
    };
};
