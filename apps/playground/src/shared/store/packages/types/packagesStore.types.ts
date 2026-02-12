export type PackageStatus = "idle" | "downloading" | "installing" | "installed" | "error";

export interface PackageInfo {
    name: string;
    version: string;
    status: PackageStatus;
    error?: string;
}

export interface PackagesStore {
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
