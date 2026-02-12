import type { StateCreator } from "zustand";
import type { BantaiState, ContextSnapshot } from "../types";
import { lintCode } from "../utils/linting";

export interface SaveDiscardSlice {
    saveAll: () => void;
    saveActiveContext: () => void;
    discardActiveChanges: () => void;
    isAnyDirty: () => boolean;
    hasGlobalErrors: () => boolean;
    hasActiveErrors: () => boolean;
}

export const createSaveDiscardSlice: StateCreator<
    BantaiState,
    [],
    [],
    SaveDiscardSlice
> = (set, get) => ({
    isAnyDirty: () => {
        const { contexts } = get();
        return contexts.some(
            (c) =>
                c.isDirty ||
                c.rules.some((r) => r.isDirty) ||
                c.policies.some((p) => p.isDirty)
        );
    },

    hasGlobalErrors: () => {
        const { contexts } = get();
        return contexts.some(
            (c) =>
                c.errors.length > 0 ||
                c.rules.some((r) => r.errors.length > 0) ||
                c.policies.some((p) => p.errors.length > 0)
        );
    },

    hasActiveErrors: () => {
        const { contexts, activeContextId } = get();
        const c = contexts.find((ctx) => ctx.id === activeContextId);
        if (!c) return false;
        return (
            c.errors.length > 0 ||
            c.rules.some((r) => r.errors.length > 0) ||
            c.policies.some((p) => p.errors.length > 0)
        );
    },

    saveAll: () =>
        set((state) => {
            const nextSnapshots: Record<string, ContextSnapshot> = { ...state.snapshots };
            const nextContexts = state.contexts.map((c) => {
                nextSnapshots[c.id] = {
                    definition: c.definition,
                    rules: [...c.rules],
                    policies: [...c.policies],
                };
                return {
                    ...c,
                    isDirty: false,
                    lastModified: Date.now(),
                    rules: c.rules.map((r) => ({ ...r, isDirty: false })),
                    policies: c.policies.map((p) => ({ ...p, isDirty: false })),
                };
            });
            return { contexts: nextContexts, snapshots: nextSnapshots };
        }),

    saveActiveContext: () =>
        set((state) => {
            const nextSnapshots: Record<string, ContextSnapshot> = { ...state.snapshots };
            const nextContexts = state.contexts.map((c) => {
                if (c.id === state.activeContextId) {
                    nextSnapshots[c.id] = {
                        definition: c.definition,
                        rules: [...c.rules],
                        policies: [...c.policies],
                    };
                    return {
                        ...c,
                        isDirty: false,
                        lastModified: Date.now(),
                        rules: c.rules.map((r) => ({ ...r, isDirty: false })),
                        policies: c.policies.map((p) => ({ ...p, isDirty: false })),
                    };
                }
                return c;
            });
            return { contexts: nextContexts, snapshots: nextSnapshots };
        }),

    discardActiveChanges: () =>
        set((state) => {
            const snapshot = state.snapshots[state.activeContextId || ""];
            if (!snapshot) return state;

            return {
                contexts: state.contexts.map((c) =>
                    c.id === state.activeContextId
                        ? {
                              ...c,
                              definition: snapshot.definition,
                              rules: snapshot.rules.map((r) => ({ ...r, isDirty: false })),
                              policies: snapshot.policies.map((p) => ({
                                  ...p,
                                  isDirty: false,
                              })),
                              isDirty: false,
                              errors: lintCode(snapshot.definition),
                          }
                        : c
                ),
            };
        }),
});
