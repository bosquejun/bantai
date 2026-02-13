import type { BantaiError, Context, Policy, Rule } from "../../../types";

export interface Workspace {
    id: string;
    name: string;
    context: string; // Context definition/code
    rules: Rule[];
    policies: Policy[];
    lastModified: number;
    errors: BantaiError[];
    isDirty: boolean;
}

export interface WorkspaceSnapshot {
    context: string;
    rules: Rule[];
    policies: Policy[];
}

export interface WorkspaceStore {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    snapshots: Record<string, WorkspaceSnapshot>;

    // Workspace actions
    addWorkspace: (name: string) => void;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
    updateContext: (id: string, context: string) => void;
    setWorkspaceErrors: (id: string, errors: BantaiError[]) => void;
    deleteWorkspace: (id: string) => void;
    setActiveWorkspace: (id: string) => void;

    // Workspace path generation (for Monaco editor)
    getWorkspacePath: (workspaceId: string, folder?: string) => string;

    // Save/Discard operations
    saveAll: () => void;
    saveActiveWorkspace: () => void;
    discardActiveChanges: () => void;
    isAnyDirty: () => boolean;
    hasGlobalErrors: () => boolean;
    hasActiveErrors: () => boolean;
}
