import { useWorkspaceStore } from "../store/workspaceStore";
import type { Policy } from "../../../types";

export const useActivePolicies = (): Policy[] => {
    return useWorkspaceStore((state) => {
        const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        return workspace?.policies || [];
    });
};
