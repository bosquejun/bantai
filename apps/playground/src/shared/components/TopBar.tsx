import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useBantaiStore } from "@/shared/store/store";
import { Check, Download, Loader2, Moon, Play, RotateCcw, Save, Sun } from "lucide-react";
import React, { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { ExportDialog } from "./ExportDialog";

export const TopBar: React.FC = () => {
    const {
        contexts,
        activeContextId,
        runSimulation,
        isSimulationRunning,
        saveAll,
        isAnyDirty,
        theme,
        toggleTheme,
        hasGlobalErrors,
        discardActiveChanges,
    } = useBantaiStore();

    const [isSaving, setIsSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

    const activeContext = contexts.find((c) => c.id === activeContextId);
    const dirty = isAnyDirty();
    const errorsExist = hasGlobalErrors();

    const handleSave = () => {
        if (errorsExist) return;
        setIsSaving(true);
        setTimeout(() => {
            saveAll();
            setIsSaving(false);
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
        }, 400);
    };

    return (
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background sticky top-0 z-50 s">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-lg shadow-lg text-primary-foreground">
                    B
                </div>
                <span className="font-semibold text-foreground tracking-tight">
                    Bantai <span className="text-muted-foreground font-normal">Playground</span>
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </Button>

                <Button
                    disabled
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExportDialogOpen(true)}
                >
                    <Download size={16} />
                    <span>Export</span>
                </Button>

                <Separator orientation="vertical" className="h-6 mx-2" />

                {dirty && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDiscardConfirmOpen(true)}
                        title="Discard all changes since last save"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <RotateCcw size={16} />
                        <span>Discard</span>
                    </Button>
                )}

                <Button
                    onClick={handleSave}
                    disabled={!dirty || isSaving || errorsExist}
                    variant="outline"
                    size="sm"
                    title={
                        errorsExist
                            ? "Cannot save: Fix compilation errors first"
                            : "Save all changes"
                    }
                    className={
                        showSaved ? "border-green-500/50 text-green-600 dark:text-green-400" : ""
                    }
                >
                    {isSaving ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : showSaved ? (
                        <Check size={16} />
                    ) : (
                        <Save size={16} />
                    )}
                    <span>{showSaved ? "Saved" : "Save"}</span>
                </Button>

                <Button
                    onClick={runSimulation}
                    disabled={isSimulationRunning}
                    size="sm"
                    className="font-bold"
                >
                    {isSimulationRunning ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Play size={16} fill="currentColor" />
                    )}
                    <span>Evaluate</span>
                </Button>
            </div>

            <ConfirmDialog
                isOpen={isDiscardConfirmOpen}
                onClose={() => setIsDiscardConfirmOpen(false)}
                onConfirm={discardActiveChanges}
                title="Discard Changes?"
                message="This will revert all rules, policies, and definitions in this context to the last saved state. This action cannot be undone."
                confirmText="Discard Changes"
                variant="danger"
            />

            <ExportDialog
                isOpen={isExportDialogOpen}
                onClose={() => setIsExportDialogOpen(false)}
                context={activeContext}
            />
        </div>
    );
};
