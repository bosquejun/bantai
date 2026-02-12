import type { Monaco } from "@monaco-editor/react";
import bantaiDevCore from "./internal-deps/bantai-dev-core";
import zod from "./internal-deps/zod";
import {
    resetMonacoDeclarationTypes,
    setMonacoDeclarationTypes,
    setMonacoGlobalDeclarationTypes,
} from "./monaco";
import { getVersionDtsContents } from "./versionMetadata";

type PackageRegistry = Record<`${PackageInfo["name"]}@${PackageInfo["version"]}`, unknown>;

const packageRegistry: PackageRegistry = {};

type PackageInfo = {
    name: string;
    version: string;
    pathSegment?: string;
    globalDeclaration?: string;
};

const defaultDeps: Record<PackageInfo["name"], PackageInfo> = {
    ...bantaiDevCore,
    ...zod,
};

export const getPackageData = (name: string, version: string) => {
    return packageRegistry[`${name}@${version}`];
};

interface PackageManagerActions {
    setPackageDownloading: (name: string, version: string) => void;
    setPackageInstalling: (name: string, version: string) => void;
    setPackageInstalled: (name: string, version: string) => void;
    setPackageError: (name: string, version: string, error: string) => void;
}

export const loadPlaygroundDeps = async ({
    monaco,
    deps = defaultDeps,
    packageManager,
}: {
    monaco: Monaco;
    deps?: Record<PackageInfo["name"], PackageInfo>;
    packageManager?: PackageManagerActions;
}) => {
    // Reset once so we can accumulate all packages' types (reset inside loop would leave only the last package)
    resetMonacoDeclarationTypes(monaco);

    for (const [packageName, packageInfo] of Object.entries(deps)) {
        try {
            // Mark package as downloading
            packageManager?.setPackageDownloading(packageName, packageInfo.version);

            const packageData = await loadPackageVersion({
                name: packageName,
                version: packageInfo.version,
                pathSegment: packageInfo.pathSegment || "",
            });

            packageRegistry[`${packageName}@${packageInfo.version}`] = packageData;

            // Download type definitions
            const dtsFiles = await getVersionDtsContents({
                packageName,
                version: packageInfo.version,
            });

            if (dtsFiles) {
                // Mark package as installing
                packageManager?.setPackageInstalling(packageName, packageInfo.version);

                // Install to Monaco (adds to existing extra libs; do not reset here)
                setMonacoDeclarationTypes({
                    monaco,
                    dtsFiles,
                    packageName,
                });
                setMonacoGlobalDeclarationTypes({
                    monaco,
                    packageName,
                    globalDeclaration: packageInfo.globalDeclaration || "",
                    path: "",
                });

                // Mark package as installed
                packageManager?.setPackageInstalled(packageName, packageInfo.version);
            } else {
                throw new Error("Failed to fetch type definitions");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Failed to load type definitions";
            console.error("Failed to load type definitions:", error);
            packageManager?.setPackageError(packageName, packageInfo.version, errorMessage);
        }
    }
};

export async function loadPackageVersion({ name, version, pathSegment }: PackageInfo) {
    return import(
        /* @vite-ignore */ `https://cdn.jsdelivr.net/npm/${name}@${version}${pathSegment}/+esm`
    );
}
