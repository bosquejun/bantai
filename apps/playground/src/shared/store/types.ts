import type {
    BantaiError,
    Context,
    Policy,
    Rule,
    SimulationResult,
} from "../types";
import type { PackageManagerSlice } from "./slices/packageManagerSlice";

export interface ContextSnapshot {
    definition: string;
    rules: Rule[];
    policies: Policy[];
}

export interface BantaiState {
    // Context state
    contexts: Context[];
    activeContextId: string | null;
    snapshots: Record<string, ContextSnapshot>;

    // Simulation state
    simulationInput: string;
    simulationInputErrors: BantaiError[];
    isSimulationRunning: boolean;
    simulationResult: SimulationResult | null;

    // Theme state
    theme: "dark" | "light";

    // Context actions
    addContext: (name: string) => void;
    updateContext: (id: string, updates: Partial<Context>) => void;
    deleteContext: (id: string) => void;
    setActiveContext: (id: string) => void;

    // Rules actions
    addRule: (contextId: string) => void;
    updateRule: (contextId: string, ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (contextId: string, ruleId: string) => void;

    // Policies actions
    addPolicy: (contextId: string) => void;
    updatePolicy: (contextId: string, policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (contextId: string, policyId: string) => void;

    // Simulation actions
    setSimulationInput: (input: string) => void;
    runSimulation: () => void;

    // Save/Discard actions
    saveAll: () => void;
    saveActiveContext: () => void;
    discardActiveChanges: () => void;
    isAnyDirty: () => boolean;
    hasGlobalErrors: () => boolean;
    hasActiveErrors: () => boolean;

    // Theme action
    toggleTheme: () => void;

    // Workspace (in-memory workspace path per context)
    getWorkspacePath: (contextId: string) => string;

    // Package Manager (extends PackageManagerSlice)
    packages: PackageManagerSlice["packages"];
    setPackageStatus: PackageManagerSlice["setPackageStatus"];
    setPackageDownloading: PackageManagerSlice["setPackageDownloading"];
    setPackageInstalling: PackageManagerSlice["setPackageInstalling"];
    setPackageInstalled: PackageManagerSlice["setPackageInstalled"];
    setPackageError: PackageManagerSlice["setPackageError"];
    resetPackages: PackageManagerSlice["resetPackages"];
    hasActivePackages: PackageManagerSlice["hasActivePackages"];
    getDownloadingPackages: PackageManagerSlice["getDownloadingPackages"];
    getInstallingPackages: PackageManagerSlice["getInstallingPackages"];
    getInstalledPackages: PackageManagerSlice["getInstalledPackages"];
}
