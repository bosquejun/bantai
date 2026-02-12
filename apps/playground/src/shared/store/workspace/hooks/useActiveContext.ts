import { useWorkspaceStore } from "../store/workspaceStore";

export const useActiveContext = (): string | undefined => {
    return useWorkspaceStore((state) => {
        const workspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
        return workspace?.context;
    });
};
