/**
 * Migration utility to convert old store format to new domain-based structure
 * Migrates from bantai-playground-storage to separate domain stores
 */

interface OldStoreState {
    contexts?: Array<{
        id: string;
        name: string;
        definition: string;
        rules: any[];
        policies: any[];
        lastModified: number;
        errors: any[];
        isDirty: boolean;
    }>;
    activeContextId?: string | null;
    snapshots?: Record<string, any>;
    theme?: "dark" | "light";
    simulationInput?: string;
}

/**
 * Migrate old store data to new domain structure
 * This should be called once on app initialization
 */
export function migrateOldStore(): void {
    if (typeof window === "undefined") return;

    try {
        const oldStorageKey = "bantai-playground-storage";
        const oldDataStr = localStorage.getItem(oldStorageKey);
        
        if (!oldDataStr) {
            // No old data to migrate
            return;
        }

        const oldData: OldStoreState = JSON.parse(oldDataStr);
        
        // Migrate workspaces from contexts
        if (oldData.contexts && oldData.contexts.length > 0) {
            const workspaceStore = localStorage.getItem("bantai-workspace-storage");
            
            // Only migrate if new store doesn't exist or is empty
            if (!workspaceStore) {
                const workspaces = oldData.contexts.map((ctx) => ({
                    id: ctx.id,
                    name: ctx.name,
                    context: ctx.definition,
                    rules: ctx.rules || [],
                    policies: ctx.policies || [],
                    lastModified: ctx.lastModified || Date.now(),
                    errors: ctx.errors || [],
                    isDirty: ctx.isDirty || false,
                }));

                const newWorkspaceStore = {
                    state: {
                        workspaces,
                        activeWorkspaceId: oldData.activeContextId || workspaces[0]?.id || null,
                        snapshots: oldData.snapshots || {},
                    },
                    version: 0,
                };

                localStorage.setItem(
                    "bantai-workspace-storage",
                    JSON.stringify(newWorkspaceStore)
                );
            }
        }

        // Migrate theme
        if (oldData.theme) {
            const globalStore = localStorage.getItem("bantai-global-storage");
            if (!globalStore) {
                const newGlobalStore = {
                    state: {
                        theme: oldData.theme,
                    },
                    version: 0,
                };
                localStorage.setItem(
                    "bantai-global-storage",
                    JSON.stringify(newGlobalStore)
                );
            }
        }

        // Migrate simulation input
        if (oldData.simulationInput) {
            const simulationStore = localStorage.getItem("bantai-simulation-storage");
            if (!simulationStore) {
                const newSimulationStore = {
                    state: {
                        simulationInput: oldData.simulationInput,
                    },
                    version: 0,
                };
                localStorage.setItem(
                    "bantai-simulation-storage",
                    JSON.stringify(newSimulationStore)
                );
            }
        }

        // Mark migration as complete (optional: remove old storage)
        // Uncomment to remove old storage after migration:
        // localStorage.removeItem(oldStorageKey);
        
        console.log("✅ Store migration completed successfully");
    } catch (error) {
        console.error("❌ Store migration failed:", error);
        // Don't throw - allow app to continue with new empty stores
    }
}
