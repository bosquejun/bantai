import type { StateCreator } from "zustand";
import type { BantaiState } from "../types";

export type PackageStatus = "idle" | "downloading" | "installing" | "installed" | "error";

export interface PackageInfo {
    name: string;
    version: string;
    status: PackageStatus;
    error?: string;
}

export interface PackageManagerSlice {
    packages: Record<string, PackageInfo>;
    
    // Actions
    setPackageStatus: (name: string, version: string, status: PackageStatus, error?: string) => void;
    setPackageDownloading: (name: string, version: string) => void;
    setPackageInstalling: (name: string, version: string) => void;
    setPackageInstalled: (name: string, version: string) => void;
    setPackageError: (name: string, version: string, error: string) => void;
    resetPackages: () => void;
    
    // Computed
    hasActivePackages: () => boolean;
    getDownloadingPackages: () => PackageInfo[];
    getInstallingPackages: () => PackageInfo[];
    getInstalledPackages: () => PackageInfo[];
}

export const createPackageManagerSlice: StateCreator<
    BantaiState,
    [],
    [],
    PackageManagerSlice
> = (set, get) => ({
    packages: {},

    setPackageStatus: (name, version, status, error) =>
        set((state) => ({
            packages: {
                ...state.packages,
                [name]: {
                    name,
                    version,
                    status,
                    error,
                },
            },
        })),

    setPackageDownloading: (name, version) =>
        set((state) => ({
            packages: {
                ...state.packages,
                [name]: {
                    name,
                    version,
                    status: "downloading",
                },
            },
        })),

    setPackageInstalling: (name, version) =>
        set((state) => ({
            packages: {
                ...state.packages,
                [name]: {
                    name,
                    version,
                    status: "installing",
                },
            },
        })),

    setPackageInstalled: (name, version) =>
        set((state) => ({
            packages: {
                ...state.packages,
                [name]: {
                    name,
                    version,
                    status: "installed",
                },
            },
        })),

    setPackageError: (name, version, error) =>
        set((state) => ({
            packages: {
                ...state.packages,
                [name]: {
                    name,
                    version,
                    status: "error",
                    error,
                },
            },
        })),

    resetPackages: () =>
        set({
            packages: {},
        }),

    hasActivePackages: () => {
        const { packages } = get();
        return Object.values(packages).some(
            (pkg) => pkg.status === "downloading" || pkg.status === "installing"
        );
    },

    getDownloadingPackages: () => {
        const { packages } = get();
        return Object.values(packages).filter((pkg) => pkg.status === "downloading");
    },

    getInstallingPackages: () => {
        const { packages } = get();
        return Object.values(packages).filter((pkg) => pkg.status === "installing");
    },

    getInstalledPackages: () => {
        const { packages } = get();
        return Object.values(packages).filter((pkg) => pkg.status === "installed");
    },
});
