import type { StateCreator } from "zustand";
import type { Context } from "../../types";
import { DEFAULT_CONTEXT_DEF, INITIAL_POLICY, INITIAL_RULE } from "../utils/initialValues";
import { lintCode } from "../utils/linting";
import type { BantaiState, ContextSnapshot } from "../types";

export interface ContextSlice {
    contexts: Context[];
    activeContextId: string | null;
    snapshots: Record<string, ContextSnapshot>;

    // Actions
    addContext: (name: string) => void;
    updateContext: (id: string, updates: Partial<Context>) => void;
    deleteContext: (id: string) => void;
    setActiveContext: (id: string) => void;
}

export const createContextSlice: StateCreator<
    BantaiState,
    [],
    [],
    ContextSlice
> = (set) => ({
    contexts: [
        {
            id: "default-context",
            name: "Main App",
            definition: DEFAULT_CONTEXT_DEF,
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
        },
    ],
    snapshots: {},
    activeContextId: "default-context",

    addContext: (name) =>
        set((state) => {
            const id = crypto.randomUUID();
            const newContext: Context = {
                id,
                name,
                definition: DEFAULT_CONTEXT_DEF,
                rules: [INITIAL_RULE("check-access")],
                policies: [INITIAL_POLICY("default-policy")],
                lastModified: Date.now(),
                errors: [],
                isDirty: false,
            };
            return {
                contexts: [...state.contexts, newContext],
                activeContextId: id,
                snapshots: {
                    ...state.snapshots,
                    [id]: {
                        definition: newContext.definition,
                        rules: [...newContext.rules],
                        policies: [...newContext.policies],
                    },
                },
            };
        }),

    updateContext: (id, updates) =>
        set((state) => ({
            contexts: state.contexts.map((c) => {
                if (c.id === id) {
                    const next = {
                        ...c,
                        ...updates,
                        lastModified: Date.now(),
                        isDirty: true,
                    };
                    if (updates.definition !== undefined) {
                        next.errors = lintCode(updates.definition);
                    }
                    return next;
                }
                return c;
            }),
        })),

    deleteContext: (id) =>
        set((state) => {
            const nextContexts = state.contexts.filter((c) => c.id !== id);
            const nextSnapshots = { ...state.snapshots };
            delete nextSnapshots[id];
            return {
                contexts: nextContexts,
                snapshots: nextSnapshots,
                activeContextId:
                    state.activeContextId === id
                        ? nextContexts[0]?.id || null
                        : state.activeContextId,
            };
        }),

    setActiveContext: (id) => set({ activeContextId: id }),
});
