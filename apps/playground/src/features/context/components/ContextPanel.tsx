import { Button } from "@/components/ui/button";
import { Editor } from "@/features/editor/components/Editor";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { transpileCode } from "@/lib/monaco";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useCurrentWorkspace, useWorkspaceStore } from "@/shared/store";
import { lintCode } from "@/shared/store/utils/linting";
import type { Workspace } from "@/shared/store/workspace/types/workspaceStore.types";
import { defaultEditorOptions } from "@/shared/utils/editor-options";
import { useMonaco, type OnMount } from "@monaco-editor/react";
import { PanelLeftClose, PanelLeftOpen, Save } from "lucide-react";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { getCompleteContext } from "../codes/complete-context";
import { getGlobalContextDeclaration } from "../codes/global-declarations";

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
    updateContext,
    width,
}) => {
    const monaco = useMonaco();
    const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
    const workspacePath = useCurrentWorkspace();
    const fileModel = useRef<monaco.editor.ITextModel | null>(null);
    const setWorkspaceErrors = useWorkspaceStore((state) => state.setWorkspaceErrors);
    const snapshots = useWorkspaceStore((state) => state.snapshots);
    const isUserTypingRef = useRef(false);

    // Check if context specifically is dirty (not just workspace)
    const isContextDirty = useMemo(() => {
        if (!activeWorkspace || !activeWorkspaceId) return false;
        const snapshot = snapshots[activeWorkspaceId];
        if (!snapshot) return false;
        return activeWorkspace.context !== snapshot.context;
    }, [activeWorkspace, activeWorkspaceId, snapshots]);

    // Shared helper: Update file model and add type declarations
    const updateFileModelAndTypes = useCallback(
        (code: string) => {
            if (!monaco || !fileModel.current || !code) return;

            const wrappedCode = getCompleteContext(code);
            fileModel.current.setValue(wrappedCode);

            const globalContextDts = `${workspacePath}/context-global.d.ts`;
            const declaration = getGlobalContextDeclaration(workspacePath);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (monaco as any).languages.typescript.typescriptDefaults.addExtraLib(
                declaration,
                globalContextDts
            );
        },
        [monaco, workspacePath]
    );

    // Shared helper: Collect and set errors (static lint + TypeScript)
    const collectAndSetErrors = useCallback(
        async (code: string, tsErrors: Array<{ line: number; message: string }>) => {
            if (!activeWorkspaceId) return;

            const staticErrors = lintCode(code || "");
            const mappedTsErrors = tsErrors.map((err) => ({
                line: err.line,
                message: err.message,
                source: "Context (TypeScript)",
            }));

            setWorkspaceErrors(activeWorkspaceId, [...staticErrors, ...mappedTsErrors]);
        },
        [activeWorkspaceId, setWorkspaceErrors]
    );

    const handleTranspile = useCallback(
        // eslint-disable-next-line react-hooks/use-memo
        useDebounceCallback(async (code: string) => {
            if (!monaco || !editorRef.current) return;

            const codeValue = code || "";

            // Update context in store
            if (activeWorkspaceId) {
                updateContext(activeWorkspaceId, codeValue);
            }

            // Transpile and collect errors
            const { errors } = await transpileCode(monaco, editorRef.current);

            // Update errors
            await collectAndSetErrors(codeValue, errors);

            // Update file model and type declarations
            updateFileModelAndTypes(codeValue);
        }, 750),
        [
            monaco,
            editorRef,
            activeWorkspaceId,
            updateContext,
            collectAndSetErrors,
            updateFileModelAndTypes,
        ]
    );

    // Ensure the background file model exists for the context so that
    // transpile + type declarations have a concrete model to work with.
    const ensureFileModel = useCallback(() => {
        if (!monaco) return false;

        if (!fileModel.current) {
            const path = monaco.Uri.parse(`${workspacePath}/context.ts`);
            const existingModel = monaco.editor.getModel(path);

            if (existingModel) {
                fileModel.current = existingModel;
            } else {
                fileModel.current = monaco.editor.createModel("", "typescript", path);
            }
        }

        return fileModel.current !== null;
    }, [monaco, workspacePath]);

    // Update editor value when workspace context changes programmatically (e.g., after discard)
    useEffect(() => {
        if (!editorRef.current || !activeWorkspace) return;

        // Skip if user is currently typing to avoid conflicts
        if (isUserTypingRef.current) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        const currentValue = model.getValue();
        const workspaceValue = activeWorkspace.context || "";

        // Only update if the values differ to avoid unnecessary updates
        if (currentValue !== workspaceValue) {
            // Use requestAnimationFrame to ensure React has updated the workspace state
            requestAnimationFrame(() => {
                if (!editorRef.current) return;

                const modelAfterUpdate = editorRef.current.getModel();
                if (!modelAfterUpdate) return;

                // Set the value and move cursor to end
                modelAfterUpdate.setValue(workspaceValue);
                const lineCount = modelAfterUpdate.getLineCount();
                editorRef.current.setPosition({
                    lineNumber: lineCount,
                    column: modelAfterUpdate.getLineMaxColumn(lineCount),
                });

                // Trigger transpile to update errors (debounced, so safe to call)
                handleTranspile(workspaceValue);
            });
        }
    }, [activeWorkspace, handleTranspile]);

    const handleSave = useCallback(async () => {
        if (!monaco || !editorRef.current || !activeWorkspaceId) return;

        const model = editorRef.current.getModel();
        const currentCode = model?.getValue() ?? "";

        // Transpile and collect errors
        const { errors } = await transpileCode(monaco, editorRef.current);

        // Check for errors before updating (to avoid unnecessary state updates)
        const staticErrors = lintCode(currentCode);
        const hasErrors = staticErrors.length > 0 || errors.length > 0;

        // Update errors using shared helper (always update to show current state)
        await collectAndSetErrors(currentCode, errors);

        if (hasErrors) {
            // Don't revert the user's code – just prevent saving when there are errors
            return;
        }

        // Update file model and types before formatting
        updateFileModelAndTypes(currentCode);

        editorRef.current.focus();

        // Trigger the 'Format Document' action
        editorRef.current.trigger("context-format-on-save", "editor.action.formatDocument", null);

        // Wait for formatting edits to be applied, then update context with formatted value
        // Format edits are applied synchronously, but we use requestAnimationFrame
        // to ensure the model has been fully updated before reading the value
        requestAnimationFrame(() => {
            const modelAfterFormat = editorRef.current?.getModel();
            if (modelAfterFormat && activeWorkspaceId) {
                const formattedValue = modelAfterFormat.getValue();
                // Update the context with the formatted code/definition
                updateContext(activeWorkspaceId, formattedValue);
                // Then save the snapshot
                onSave();
            }
        });
    }, [
        monaco,
        editorRef,
        activeWorkspaceId,
        updateContext,
        onSave,
        collectAndSetErrors,
        updateFileModelAndTypes,
    ]);

    // Store the latest handleSave callback in a ref so the command always calls the current version
    const handleSaveRef = useRef(handleSave);

    // Update the ref whenever handleSave changes
    useEffect(() => {
        if (handleSaveRef.current !== null) return;
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    // Initialize file model (no transpile here)
    useEffect(() => {
        if (!monaco) return;
        ensureFileModel();
        // We intentionally do NOT trigger transpile here because the editor
        // instance may not yet have the correct model/value wiring when this
        // effect first runs. Instead, we trigger the initial transpile from
        // the editor's onMount handler once the editor is fully ready.
    }, [monaco, ensureFileModel]);

    const handleEditorDidMount: OnMount = (editor) => {
        if (!monaco) return;
        editorRef.current = editor;

        // Use a STATIC string name.
        // This looks counter-intuitive, but Monaco scoped-evaluates this
        // against the instance that currently has keyboard focus.
        const focusKey = editor.createContextKey<boolean>("isThisSpecificEditorFocused", false);

        editor.onDidFocusEditorWidget(() => focusKey.set(true));
        editor.onDidBlurEditorWidget(() => focusKey.set(false));

        editor.addAction({
            // Use a static ID so they share the same "command" logic
            // but scoped to the focused instance
            id: "save-document-action",
            label: "Save",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],

            // When you press Cmd+S, Monaco checks the focused editor's
            // context for 'isThisSpecificEditorFocused'
            precondition: "isThisSpecificEditorFocused",

            run: () => {
                handleSaveRef.current();
            },
        });

        // Once the editor is fully mounted, if there is existing context content
        // for the active workspace, trigger an initial transpile so that
        // CompilationErrorPanel reflects any pre-existing issues on load.
        // We also ensure the background file model exists before transpiling.
        const initialContext = activeWorkspace?.context || "";
        if (initialContext && ensureFileModel()) {
            handleTranspile(initialContext);
        }
    };

    // useEffect(() => {
    //     if (!monaco || !editorRef.current) return;
    //     const listener = (editorRef.current as any).addAction({
    //         id: `save-context-${activeWorkspaceId}`,
    //         label: "Save",
    //         keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    //         run: () => {
    //             handleSave();
    //             // Monaco's addAction automatically calls preventDefault()
    //             // to stop the browser's save dialog.
    //         },
    //     });

    //     return () => {
    //         if (listener) {
    //             listener.dispose();
    //         }
    //     };
    // }, [editorRef.current, workspacePath]);

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
                        {isContextDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                    </div>
                )}
                <div className="flex items-center gap-1">
                    {!isCollapsed && isContextDirty && (
                        <>
                            {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDiscardOpen}
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Discard local changes"
                            >
                                <RotateCcw size={14} />
                            </Button> */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    handleSaveRef.current();
                                }}
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
                        {isContextDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                    </span>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col min-h-0">
                        <Editor
                            value={activeWorkspace?.context || ""}
                            onChange={(value) => {
                                isUserTypingRef.current = true;
                                handleTranspile(value || "");
                                // Reset flag after a short delay
                                setTimeout(() => {
                                    isUserTypingRef.current = false;
                                }, 50);
                            }}
                            options={defaultEditorOptions}
                            onMount={handleEditorDidMount}
                            path={`${workspacePath}/preview/context.ts`}
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
