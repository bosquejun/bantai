import { Button } from "@/components/ui/button";
import { Editor } from "@/features/editor/components/Editor";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { transpileCode } from "@/lib/monaco";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useCurrentWorkspace } from "@/shared/store";
import type { Workspace } from "@/shared/store/workspace/types/workspaceStore.types";
import { defaultEditorOptions } from "@/shared/utils/editor-options";
import { useMonaco, type OnMount } from "@monaco-editor/react";
import { PanelLeftClose, PanelLeftOpen, RotateCcw, Save } from "lucide-react";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useRef } from "react";

interface ContextPanelProps {
    isCollapsed: boolean;
    onToggle: () => void;
    activeWorkspace: Workspace | undefined;
    activeWorkspaceId: string | null;
    activeErrors: boolean;
    onSave: () => void;
    onDiscardOpen: () => void;
    updateContext: (workspaceId: string, context: string) => void;
    width: string;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
    isCollapsed,
    onToggle,
    activeWorkspace,
    activeWorkspaceId,
    activeErrors,
    onSave,
    onDiscardOpen,
    updateContext,
    width,
}) => {
    const monaco = useMonaco();
    const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
    const workspace = useCurrentWorkspace();
    const fileModel = useRef<monaco.editor.ITextModel | null>(null);

    const handleTranspile = useCallback(
        // eslint-disable-next-line react-hooks/use-memo
        useDebounceCallback(async (code: string) => {
            if (!monaco || !editorRef.current) return;
            if (fileModel.current && code) {
                // 3. Wrap the user's input and update the background model
                const wrappedCode = `export const appContext = ${code};\nexport default appContext;`;
                fileModel.current.setValue(wrappedCode);

                const globalContextDts = `${workspace}/context-global.d.ts`;
                const declaration = `
    import { appContext as TContext } from "${workspace}/context";

    declare global {
        const appContext: typeof TContext;
    }
    export {};`;
                (monaco as any).languages.typescript.typescriptDefaults.addExtraLib(
                    declaration,
                    globalContextDts
                );
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            activeWorkspaceId && updateContext(activeWorkspaceId, code || "");

            const { errors, transpiledCodes } = await transpileCode(monaco, editorRef.current);

            if (errors.length && activeWorkspaceId && activeWorkspace) {
                // Update workspace with errors - errors are stored on workspace level
                // Note: This might need adjustment based on how errors are handled
                // For now, we'll update the workspace with the context that has errors
                updateContext(activeWorkspaceId, activeWorkspace.context);
            }

            console.log("Errors:", errors);
            console.log("Transpiled Codes:", transpiledCodes);
        }, 300),
        [monaco, editorRef, fileModel.current, activeWorkspaceId, updateContext]
    );

    const handleSave = useCallback(async () => {
        if (!monaco || !editorRef.current) return;
        const { errors } = await transpileCode(monaco, editorRef.current);
        if (errors.length && activeWorkspaceId && activeWorkspace) {
            // Errors are handled by linting in the store
            updateContext(activeWorkspaceId, activeWorkspace.context);
        } else {
            editorRef.current.focus();

            // Trigger the 'Format Document' action
            editorRef.current.trigger(
                "context-format-on-save",
                "editor.action.formatDocument",
                null
            );
            onSave();
        }
    }, [monaco, editorRef, activeWorkspaceId, activeWorkspace, updateContext, onSave]);

    const handleEditorDidMount: OnMount = (editor) => {
        // Save the editor instance to the ref
        editorRef.current = editor;

        if (monaco) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
        }
    };

    useEffect(() => {
        if (!monaco || !editorRef.current) return;
        const path = monaco?.Uri?.parse(`${workspace}/context.ts`);
        if (!monaco.editor.getModel(path)) {
            fileModel.current = monaco.editor.createModel(
                "", // Start empty
                "typescript",
                path
            );
        }

        handleTranspile(activeWorkspace?.context || "");
    }, [monaco, editorRef.current, activeWorkspace?.context, handleTranspile]);

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
                        {activeWorkspace?.isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                    </div>
                )}
                <div className="flex items-center gap-1">
                    {!isCollapsed && activeWorkspace?.isDirty && (
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
                                onClick={handleSave}
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
                        {activeWorkspace?.isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                    </span>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col min-h-0">
                        <Editor
                            value={activeWorkspace?.context || ""}
                            onChange={(value) => handleTranspile(value || "")}
                            options={defaultEditorOptions}
                            onMount={handleEditorDidMount}
                            path={`${workspace}/preview/context.ts`}
                        />
                    </div>
                    <CompilationErrorPanel
                        errors={activeWorkspace?.errors || []}
                        title="Context Problems"
                    />
                </>
            )}
        </div>
    );
};
