import { create } from "zustand";
import type { PackageInfo, PackagesStore } from "../types/packagesStore.types";

export const usePackagesStore = create<PackagesStore>()((set, get) => ({
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
}));
