import type { StateCreator } from "zustand";
import type { BantaiState } from "../types";

/** Base path for in-memory workspace URIs. Format: file://workspace/{contextId}/ */
export const WORKSPACE_PATH_PREFIX = "file:///workspace";

export interface WorkspaceSlice {
    /** Build workspace path for a given context id. */
    getWorkspacePath: (contextId: string) => string;
}

/**
 * Returns the in-memory workspace URI for a context.
 * @param contextId - Context id (e.g. from activeContextId or context.id)
 * @returns URI like `file://workspace/{contextId}/`
 */
export function getWorkspacePath(contextId: string, folder?: string): string {
    return `${WORKSPACE_PATH_PREFIX}/${contextId}${folder || ""}`;
}

export const createWorkspaceSlice: StateCreator<BantaiState, [], [], WorkspaceSlice> = () => ({
    getWorkspacePath,
});
