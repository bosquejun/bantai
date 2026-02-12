import type { Policy } from "../../../types";

export interface PoliciesStore {
    addPolicy: () => void;
    updatePolicy: (policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (policyId: string) => void;
}
