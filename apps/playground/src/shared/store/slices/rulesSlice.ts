import type { StateCreator } from "zustand";
import type { Rule } from "../../types";
import { INITIAL_RULE } from "../utils/initialValues";
import { lintCode } from "../utils/linting";
import type { BantaiState } from "../types";

export interface RulesSlice {
    addRule: (contextId: string) => void;
    updateRule: (contextId: string, ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (contextId: string, ruleId: string) => void;
}

export const createRulesSlice: StateCreator<
    BantaiState,
    [],
    [],
    RulesSlice
> = (set) => ({
    addRule: (contextId) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          rules: [
                              {
                                  ...INITIAL_RULE(`rule-${c.rules.length + 1}`),
                                  isDirty: true,
                              },
                              ...c.rules,
                          ],
                      }
                    : c
            ),
        })),

    updateRule: (contextId, ruleId, updates) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          rules: c.rules.map((r) => {
                              if (r.id === ruleId) {
                                  const next = { ...r, ...updates, isDirty: true };
                                  if (updates.code !== undefined) {
                                      next.errors = lintCode(updates.code);
                                  }
                                  return next;
                              }
                              return r;
                          }),
                      }
                    : c
            ),
        })),

    deleteRule: (contextId, ruleId) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          rules: c.rules.filter((r) => r.id !== ruleId),
                      }
                    : c
            ),
        })),
});
