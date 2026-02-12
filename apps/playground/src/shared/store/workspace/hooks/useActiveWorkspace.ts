import { useMemo } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import type { Workspace } from "../types/workspaceStore.types";

export const useActiveWorkspace = (): Workspace | undefined => {
    return useWorkspaceStore((state) => {
        return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
    });
};
