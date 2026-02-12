import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleEditorCard } from "@/shared/components/CollapsibleEditorCard";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useCurrentWorkspace, useActivePolicies, usePoliciesStore, useWorkspaceStore } from "@/shared/store";
import type { Policy } from "@/shared/types";
import { ListCollapse, ListTree, Plus, Save, Search, ShieldCheck, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface PolicyItemProps {
    policy: Policy;
    isExpanded: boolean;
    onToggle: () => void;
    updatePolicy: (policyId: string, updates: Partial<Policy>) => void;
    deletePolicy: (policyId: string) => void;
}

const PolicyItem: React.FC<PolicyItemProps> = ({
    policy,
    isExpanded,
    onToggle,
    updatePolicy,
    deletePolicy,
}) => {
    const hasErrors = policy.errors.length > 0;

    return (
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
            onTitleChange={(name) => updatePolicy(policy.id, { name })}
            onDelete={() => deletePolicy(policy.id)}
            editorProps={{
                value: policy.code,
                onChange: (val) => updatePolicy(policy.id, { code: val || "" }),
            }}
        />
    );
};

export const PoliciesPanel: React.FC = () => {
    const policies = useActivePolicies();
    const { addPolicy, updatePolicy, deletePolicy } = usePoliciesStore();
    const saveActiveWorkspace = useWorkspaceStore((state) => state.saveActiveWorkspace);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const prevPolicyCount = React.useRef(policies.length || 0);
    useEffect(() => {
        if (policies.length > prevPolicyCount.current) {
            const latestPolicy = policies[0];
            setExpandedIds((prev) => new Set(prev).add(latestPolicy.id));
        }
        prevPolicyCount.current = policies.length || 0;
    }, [policies.length]);

    const filteredPolicies = useMemo(() => {
        return policies.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [policies, searchQuery]);

    const anyDirty = useMemo(() => {
        return policies.some((p) => p.isDirty);
    }, [policies]);

    const aggregateErrors = useMemo(() => {
        return policies.flatMap((p) => p.errors.map((err) => ({ ...err, source: p.name })));
    }, [policies]);

    const toggleAll = () => {
        if (expandedIds.size > 0) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(policies.map((p) => p.id)));
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
                        onClick={() => addPolicy()}
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
