import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BantaiError } from "../../../types";
import { DEFAULT_CONTEXT_DEF, INITIAL_POLICY, INITIAL_RULE } from "../../utils/initialValues";
import { lintCode } from "../../utils/linting";
import type { Workspace, WorkspaceSnapshot, WorkspaceStore } from "../types/workspaceStore.types";

/** Base path for in-memory workspace URIs. Format: file://workspace/{workspaceId}/ */
export const WORKSPACE_PATH_PREFIX = "file:///workspace";

/**
 * Returns the in-memory workspace URI for a workspace.
 * @param workspaceId - Workspace id
 * @param folder - Optional folder path (e.g., "/preview", "/rules")
 * @returns URI like `file://workspace/{workspaceId}/{folder}`
 */
export function getWorkspacePath(workspaceId: string, folder?: string): string {
    return `${WORKSPACE_PATH_PREFIX}/${workspaceId}${folder || ""}`;
}

const createDefaultWorkspace = (name: string): Workspace => ({
    id: nanoid(),
    name,
    context: DEFAULT_CONTEXT_DEF,
    rules: [
        INITIAL_RULE("is-admin"),
        INITIAL_RULE(
            "is-owner",
            `rule("is-owner", (ctx) => {\n  return ctx.userId === ctx.resource.ownerId;\n});`
        ),
        INITIAL_RULE(
            "is-banned",
            `rule("is-banned", (ctx) => {\n  return ctx.isBanned === true;\n});`
        ),
    ],
    policies: [
        INITIAL_POLICY("admin-access", ["is-admin"]),
        INITIAL_POLICY("block-banned-users", ["is-banned"], "DENY"),
    ],
    lastModified: Date.now(),
    errors: [],
    isDirty: false,
});

export const useWorkspaceStore = create<WorkspaceStore>()(
    persist(
        (set, get) => ({
            workspaces: [createDefaultWorkspace("Main App")],
            activeWorkspaceId: null,
            snapshots: {},

            getWorkspacePath,

            addWorkspace: (name) =>
                set((state) => {
                    const newWorkspace = createDefaultWorkspace(name);
                    return {
                        workspaces: [...state.workspaces, newWorkspace],
                        activeWorkspaceId: newWorkspace.id,
                        snapshots: {
                            ...state.snapshots,
                            [newWorkspace.id]: {
                                context: newWorkspace.context,
                                rules: [...newWorkspace.rules],
                                policies: [...newWorkspace.policies],
                            },
                        },
                    };
                }),

            updateWorkspace: (id, updates) =>
                set((state) => ({
                    workspaces: state.workspaces.map((w) => {
                        if (w.id === id) {
                            const next = {
                                ...w,
                                ...updates,
                                lastModified: Date.now(),
                                isDirty: true,
                            };
                            if (updates.context !== undefined) {
                                next.errors = lintCode(updates.context);
                            }
                            return next;
                        }
                        return w;
                    }),
                })),

            updateContext: (id, context) =>
                set((state) => ({
                    workspaces: state.workspaces.map((w) =>
                        w.id === id
                            ? {
                                  ...w,
                                  context,
                                  // Errors for workspace context are managed explicitly
                                  // by the editor layer (ContextPanel) to avoid flicker
                                  lastModified: Date.now(),
                                  isDirty: true,
                              }
                            : w
                    ),
                })),

            setWorkspaceErrors: (id, errors) =>
                set((state) => ({
                    workspaces: state.workspaces.map((w) =>
                        w.id === id
                            ? {
                                  ...w,
                                  errors,
                              }
                            : w
                    ),
                })),

            deleteWorkspace: (id) =>
                set((state) => {
                    const nextWorkspaces = state.workspaces.filter((w) => w.id !== id);
                    const nextSnapshots = { ...state.snapshots };
                    delete nextSnapshots[id];
                    return {
                        workspaces: nextWorkspaces,
                        snapshots: nextSnapshots,
                        activeWorkspaceId:
                            state.activeWorkspaceId === id
                                ? nextWorkspaces[0]?.id || null
                                : state.activeWorkspaceId,
                    };
                }),

            setActiveWorkspace: (id) => {
                // Initialize snapshot if it doesn't exist
                const state = get();
                if (!state.snapshots[id]) {
                    const workspace = state.workspaces.find((w) => w.id === id);
                    if (workspace) {
                        set({
                            activeWorkspaceId: id,
                            snapshots: {
                                ...state.snapshots,
                                [id]: {
                                    context: workspace.context,
                                    rules: [...workspace.rules],
                                    policies: [...workspace.policies],
                                },
                            },
                        });
                        return;
                    }
                }
                set({ activeWorkspaceId: id });
            },

            isAnyDirty: () => {
                const { workspaces } = get();
                return workspaces.some(
                    (w) =>
                        w.isDirty ||
                        w.rules.some((r) => r.isDirty) ||
                        w.policies.some((p) => p.isDirty)
                );
            },

            hasGlobalErrors: () => {
                const { workspaces } = get();
                return workspaces.some(
                    (w) =>
                        w.errors.length > 0 ||
                        w.rules.some((r) => r.errors.length > 0) ||
                        w.policies.some((p) => p.errors.length > 0)
                );
            },

            hasActiveErrors: () => {
                const { workspaces, activeWorkspaceId } = get();
                const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
                if (!workspace) return false;
                return (
                    workspace.errors.length > 0 ||
                    workspace.rules.some((r) => r.errors.length > 0) ||
                    workspace.policies.some((p) => p.errors.length > 0)
                );
            },

            saveAll: () =>
                set((state) => {
                    const nextSnapshots: Record<string, WorkspaceSnapshot> = {
                        ...state.snapshots,
                    };
                    const nextWorkspaces = state.workspaces.map((w) => {
                        nextSnapshots[w.id] = {
                            context: w.context,
                            rules: [...w.rules],
                            policies: [...w.policies],
                        };
                        return {
                            ...w,
                            isDirty: false,
                            lastModified: Date.now(),
                            rules: w.rules.map((r) => ({ ...r, isDirty: false })),
                            policies: w.policies.map((p) => ({ ...p, isDirty: false })),
                        };
                    });
                    return { workspaces: nextWorkspaces, snapshots: nextSnapshots };
                }),

            saveActiveWorkspace: () =>
                set((state) => {
                    if (!state.activeWorkspaceId) return state;
                    const nextSnapshots: Record<string, WorkspaceSnapshot> = {
                        ...state.snapshots,
                    };
                    const nextWorkspaces = state.workspaces.map((w) => {
                        if (w.id === state.activeWorkspaceId) {
                            nextSnapshots[w.id] = {
                                context: w.context,
                                rules: [...w.rules],
                                policies: [...w.policies],
                            };
                            return {
                                ...w,
                                isDirty: false,
                                lastModified: Date.now(),
                                rules: w.rules.map((r) => ({ ...r, isDirty: false })),
                                policies: w.policies.map((p) => ({ ...p, isDirty: false })),
                            };
                        }
                        return w;
                    });
                    return { workspaces: nextWorkspaces, snapshots: nextSnapshots };
                }),

            discardActiveChanges: () =>
                set((state) => {
                    const snapshot = state.snapshots[state.activeWorkspaceId || ""];
                    if (!snapshot || !state.activeWorkspaceId) return state;

                    return {
                        workspaces: state.workspaces.map((w) =>
                            w.id === state.activeWorkspaceId
                                ? {
                                      ...w,
                                      context: snapshot.context,
                                      rules: snapshot.rules.map((r) => ({
                                          ...r,
                                          isDirty: false,
                                      })),
                                      policies: snapshot.policies.map((p) => ({
                                          ...p,
                                          isDirty: false,
                                      })),
                                      isDirty: false,
                                      errors: lintCode(snapshot.context),
                                  }
                                : w
                        ),
                    };
                }),
        }),
        {
            name: "bantai-workspace-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                workspaces: state.workspaces,
                activeWorkspaceId: state.activeWorkspaceId,
                snapshots: state.snapshots,
            }),
        }
    )
);

// Initialize active workspace on first load if not set
if (typeof window !== "undefined") {
    // Run migration first, then initialize active workspace
    import("../../utils/migration")
        .then(({ migrateOldStore }) => {
            migrateOldStore();
            
            // Then initialize active workspace
            const state = useWorkspaceStore.getState();
            if (!state.activeWorkspaceId && state.workspaces.length > 0) {
                state.setActiveWorkspace(state.workspaces[0].id);
            }
        })
        .catch((error) => {
            console.error("Failed to run migration:", error);
            // Still try to initialize active workspace even if migration fails
            const state = useWorkspaceStore.getState();
            if (!state.activeWorkspaceId && state.workspaces.length > 0) {
                state.setActiveWorkspace(state.workspaces[0].id);
            }
        });
}
