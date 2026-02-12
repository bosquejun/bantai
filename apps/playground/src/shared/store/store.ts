/**
 * @deprecated This file is deprecated. Use domain-specific stores from '@/shared/store' instead.
 * 
 * Migration guide:
 * - useBantaiStore() -> useWorkspaceStore(), useGlobalStore(), useSimulationStore(), etc.
 * - useCurrentWorkspace() -> useCurrentWorkspace() from '@/shared/store' (same API)
 * 
 * This file is kept temporarily for backward compatibility during migration.
 * It will be removed in a future version.
 */

// Re-export new stores for backward compatibility
export {
    useWorkspaceStore,
    useActiveWorkspace,
    useActiveContext,
    useActiveRules,
    useActivePolicies,
    useCurrentWorkspace,
    useGlobalStore,
    useSimulationStore,
    usePackagesStore,
    useRulesStore,
    usePoliciesStore,
} from "./index";

// Legacy exports - these will be removed
export { useBantaiStore } from "./legacy";
