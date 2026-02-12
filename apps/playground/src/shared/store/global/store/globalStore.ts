import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GlobalStore } from "../types/globalStore.types";

export const useGlobalStore = create<GlobalStore>()(
    persist(
        (set) => ({
            theme: "dark",
            toggleTheme: () =>
                set((state) => ({
                    theme: state.theme === "dark" ? "light" : "dark",
                })),
        }),
        {
            name: "bantai-global-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                theme: state.theme,
            }),
        }
    )
);
