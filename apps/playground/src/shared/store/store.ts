import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createContextSlice } from "./slices/contextSlice";
import { createPackageManagerSlice } from "./slices/packageManagerSlice";
import { createPoliciesSlice } from "./slices/policiesSlice";
import { createRulesSlice } from "./slices/rulesSlice";
import { createSaveDiscardSlice } from "./slices/saveDiscardSlice";
import { createSimulationSlice } from "./slices/simulationSlice";
import { createThemeSlice } from "./slices/themeSlice";
import { createWorkspaceSlice, getWorkspacePath } from "./slices/workspaceSlice";
import type { BantaiState } from "./types";

/** Selector: current workspace path for the active context, or null if none. */
export function useCurrentWorkspace(folder?: string): string | null {
    return useBantaiStore((state) =>
        state.activeContextId ? getWorkspacePath(state.activeContextId, folder) : null
    );
}

export const useBantaiStore = create<BantaiState>()(
    persist(
        (...args) => ({
            ...createContextSlice(...args),
            ...createRulesSlice(...args),
            ...createPoliciesSlice(...args),
            ...createSimulationSlice(...args),
            ...createThemeSlice(...args),
            ...createWorkspaceSlice(...args),
            ...createSaveDiscardSlice(...args),
            ...createPackageManagerSlice(...args),
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
