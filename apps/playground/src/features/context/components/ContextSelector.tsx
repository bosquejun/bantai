import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBantaiStore } from "@/shared/store/store";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { NewContextDialog } from "./NewContextDialog";

export const ContextSelector: React.FC = () => {
    const { contexts, activeContextId, setActiveContext, addContext, deleteContext } =
        useBantaiStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [search, setSearch] = useState("");

    const activeContext = contexts.find((c) => c.id === activeContextId);
    const filteredContexts = contexts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = (name: string) => {
        addContext(name);
    };

    const isContextDirty = (ctx: any) => {
        return (
            ctx.isDirty ||
            ctx.rules.some((r: any) => r.isDirty) ||
            ctx.policies.some((p: any) => p.isDirty)
        );
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="h-12 border-b border-border flex items-center px-4 bg-muted/50 gap-4 shrink-0 s">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Context
            </div>

            <div className="relative">
                <Button
                    variant="outline"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`min-w-[200px] justify-between ${activeContext && isContextDirty(activeContext) ? "border-primary shadow-sm" : ""}`}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate">
                            {activeContext?.name || "Select context..."}
                        </span>
                        {activeContext && isContextDirty(activeContext) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                    </div>
                    <ChevronDown
                        size={14}
                        className={
                            isDropdownOpen
                                ? "rotate-180 transition-transform"
                                : "transition-transform"
                        }
                    />
                </Button>

                {isDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-[90]"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 mt-1 w-[300px] bg-popover border border-border rounded-lg shadow-lg z-[100] p-1 overflow-hidden">
                            <div className="p-2 relative">
                                <Search
                                    size={14}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    autoFocus
                                    type="text"
                                    placeholder="Search contexts..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="max-h-60">
                                <div className="p-1">
                                    {filteredContexts.map((ctx) => (
                                        <div
                                            key={ctx.id}
                                            onClick={() => {
                                                setActiveContext(ctx.id);
                                                setIsDropdownOpen(false);
                                                setSearch("");
                                            }}
                                            className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer s mb-0.5 ${ctx.id === activeContextId ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                                        >
                                            <div className="flex items-center gap-2 truncate mr-2">
                                                <span className="text-sm truncate font-medium">
                                                    {ctx.name}
                                                </span>
                                                {isContextDirty(ctx) && (
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctx.id === activeContextId ? "bg-accent-foreground" : "bg-primary"}`}
                                                    />
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete context "${ctx.name}"?`)) {
                                                        deleteContext(ctx.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                    {filteredContexts.length === 0 && (
                                        <div className="py-8 text-center text-xs text-muted-foreground italic">
                                            No contexts found
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="border-t border-border p-1">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => setIsDialogOpen(true)}
                                >
                                    <Plus size={14} />
                                    <span>New Context</span>
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground font-mono">
                <span>
                    Updated:{" "}
                    {new Date(activeContext?.lastModified || Date.now()).toLocaleTimeString()}
                </span>
            </div>

            <NewContextDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onCreate={handleCreate}
            />
        </div>
    );
};
