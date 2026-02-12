import type { StateCreator } from "zustand";
import type { BantaiError, SimulationResult, TraceStep } from "../../types";
import { INITIAL_JSON } from "../utils/initialValues";
import { lintJson } from "../utils/linting";
import type { BantaiState } from "../types";

export interface SimulationSlice {
    simulationInput: string;
    simulationInputErrors: BantaiError[];
    isSimulationRunning: boolean;
    simulationResult: SimulationResult | null;

    setSimulationInput: (input: string) => void;
    runSimulation: () => void;
}

export const createSimulationSlice: StateCreator<
    BantaiState,
    [],
    [],
    SimulationSlice
> = (set, get) => ({
    simulationInput: INITIAL_JSON,
    simulationInputErrors: lintJson(INITIAL_JSON),
    isSimulationRunning: false,
    simulationResult: null,

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
});
