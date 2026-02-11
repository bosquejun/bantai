import { Button } from "@/components/ui/button";
import { Editor } from "@/features/editor/components/Editor";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import type { Context } from "@/shared/types";
import { PanelLeftClose, PanelLeftOpen, RotateCcw, Save } from "lucide-react";
import React from "react";

interface ContextPanelProps {
    isCollapsed: boolean;
    onToggle: () => void;
    activeContext: Context | undefined;
    activeContextId: string | null;
    activeErrors: boolean;
    onSave: () => void;
    onDiscardOpen: () => void;
    updateContext: (contextId: string, updates: Partial<Context>) => void;
    width: string;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
    isCollapsed,
    onToggle,
    activeContext,
    activeContextId,
    activeErrors,
    onSave,
    onDiscardOpen,
    updateContext,
    width,
}) => {
    return (
        <div
            style={{ width }}
            className={`h-full flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out bg-background border-r border-border ${isCollapsed ? "shrink-0" : ""}`}
        >
            <div
                className={`h-10 flex items-center justify-between px-4 bg-muted/50 border-b border-border shrink-0 ${isCollapsed ? "justify-center px-0" : "justify-between px-4"}`}
            >
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
                            Context Definition
                        </span>
                        {activeContext?.isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                    </div>
                )}
                <div className="flex items-center gap-1">
                    {!isCollapsed && activeContext?.isDirty && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDiscardOpen}
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Discard local changes"
                            >
                                <RotateCcw size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onSave}
                                disabled={activeErrors}
                                className="h-7 w-7"
                                title={activeErrors ? "Fix errors to save" : "Save context"}
                            >
                                <Save size={14} />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="h-7 w-7"
                        title={isCollapsed ? "Expand Context" : "Collapse Context"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={16} />}
                    </Button>
                </div>
            </div>

            {isCollapsed ? (
                <div className="flex-1 flex items-center justify-center relative">
                    <span className="rotate-90 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap flex items-center gap-2">
                        Context
                        {activeContext?.isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                    </span>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col min-h-0">
                        <Editor
                            value={activeContext?.definition || ""}
                            onChange={(val) =>
                                activeContextId &&
                                updateContext(activeContextId, {
                                    definition: val || "",
                                })
                            }
                        />
                    </div>
                    <CompilationErrorPanel
                        errors={activeContext?.errors || []}
                        title="Context Problems"
                    />
                </>
            )}
        </div>
    );
};
