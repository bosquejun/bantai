import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { transpileCode } from "@/lib/monaco";
import { CollapsibleEditorCard } from "@/shared/components/CollapsibleEditorCard";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useBantaiStore, useCurrentWorkspace } from "@/shared/store/store";
import type { Rule } from "@/shared/types";
import type { OnMount } from "@monaco-editor/react";
import { FileCode, ListCollapse, ListTree, Plus, Save, Search, X } from "lucide-react";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface RuleItemProps {
    rule: Rule;
    contextId: string;
    isExpanded: boolean;
    onToggle: () => void;
    updateRule: (contextId: string, ruleId: string, updates: Partial<Rule>) => void;
    deleteRule: (contextId: string, ruleId: string) => void;
}

const RuleItem: React.FC<RuleItemProps> = ({
    rule,
    contextId,
    isExpanded,
    onToggle,
    updateRule,
    deleteRule,
}) => {
    const hasErrors = rule.errors.length > 0;
    const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
    const previewWorkspace = useCurrentWorkspace("/preview/rules");
    const rulesWorkspace = useCurrentWorkspace("/rules");
    const fileModel = useRef<monaco.editor.ITextModel | null>(null);

    const handleTranspile = useCallback(
        // eslint-disable-next-line react-hooks/use-memo
        useDebounceCallback(async (code: string) => {
            if (!monaco || !editorRef.current) return;
            if (fileModel.current && code) {
                // 3. Wrap the user's input and update the background model
                const wrappedCode = `import appContext from '../context';
                const rule = ${code}

                export default rule;
                `;
                fileModel.current.setValue(wrappedCode);
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            contextId &&
                updateRule(contextId, rule.id, {
                    code: code || "",
                });

            const { errors, transpiledCodes } = await transpileCode(monaco, editorRef.current);

            if (errors.length && contextId) {
                updateRule(contextId, rule.id, {
                    errors: errors.map((err) => ({
                        message: err.message,
                        line: err.line,
                        source: "Rule",
                    })),
                });
            }

            console.log("Errors:", errors);
            console.log("Transpiled Codes:", transpiledCodes);
        }, 300),
        [monaco, editorRef, fileModel.current]
    );

    const handleSave = useCallback(async () => {
        if (!monaco || !editorRef.current) return;
        const { errors } = await transpileCode(monaco, editorRef.current);
        if (errors.length && contextId) {
            updateRule(contextId, rule.id, {
                errors: errors.map((err) => ({
                    message: err.message,
                    line: err.line,
                    source: "Rule",
                })),
            });
        } else {
            editorRef.current.focus();

            // Trigger the 'Format Document' action
            editorRef.current.trigger(
                "context-format-on-save",
                "editor.action.formatDocument",
                null
            );
        }
    }, [monaco, editorRef, contextId, updateRule, onToggle]);

    const handleEditorDidMount: OnMount = (editor) => {
        // Save the editor instance to the ref
        editorRef.current = editor;

        if (monaco) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
        }
    };

    useEffect(() => {
        if (!monaco || !editorRef.current) return;
        const path = monaco?.Uri?.parse(`${rulesWorkspace}/${rule.id}.ts`);
        console.log({ path, preview: `${previewWorkspace}/${rule.id}.ts` });
        if (!monaco.editor.getModel(path)) {
            fileModel.current = monaco.editor.createModel(
                "", // Start empty
                "typescript",
                path
            );
        }

        handleTranspile(rule.code || "");
    }, [monaco, editorRef.current, fileModel.current]);

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
            onTitleChange={(name) => updateRule(contextId, rule.id, { name })}
            onDelete={() => deleteRule(contextId, rule.id)}
            editorProps={{
                value: rule.code,
                onChange: (val) => updateRule(contextId, rule.id, { code: val || "" }),
                path: `${previewWorkspace}/${rule.id}.ts`,
                onMount: handleEditorDidMount,
            }}
        />
    );
};

export const RulesPanel: React.FC = () => {
    const { contexts, activeContextId, addRule, updateRule, deleteRule, saveActiveContext } =
        useBantaiStore();
    const context = contexts.find((c) => c.id === activeContextId);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const prevRuleCount = React.useRef(context?.rules.length || 0);
    useEffect(() => {
        if (context && context.rules.length > prevRuleCount.current) {
            const latestRule = context.rules[0];
            setExpandedIds((prev) => new Set(prev).add(latestRule.id));
        }
        prevRuleCount.current = context?.rules.length || 0;
    }, [context?.rules.length]);

    const filteredRules = useMemo(() => {
        if (!context) return [];
        return context.rules.filter((r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [context, searchQuery]);

    const anyDirty = useMemo(() => {
        return context?.rules.some((r) => r.isDirty);
    }, [context]);

    const aggregateErrors = useMemo(() => {
        if (!context) return [];
        return context.rules.flatMap((r) => r.errors.map((err) => ({ ...err, source: r.name })));
    }, [context]);

    const toggleAll = () => {
        if (!context) return;
        if (expandedIds.size > 0) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(context.rules.map((r) => r.id)));
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

    if (!context) return null;

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
                            onClick={saveActiveContext}
                            title="Save changes in this context"
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
                        onClick={() => addRule(context.id)}
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
                        contextId={context.id}
                        isExpanded={expandedIds.has(rule.id)}
                        onToggle={() => toggleOne(rule.id)}
                        updateRule={updateRule}
                        deleteRule={deleteRule}
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
