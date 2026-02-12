import type { StateCreator } from "zustand";
import type { BantaiState } from "../types";

export interface ThemeSlice {
    theme: "dark" | "light";
    toggleTheme: () => void;
}

export const createThemeSlice: StateCreator<
    BantaiState,
    [],
    [],
    ThemeSlice
> = (set) => ({
    theme: "dark",
    toggleTheme: () =>
        set((state) => ({
            theme: state.theme === "dark" ? "light" : "dark",
        })),
});
