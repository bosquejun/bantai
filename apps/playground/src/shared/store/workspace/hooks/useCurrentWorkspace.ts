import { useMemo } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";

/**
 * Get the current workspace path for Monaco editor.
 * @param folder - Optional folder path (e.g., "/preview", "/rules")
 * @returns Workspace URI or null if no active workspace
 */
export const useCurrentWorkspace = (folder?: string): string | null => {
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const getWorkspacePath = useWorkspaceStore((state) => state.getWorkspacePath);

    return useMemo(
        () => (activeWorkspaceId ? getWorkspacePath(activeWorkspaceId, folder) : null),
        [activeWorkspaceId, getWorkspacePath, folder]
    );
};
