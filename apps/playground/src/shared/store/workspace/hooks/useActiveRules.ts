import { useWorkspaceStore } from "../store/workspaceStore";
import type { Rule } from "../../../types";

export const useActiveRules = (): Rule[] => {
    return useWorkspaceStore((state) => {
        const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        return workspace?.rules || [];
    });
};
