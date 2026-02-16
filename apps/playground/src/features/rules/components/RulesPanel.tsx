import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { transpileCode } from "@/lib/monaco";
import { CollapsibleEditorCard } from "@/shared/components/CollapsibleEditorCard";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import {
    useActiveRules,
    useCurrentWorkspace,
    useRulesStore,
    useWorkspaceStore,
} from "@/shared/store";
import type { Rule } from "@/shared/types";
import { useMonaco, type OnMount } from "@monaco-editor/react";
import { FileCode, ListCollapse, ListTree, Plus, Save, Search, X } from "lucide-react";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCompleteRule } from "../codes/complete-rule";

interface RuleItemProps {
    rule: Rule;
    isExpanded: boolean;
    onToggle: () => void;
    updateRule: (ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (ruleId: string) => void;
    /**
     * The context content hash when it was last successfully compiled (no errors).
     * Used to trigger a re-transpile of this rule when context content changes.
     */
    contextContentHash: string | null;
}

const RuleItem: React.FC<RuleItemProps> = ({
    rule,
    isExpanded,
    onToggle,
    updateRule,
    deleteRule,
    contextContentHash,
}) => {
    const hasErrors = rule.errors.length > 0;
    const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
    const previewWorkspace = useCurrentWorkspace("/preview/rules");
    const rulesWorkspace = useCurrentWorkspace("/rules");
    const fileModel = useRef<monaco.editor.ITextModel | null>(null);
    const saveActiveWorkspace = useWorkspaceStore((state) => state.saveActiveWorkspace);
    const monaco = useMonaco();

    // Helper to ensure fileModel exists before transpiling
    const ensureFileModel = useCallback(() => {
        if (!monaco) return false;

        if (!fileModel.current) {
            const path = monaco.Uri.parse(`${rulesWorkspace}/${rule.id}.ts`);
            // Check if model already exists in Monaco's registry
            const existingModel = monaco.editor.getModel(path);
            if (existingModel) {
                fileModel.current = existingModel;
            } else {
                // Create new model if it doesn't exist
                fileModel.current = monaco.editor.createModel("", "typescript", path);
            }
        }

        return fileModel.current !== null;
    }, [monaco, rulesWorkspace, rule.id]);

    const handleTranspile = useCallback(
        useDebounceCallback(async (code: string) => {
            if (!monaco || !editorRef.current) return;

            const safeCode = code || "";

            // Always keep the latest code in the rule state so the store and editor stay in sync
            updateRule(rule.id, {
                code: safeCode,
            });

            // Ensure fileModel exists before proceeding
            if (!ensureFileModel()) {
                // If we can't create the model, clear errors and return
                updateRule(rule.id, {
                    errors: [],
                });
                return;
            }

            if (!safeCode) {
                // If code is empty, clear errors
                updateRule(rule.id, {
                    errors: [],
                });
                return;
            }

            // Wrap the user's input and update the background model so it can be type-checked
            // This model imports appContext and wraps the rule code for proper type checking
            const wrappedCode = getCompleteRule(code);

            if (fileModel?.current) {
                fileModel?.current?.setValue(wrappedCode);

                // await handleExecute(wrappedCode);

                // Transpile the wrapped model (not the editor model) to get errors
                // The wrapped model has the import statement and proper structure for type checking
                const { errors, transpiledCodes } = await transpileCode(monaco, editorRef.current);

                // Map errors back to the original code lines (accounting for the wrapper)
                // The wrapped code adds 2 lines at the start (import + empty line), so we adjust line numbers
                const mappedErrors = errors.map((err) => {
                    // Adjust line number: wrapped code has 2 header lines, so subtract 2
                    // But keep line 1 errors as line 1 (they might be import errors)
                    const adjustedLine = err.line > 2 ? err.line - 2 : err.line;

                    return {
                        message: err.message,
                        line: adjustedLine,
                        source: "Rule",
                    };
                });

                updateRule(rule.id, {
                    errors: mappedErrors,
                });

                console.log("Errors:", errors);
                console.log("Mapped Errors:", mappedErrors);
                console.log("Transpiled Codes:", transpiledCodes);
            }
        }, 750),
        [monaco, editorRef, ensureFileModel, updateRule, rule.id]
    );

    const handleSave = useCallback(async () => {
        if (!monaco || !editorRef.current) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        // Transpile and collect errors
        const { errors } = await transpileCode(monaco, editorRef.current);

        // Update errors
        updateRule(rule.id, {
            errors: errors.map((err) => ({
                message: err.message,
                line: err.line,
                source: "Rule",
            })),
        });

        // Check if there are any errors - if so, prevent save
        if (errors.length > 0) {
            // Don't revert the user's code – just prevent saving when there are errors
            return;
        }

        editorRef.current.focus();

        // Trigger the 'Format Document' action
        editorRef.current.trigger("context-format-on-save", "editor.action.formatDocument", null);

        // Wait for formatting edits to be applied, then update rule with formatted value
        // Format edits are applied synchronously, but we use requestAnimationFrame
        // to ensure the model has been fully updated before reading the value
        requestAnimationFrame(() => {
            const modelAfterFormat = editorRef.current?.getModel();
            if (modelAfterFormat) {
                const formattedValue = modelAfterFormat.getValue();
                // Update the rule with the formatted code/definition
                updateRule(rule.id, {
                    code: formattedValue,
                    errors: [],
                });
                // Then save the workspace snapshot
                saveActiveWorkspace();
            }
        });
    }, [monaco, editorRef, updateRule, rule.id, saveActiveWorkspace]);

    // Store the latest handleSave callback in a ref so the command always calls the current version
    const handleSaveRef = useRef(handleSave);

    // Update the ref whenever handleSave changes
    useEffect(() => {
        handleSaveRef.current = handleSave;
    }, [handleSave]);

    const handleEditorDidMount: OnMount = (editor) => {
        if (!monaco) return;
        // Save the editor instance to the ref
        editorRef.current = editor;

        // Create a unique context key for THIS editor instance to track focus
        const isThisEditorFocused = editor.createContextKey<boolean>(
            `isRuleEditorFocused-${rule.id}`,
            false
        );

        // Update the context key based on focus state
        editor.onDidFocusEditorWidget(() => {
            isThisEditorFocused.set(true);
        });
        editor.onDidBlurEditorWidget(() => {
            isThisEditorFocused.set(false);
        });

        // Register save action with precondition - only triggers when THIS editor is focused
        editor.addAction({
            id: `save-rule-${rule.id}`,
            label: "Save Rule",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            precondition: `isRuleEditorFocused-${rule.id}`,
            run: () => {
                handleSaveRef.current();
            },
        });
    };

    // Initialize background model and perform first transpile for this rule
    useEffect(() => {
        if (!monaco || !editorRef.current) return;
        const path = monaco.Uri.parse(`${rulesWorkspace}/${rule.id}.ts`);
        if (!monaco.editor.getModel(path)) {
            fileModel.current = monaco.editor.createModel("", "typescript", path);
        }

        // Only transpile if we have rule content (avoid unnecessary initial transpile)
        const initialCode = rule.code || "";
        if (initialCode) {
            handleTranspile(initialCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monaco, rulesWorkspace, rule.id]);

    // Track the last context hash we compiled against to avoid unnecessary recompiles
    const lastContextHashRef = useRef<string | null>(null);

    // Helper to force Monaco editor to refresh/re-validate diagnostics
    const refreshEditorDiagnostics = useCallback(() => {
        if (!monaco || !editorRef.current) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        // Force Monaco to re-validate by triggering a model change event
        // We do this by temporarily modifying and restoring the model value
        // This causes Monaco to re-run diagnostics against the updated type declarations
        const currentValue = model.getValue();

        // If model is empty, nothing to refresh
        if (!currentValue.trim()) return;

        // Trigger a change event by applying a no-op edit at the end
        // This forces Monaco to re-validate the model with updated type declarations
        const lineCount = model.getLineCount();
        const lastLineLength = model.getLineLength(lineCount);

        // Apply a no-op edit (add and immediately remove a space) to trigger validation
        model.pushEditOperations(
            [],
            [
                {
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1,
                    },
                    text: " ",
                },
            ],
            () => null
        );

        // Immediately remove the space to restore original content
        requestAnimationFrame(() => {
            if (!editorRef.current) return;
            const currentModel = editorRef.current.getModel();
            if (!currentModel) return;

            const newValue = currentModel.getValue();
            if (newValue.endsWith(" ")) {
                currentModel.pushEditOperations(
                    [],
                    [
                        {
                            range: {
                                startLineNumber: lineCount,
                                startColumn: lastLineLength + 1,
                                endLineNumber: lineCount,
                                endColumn: lastLineLength + 2,
                            },
                            text: "",
                        },
                    ],
                    () => null
                );
            }
        });
    }, [monaco, editorRef]);

    // When context (appContext) successfully recompiles with new content, re-transpile this rule
    // so it can pick up new types / compatibility issues.
    useEffect(() => {
        if (!monaco || !editorRef.current) return;
        if (!contextContentHash) return;

        // Skip if we've already compiled against this context version
        if (lastContextHashRef.current === contextContentHash) return;

        const code = rule.code || "";
        if (!code) return;

        // Mark that we've compiled against this context version
        lastContextHashRef.current = contextContentHash;

        // Force editor to refresh diagnostics first (so it picks up new type declarations)
        refreshEditorDiagnostics();

        // Then re-transpile this rule against the new context
        handleTranspile(code);
        // We intentionally do NOT include handleTranspile in deps to avoid
        // resetting the debounced callback; contextContentHash is the trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monaco, contextContentHash, refreshEditorDiagnostics]);

    return (
        <CollapsibleEditorCard
            title={rule.name}
            icon={
                <FileCode
                    size={14}
                    className={`${rule.isDirty ? "text-primary" : "text-muted-foreground"} shrink-0`}
                />
            }
            isExpanded={isExpanded}
            onToggle={onToggle}
            hasErrors={hasErrors}
            isDirty={rule.isDirty}
            onTitleChange={(name) => updateRule(rule.id, { name })}
            onDelete={() => deleteRule(rule.id)}
            editorProps={{
                value: rule.code,
                // On user edits, debounce-transpile the rule so CompilationErrorPanel
                // always reflects the current validity of the code.
                onChange: (val) => handleTranspile(val || ""),
                path: `${previewWorkspace}/${rule.id}.ts`,
                onMount: handleEditorDidMount,
            }}
            onSave={() => handleSaveRef.current()}
        />
    );
};

export const RulesPanel: React.FC = () => {
    const rules = useActiveRules();
    const { addRule, updateRule, deleteRule } = useRulesStore();
    const saveActiveWorkspace = useWorkspaceStore((state) => state.saveActiveWorkspace);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const activeWorkspace = useMemo(
        () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
        [workspaces, activeWorkspaceId]
    );

    // Pull out the specific fields we care about so memoization
    // still works even if the workspace object is mutated in place.
    const activeContext = activeWorkspace?.context ?? "";
    const activeContextErrors = activeWorkspace?.errors ?? [];

    // Generate a content hash for the context when it's successfully compiled (no errors).
    // This is used to trigger re-transpile of rules only when context content actually changes.
    // We use a simple hash function for performance - RuleItem components track their own last compiled hash.
    const contextContentHash = useMemo(() => {
        // Only recompile rules if context exists and has no errors
        if (!activeContext) return null;
        if (activeContextErrors.length > 0) return null;

        // Simple fast hash: length + first 100 chars + last 100 chars.
        // This is sufficient to detect content changes while avoiding
        // passing the full context string down to every rule.
        const len = activeContext.length;
        const start = activeContext.slice(0, 100);
        const end = len > 200 ? activeContext.slice(-100) : "";
        return `${len}-${start}-${end}`;
    }, [activeContext, activeContextErrors.length]);

    const prevRuleCount = React.useRef(rules.length || 0);
    useEffect(() => {
        if (rules.length > prevRuleCount.current) {
            const latestRule = rules[0];
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => {
                setExpandedIds((prev) => new Set(prev).add(latestRule.id));
            }, 0);
        }
        prevRuleCount.current = rules.length || 0;
    }, [rules]);

    const filteredRules = useMemo(() => {
        return rules.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [rules, searchQuery]);

    const anyDirty = useMemo(() => {
        return rules.some((r) => r.isDirty);
    }, [rules]);

    const aggregateErrors = useMemo(() => {
        return rules.flatMap((r) => r.errors.map((err) => ({ ...err, source: r.name })));
    }, [rules]);

    const toggleAll = () => {
        if (expandedIds.size > 0) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(rules.map((r) => r.id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const toggleSearch = () => {
        setIsSearchVisible(!isSearchVisible);
        if (isSearchVisible) setSearchQuery("");
    };

    return (
        <div className="h-full flex flex-col bg-background border-x border-border overflow-hidden s">
            <div className="h-10 flex items-center justify-between px-4 bg-muted/50 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Rules ({filteredRules.length})
                    </span>
                    {anyDirty && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    {anyDirty && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveActiveWorkspace}
                            title="Save changes in this workspace"
                            className="h-7 w-7"
                        >
                            <Save size={14} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSearch}
                        title="Toggle Search"
                        className={`h-7 w-7 ${isSearchVisible ? "bg-accent" : ""}`}
                    >
                        <Search size={15} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleAll}
                        title={expandedIds.size > 0 ? "Collapse All" : "Expand All"}
                        className="h-7 w-7"
                    >
                        {expandedIds.size > 0 ? <ListCollapse size={15} /> : <ListTree size={15} />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addRule()}
                        className="h-7 w-7"
                    >
                        <Plus size={16} />
                    </Button>
                </div>
            </div>

            {isSearchVisible && (
                <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                    <div className="relative group">
                        <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            autoFocus
                            type="text"
                            placeholder="Search rules..."
                            className="pl-8 pr-8 h-8 text-[11px]"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setSearchQuery(e.target.value)
                            }
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => setSearchQuery("")}
                            >
                                <X size={12} />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {filteredRules.map((rule) => (
                    <RuleItem
                        key={rule.id}
                        rule={rule}
                        isExpanded={expandedIds.has(rule.id)}
                        onToggle={() => toggleOne(rule.id)}
                        updateRule={updateRule}
                        deleteRule={deleteRule}
                        contextContentHash={contextContentHash}
                    />
                ))}
                {filteredRules.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-xs italic text-center px-4">
                        {searchQuery ? `No rules matching "${searchQuery}"` : "No rules defined."}
                    </div>
                )}
            </div>

            <CompilationErrorPanel errors={aggregateErrors} title="Rule Problems" />
        </div>
    );
};
