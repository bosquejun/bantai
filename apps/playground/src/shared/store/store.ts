import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BantaiError, Context, Policy, Rule, SimulationResult, TraceStep } from "../types";

interface ContextSnapshot {
    definition: string;
    rules: Rule[];
    policies: Policy[];
}

interface BantaiState {
    contexts: Context[];
    activeContextId: string | null;
    snapshots: Record<string, ContextSnapshot>; // Stores the last "Saved" state
    simulationInput: string;
    simulationInputErrors: BantaiError[];
    isSimulationRunning: boolean;
    simulationResult: SimulationResult | null;
    theme: "dark" | "light";

    // Actions
    addContext: (name: string) => void;
    updateContext: (id: string, updates: Partial<Context>) => void;
    deleteContext: (id: string) => void;
    setActiveContext: (id: string) => void;

    addRule: (contextId: string) => void;
    updateRule: (contextId: string, ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (contextId: string, ruleId: string) => void;

    addPolicy: (contextId: string) => void;
    updatePolicy: (contextId: string, policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (contextId: string, policyId: string) => void;

    setSimulationInput: (input: string) => void;
    runSimulation: () => void;

    // Save/Discard Actions
    saveAll: () => void;
    saveActiveContext: () => void;
    discardActiveChanges: () => void;
    isAnyDirty: () => boolean;
    hasGlobalErrors: () => boolean;
    hasActiveErrors: () => boolean;

    // Theme Action
    toggleTheme: () => void;
}

const lintJson = (json: string): BantaiError[] => {
    if (!json.trim()) return [{ message: "JSON input cannot be empty" }];
    try {
        JSON.parse(json);
        return [];
    } catch (e: any) {
        const match = e.message.match(/at position (\d+)/);
        const pos = match ? parseInt(match[1]) : undefined;

        let line: number | undefined;
        if (pos !== undefined) {
            line = json.substring(0, pos).split("\n").length;
        }

        return [
            {
                message: e.message,
                line,
                source: "JSON Syntax",
            },
        ];
    }
};

const lintCode = (code: string): BantaiError[] => {
    const errors: BantaiError[] = [];
    const lines = code.split("\n");

    if (!code.trim()) {
        errors.push({ message: "Code cannot be empty" });
        return errors;
    }

    if (code.includes("eval(")) {
        const lineNum = lines.findIndex((l) => l.includes("eval(")) + 1;
        errors.push({
            message: "Security risk: 'eval' is strictly prohibited in Bantai rules.",
            line: lineNum,
        });
    }

    if (code.includes("console.")) {
        const lineNum = lines.findIndex((l) => l.includes("console.")) + 1;
        errors.push({
            message:
                "Side-effects detected: 'console' methods are not available in the policy sandbox.",
            line: lineNum,
        });
    }

    if (code.includes("var ")) {
        const lineNum = lines.findIndex((l) => l.includes("var ")) + 1;
        errors.push({
            message: "Syntax error: 'var' is deprecated. Use 'const' or 'let'.",
            line: lineNum,
        });
    }

    if (code.includes("rule(") && !code.includes("(ctx)") && !code.includes("ctx =>")) {
        errors.push({
            message: "Reference error: Policy rules must accept a 'ctx' parameter.",
            line: 1,
        });
    }

    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
        errors.push({
            message: `Grammar error: Unbalanced curly braces. Found ${openBrackets} '{' and ${closeBrackets} '}'.`,
        });
    }

    return errors;
};

const DEFAULT_CONTEXT_DEF = `const appContext = defineContext(
  z.object({
    userId: z.string(),
    role: z.enum(['admin', 'user', 'guest']),
    resource: z.object({
      id: z.string(),
      ownerId: z.string(),
      isPublic: z.boolean()
    }),
    isBanned: z.boolean().optional()
  })
);`;

const INITIAL_RULE = (name: string, customCode?: string) => {
    const code =
        customCode ||
        `const ${name
            .split("-")
            .map((word, idx) =>
                idx === 0
                    ? word.charAt(0).toLowerCase() + word.slice(1)
                    : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join(
                ""
            )} = defineRule(appContext, "${name}", async (input, ctx) => {\n  return input.role === 'admin';\n});`;
    return {
        id: crypto.randomUUID(),
        name,
        code,
        enabled: true,
        errors: lintCode(code),
        isDirty: false,
    };
};

const INITIAL_POLICY = (
    name: string,
    rules: string[] = ["is-admin"],
    effect: "ALLOW" | "DENY" = "ALLOW"
) => ({
    id: crypto.randomUUID(),
    name,
    code: `const ${name
        .split("-")
        .map((word, idx) =>
            idx === 0
                ? word.charAt(0).toLowerCase() + word.slice(1)
                : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(
            ""
        )} = definePolicy(appContext, "${name}", ${JSON.stringify(rules)}, { effect: "${effect}" });`,
    enabled: true,
    errors: [],
    isDirty: false,
});

const INITIAL_JSON = JSON.stringify(
    {
        userId: "u_123",
        role: "admin",
        isBanned: false,
        resource: {
            id: "r_999",
            ownerId: "u_123",
            isPublic: false,
        },
    },
    null,
    2
);

export const useBantaiStore = create<BantaiState>()(
    persist(
        (set, get) => ({
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
            simulationInput: INITIAL_JSON,
            simulationInputErrors: lintJson(INITIAL_JSON),
            isSimulationRunning: false,
            simulationResult: null,
            theme: "dark",

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

            setSimulationInput: (input) =>
                set({
                    simulationInput: input,
                    simulationInputErrors: lintJson(input),
                }),

            runSimulation: () => {
                const { simulationInput, activeContextId, contexts, simulationInputErrors } = get();

                if (simulationInputErrors.length > 0) return;

                const startTime = performance.now();
                set({ isSimulationRunning: true, simulationResult: null });

                setTimeout(() => {
                    const trace: TraceStep[] = [];
                    let allowed = false;
                    let explicitDenyTriggered = false;
                    let denyingPolicyName = "";
                    let allowingPolicyName = "";
                    let matchFound = false;
                    let error: string | undefined;
                    let reason = "";

                    try {
                        const inputData = JSON.parse(simulationInput);
                        const context = contexts.find((c) => c.id === activeContextId);

                        if (!context) throw new Error("No active context");

                        trace.push({
                            id: "init",
                            label: "Context Initialized",
                            type: "info",
                            status: "success",
                        });

                        const ruleResults: Record<string, boolean> = {};

                        context.rules.forEach((rule, idx) => {
                            if (!rule.enabled) {
                                trace.push({
                                    id: `r-${idx}`,
                                    label: `Rule: ${rule.name}`,
                                    type: "rule",
                                    status: "skip",
                                    message: "Rule disabled",
                                });
                                return;
                            }

                            if (rule.errors.length > 0) {
                                trace.push({
                                    id: `r-${idx}`,
                                    label: `Rule: ${rule.name}`,
                                    type: "rule",
                                    status: "error",
                                    message: "Compilation errors",
                                });
                                return;
                            }

                            let pass = false;
                            if (
                                rule.code.includes("ctx.role === 'admin'") &&
                                inputData.role === "admin"
                            )
                                pass = true;
                            if (
                                rule.code.includes("ctx.userId === ctx.resource.ownerId") &&
                                inputData.userId === inputData.resource?.ownerId
                            )
                                pass = true;
                            if (
                                rule.code.includes("ctx.resource.isPublic") &&
                                inputData.resource?.isPublic === true
                            )
                                pass = true;
                            if (
                                rule.code.includes("ctx.isBanned === true") &&
                                inputData.isBanned === true
                            )
                                pass = true;

                            ruleResults[rule.name] = pass;
                            trace.push({
                                id: `r-${idx}`,
                                label: `Rule: ${rule.name}`,
                                type: "rule",
                                status: pass ? "success" : "failure",
                                message: pass ? "Evaluation passed" : "Condition not met",
                            });
                        });

                        context.policies.forEach((policy, idx) => {
                            if (!policy.enabled) return;

                            const rulesMatch = policy.code.match(/rules:\s*\[([^\]]+)\]/);
                            const policyRules = rulesMatch
                                ? rulesMatch[1].split(",").map((s) => s.trim().replace(/"/g, ""))
                                : [];

                            const effectMatch = policy.code.match(
                                /effect:\s*["'](ALLOW|DENY)["']/i
                            );
                            const effect = effectMatch ? effectMatch[1].toUpperCase() : "ALLOW";

                            const allRulesPass = policyRules.every(
                                (rn) => ruleResults[rn] === true
                            );

                            if (allRulesPass && policyRules.length > 0) {
                                matchFound = true;
                                if (effect === "DENY") {
                                    explicitDenyTriggered = true;
                                    denyingPolicyName = policy.name;
                                    trace.push({
                                        id: `p-${idx}`,
                                        label: `Policy: ${policy.name}`,
                                        type: "policy",
                                        status: "failure",
                                        message: `Explicit DENY triggered. Rules: ${policyRules.join(", ")}`,
                                    });
                                } else {
                                    allowed = true;
                                    allowingPolicyName = policy.name;
                                    trace.push({
                                        id: `p-${idx}`,
                                        label: `Policy: ${policy.name}`,
                                        type: "policy",
                                        status: "success",
                                        message: `Matched rules: ${policyRules.join(", ")} (ALLOW)`,
                                    });
                                }
                            } else if (policyRules.length > 0) {
                                trace.push({
                                    id: `p-${idx}`,
                                    label: `Policy: ${policy.name}`,
                                    type: "policy",
                                    status: "skip",
                                    message: "Policy rules not satisfied",
                                });
                            }
                        });

                        if (explicitDenyTriggered) {
                            allowed = false;
                            reason = `Explicitly denied by policy: "${denyingPolicyName}"`;
                        } else if (!matchFound) {
                            allowed = false;
                            reason = "Implicitly denied (No matching policies found)";
                        } else if (!allowed) {
                            allowed = false;
                            reason = "Access denied (Policies matched but none granted permission)";
                        } else {
                            reason = `Access granted by policy: "${allowingPolicyName}"`;
                        }

                        trace.push({
                            id: "final",
                            label: "Final Result",
                            type: "result",
                            status: allowed ? "success" : "failure",
                            message: reason,
                        });
                    } catch (e: any) {
                        error = e.message;
                        trace.push({
                            id: "err",
                            label: "Processing Error",
                            type: "info",
                            status: "error",
                            message: e.message,
                        });
                    }

                    const duration = Math.round(performance.now() - startTime);
                    set({
                        isSimulationRunning: false,
                        simulationResult: {
                            allowed,
                            trace,
                            duration,
                            timestamp: Date.now(),
                            error,
                            reason,
                        },
                    });
                }, 1200);
            },

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
                    const nextSnapshots = { ...state.snapshots };
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
                    const nextSnapshots = { ...state.snapshots };
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

            toggleTheme: () =>
                set((state) => ({
                    theme: state.theme === "dark" ? "light" : "dark",
                })),
        }),
        {
            name: "bantai-playground-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                contexts: state.contexts,
                activeContextId: state.activeContextId,
                snapshots: state.snapshots,
                simulationInput: state.simulationInput,
                theme: state.theme,
            }),
        }
    )
);
