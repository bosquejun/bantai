import type { Rule } from "../../../types";

export interface RulesStore {
    addRule: () => void;
    updateRule: (ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (ruleId: string) => void;
}
