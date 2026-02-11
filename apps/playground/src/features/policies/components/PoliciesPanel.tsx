import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleEditorCard } from "@/shared/components/CollapsibleEditorCard";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useBantaiStore } from "@/shared/store/store";
import type { Policy } from "@/shared/types";
import { ListCollapse, ListTree, Plus, Save, Search, ShieldCheck, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface PolicyItemProps {
    policy: Policy;
    contextId: string;
    isExpanded: boolean;
    onToggle: () => void;
    updatePolicy: (contextId: string, policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (contextId: string, policyId: string) => void;
}

const PolicyItem: React.FC<PolicyItemProps> = ({
    policy,
    contextId,
    isExpanded,
    onToggle,
    updatePolicy,
    deletePolicy,
}) => {
    const hasErrors = policy.errors.length > 0;

    return (
        // <Card
        //     className={`group mb-3 rounded-none last:mb-0 py-0 s ${hasErrors ? "border-destructive/30" : policy.isDirty ? "border-primary/30" : ""}`}
        // >
        //     <Collapsible open={isExpanded} onOpenChange={onToggle}>
        //         <CollapsibleTrigger
        //             className={`w-full h-9 flex items-center justify-between px-3 cursor-pointer s ${hasErrors ? "bg-destructive/10" : policy.isDirty ? "bg-muted" : "bg-muted/50"} border-b`}
        //         >
        //             <div
        //                 className="flex items-center gap-2 flex-1 min-w-0"
        //                 onClick={(e) => e.stopPropagation()}
        //             >
        //                 <div
        //                     onClick={(e) => {
        //                         e.stopPropagation();
        //                         onToggle();
        //                     }}
        //                     className="text-muted-foreground hover:text-foreground s cursor-pointer p-0.5"
        //                 >
        //                     {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        //                 </div>
        //                 {hasErrors ? (
        //                     <AlertCircle
        //                         size={14}
        //                         className="text-destructive shrink-0 animate-pulse"
        //                     />
        //                 ) : (
        //                     <Lock
        //                         size={14}
        //                         className={`${policy.isDirty ? "text-primary" : "text-muted-foreground"} shrink-0`}
        //                     />
        //                 )}
        //                 <div className="flex items-center gap-2 flex-1 min-w-0">
        //                     <Input
        //                         className={`bg-transparent border-0 h-auto p-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 w-full truncate ${hasErrors ? "text-destructive" : policy.isDirty ? "text-foreground" : "text-muted-foreground"}`}
        //                         value={policy.name}
        //                         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        //                             updatePolicy(contextId, policy.id, { name: e.target.value })
        //                         }
        //                         onClick={(e: React.MouseEvent<HTMLInputElement>) =>
        //                             e.stopPropagation()
        //                         }
        //                     />
        //                     {policy.isDirty && (
        //                         <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        //                     )}
        //                 </div>
        //             </div>
        //             <div
        //                 className="flex items-center gap-1 ml-2 shrink-0"
        //                 onClick={(e) => e.stopPropagation()}
        //             >
        //                 <Button
        //                     variant="ghost"
        //                     size="icon"
        //                     className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        //                     onClick={() => deletePolicy(contextId, policy.id)}
        //                 >
        //                     <Trash2 size={14} />
        //                 </Button>
        //             </div>
        //         </CollapsibleTrigger>

        //         <CollapsibleContent>
        //             <div className="h-48 border-t border-border relative">
        //                 <Editor
        //                     value={policy.code}
        //                     onChange={(val) =>
        //                         updatePolicy(contextId, policy.id, { code: val || "" })
        //                     }
        //                     options={{
        //                         scrollbar: { vertical: "hidden", horizontal: "hidden" },
        //                         lineNumbers: "on",
        //                         folding: true,
        //                         lineDecorationsWidth: 0,
        //                         lineNumbersMinChars: 2,
        //                     }}
        //                 />
        //             </div>
        //         </CollapsibleContent>
        //     </Collapsible>
        // </Card>
        <CollapsibleEditorCard
            title={policy.name}
            icon={
                <ShieldCheck
                    size={14}
                    className={`${policy.isDirty ? "text-primary" : "text-muted-foreground"} shrink-0`}
                />
            }
            isExpanded={isExpanded}
            onToggle={onToggle}
            hasErrors={hasErrors}
            isDirty={policy.isDirty}
            onTitleChange={(name) => updatePolicy(contextId, policy.id, { name })}
            onDelete={() => deletePolicy(contextId, policy.id)}
            editorProps={{
                value: policy.code,
                onChange: (val) => updatePolicy(contextId, policy.id, { code: val || "" }),
            }}
        />
    );
};

export const PoliciesPanel: React.FC = () => {
    const { contexts, activeContextId, addPolicy, updatePolicy, deletePolicy, saveActiveContext } =
        useBantaiStore();
    const context = contexts.find((c) => c.id === activeContextId);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const prevPolicyCount = React.useRef(context?.policies.length || 0);
    useEffect(() => {
        if (context && context.policies.length > prevPolicyCount.current) {
            const latestPolicy = context.policies[0];
            setExpandedIds((prev) => new Set(prev).add(latestPolicy.id));
        }
        prevPolicyCount.current = context?.policies.length || 0;
    }, [context?.policies.length]);

    const filteredPolicies = useMemo(() => {
        if (!context) return [];
        return context.policies.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [context, searchQuery]);

    const anyDirty = useMemo(() => {
        return context?.policies.some((p) => p.isDirty);
    }, [context]);

    const aggregateErrors = useMemo(() => {
        if (!context) return [];
        return context.policies.flatMap((p) => p.errors.map((err) => ({ ...err, source: p.name })));
    }, [context]);

    const toggleAll = () => {
        if (!context) return;
        if (expandedIds.size > 0) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(context.policies.map((p) => p.id)));
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
        <div className="h-full flex flex-col bg-background border-border overflow-hidden s">
            <div className="h-10 flex items-center justify-between px-4 bg-muted/50 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Policies ({filteredPolicies.length})
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
                        onClick={() => addPolicy(context.id)}
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
                            placeholder="Search policies..."
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
                {filteredPolicies.map((policy) => (
                    <PolicyItem
                        key={policy.id}
                        policy={policy}
                        contextId={context.id}
                        isExpanded={expandedIds.has(policy.id)}
                        onToggle={() => toggleOne(policy.id)}
                        updatePolicy={updatePolicy}
                        deletePolicy={deletePolicy}
                    />
                ))}
                {filteredPolicies.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-xs italic text-center px-4">
                        {searchQuery
                            ? `No policies matching "${searchQuery}"`
                            : "No policies defined."}
                    </div>
                )}
            </div>

            <CompilationErrorPanel errors={aggregateErrors} title="Policy Problems" />
        </div>
    );
};
