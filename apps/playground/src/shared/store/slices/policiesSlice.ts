import type { StateCreator } from "zustand";
import type { Policy } from "../../types";
import { INITIAL_POLICY } from "../utils/initialValues";
import { lintCode } from "../utils/linting";
import type { BantaiState } from "../types";

export interface PoliciesSlice {
    addPolicy: (contextId: string) => void;
    updatePolicy: (contextId: string, policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (contextId: string, policyId: string) => void;
}

export const createPoliciesSlice: StateCreator<
    BantaiState,
    [],
    [],
    PoliciesSlice
> = (set) => ({
    addPolicy: (contextId) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          policies: [
                              {
                                  ...INITIAL_POLICY(`policy-${c.policies.length + 1}`),
                                  isDirty: true,
                              },
                              ...c.policies,
                          ],
                      }
                    : c
            ),
        })),

    updatePolicy: (contextId, policyId, updates) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          policies: c.policies.map((p) => {
                              if (p.id === policyId) {
                                  const next = { ...p, ...updates, isDirty: true };
                                  if (updates.code !== undefined) {
                                      next.errors = lintCode(updates.code);
                                  }
                                  return next;
                              }
                              return p;
                          }),
                      }
                    : c
            ),
        })),

    deletePolicy: (contextId, policyId) =>
        set((state) => ({
            contexts: state.contexts.map((c) =>
                c.id === contextId
                    ? {
                          ...c,
                          policies: c.policies.filter((p) => p.id !== policyId),
                      }
                    : c
            ),
        })),
});
