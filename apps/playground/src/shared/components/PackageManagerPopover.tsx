import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { usePackagesStore } from "@/shared/store";
import { CheckCircle2, Download, Loader2, Package, XCircle } from "lucide-react";
import React from "react";

export const PackageManagerPopover: React.FC = () => {
    const packages = usePackagesStore((state) => state.packages);
    const hasActivePackages = usePackagesStore((state) => state.hasActivePackages);
    const getDownloadingPackages = usePackagesStore((state) => state.getDownloadingPackages);
    const getInstallingPackages = usePackagesStore((state) => state.getInstallingPackages);
    const getInstalledPackages = usePackagesStore((state) => state.getInstalledPackages);

    const downloading = getDownloadingPackages();
    const installing = getInstallingPackages();
    const installed = getInstalledPackages();
    const hasActive = hasActivePackages();
    const totalPackages = Object.keys(packages).length;

    if (totalPackages === 0 && !hasActive) {
        return null;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" className="relative">
                    {hasActive ? (
                        <>
                            <span className="text-[10px]">
                                {downloading.length > 0
                                    ? `Downloading ${downloading.length}...`
                                    : installing.length > 0
                                      ? `Installing ${installing.length}...`
                                      : "Installing packages.."}
                            </span>
                            <Spinner className="size-3 ml-1" />
                        </>
                    ) : (
                        <>
                            <Package className="size-3 mr-1" />
                            <span className="text-[10px]">
                                {installed.length} package{installed.length !== 1 ? "s" : ""}
                            </span>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Package className="size-4 text-muted-foreground" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider">
                            Package Manager
                        </h3>
                    </div>

                    {downloading.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                Downloading
                            </div>
                            {downloading.map((pkg) => (
                                <div
                                    key={pkg.name}
                                    className="flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Download className="size-3 text-blue-500 shrink-0" />
                                        <span className="truncate font-medium">{pkg.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Loader2 className="size-3 animate-spin text-blue-500" />
                                        <span className="text-[10px] text-muted-foreground">
                                            {pkg.version}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {installing.length > 0 && (
                        <div className="space-y-2">
                            {downloading.length > 0 && (
                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Installing
                                </div>
                            )}
                            {installing.map((pkg) => (
                                <div
                                    key={pkg.name}
                                    className="flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Loader2 className="size-3 animate-spin text-amber-500 shrink-0" />
                                        <span className="truncate font-medium">{pkg.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">
                                            {pkg.version}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {installed.length > 0 && (
                        <div className="space-y-2">
                            {(downloading.length > 0 || installing.length > 0) && (
                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-2 border-t border-border">
                                    Installed
                                </div>
                            )}
                            {installed.map((pkg) => (
                                <div
                                    key={pkg.name}
                                    className="flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                                        <span className="truncate font-medium">{pkg.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">
                                            {pkg.version}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {Object.values(packages).some((pkg) => pkg.status === "error") && (
                        <div className="space-y-2 pt-2 border-t border-border">
                            <div className="text-[10px] font-medium text-destructive uppercase tracking-wider">
                                Errors
                            </div>
                            {Object.values(packages)
                                .filter((pkg) => pkg.status === "error")
                                .map((pkg) => (
                                    <div
                                        key={pkg.name}
                                        className="flex items-start gap-2 text-xs"
                                    >
                                        <XCircle className="size-3 text-destructive shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium">{pkg.name}</div>
                                            {pkg.error && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                    {pkg.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
