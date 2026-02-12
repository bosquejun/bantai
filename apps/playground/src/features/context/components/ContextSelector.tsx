import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    useWorkspaceStore,
    useActiveWorkspace,
} from "@/shared/store";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { NewContextDialog } from "./NewContextDialog";

export const ContextSelector: React.FC = () => {
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
    const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);
    const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
    const activeWorkspace = useActiveWorkspace();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredWorkspaces = workspaces.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = (name: string) => {
        addWorkspace(name);
    };

    const isWorkspaceDirty = (ws: any) => {
        return (
            ws.isDirty ||
            ws.rules.some((r: any) => r.isDirty) ||
            ws.policies.some((p: any) => p.isDirty)
        );
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="h-12 border-b border-border flex items-center px-4 bg-muted/50 gap-4 shrink-0 s">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Workspace
            </div>

            <div className="relative">
                <Button
                    variant="outline"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`min-w-[200px] justify-between ${activeWorkspace && isWorkspaceDirty(activeWorkspace) ? "border-primary shadow-sm" : ""}`}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate">
                            {activeWorkspace?.name || "Select workspace..."}
                        </span>
                        {activeWorkspace && isWorkspaceDirty(activeWorkspace) && (
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
                                    placeholder="Search workspaces..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="max-h-60">
                                <div className="p-1">
                                    {filteredWorkspaces.map((ws) => (
                                        <div
                                            key={ws.id}
                                            onClick={() => {
                                                setActiveWorkspace(ws.id);
                                                setIsDropdownOpen(false);
                                                setSearch("");
                                            }}
                                            className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer s mb-0.5 ${ws.id === activeWorkspaceId ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                                        >
                                            <div className="flex items-center gap-2 truncate mr-2">
                                                <span className="text-sm truncate font-medium">
                                                    {ws.name}
                                                </span>
                                                {isWorkspaceDirty(ws) && (
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.id === activeWorkspaceId ? "bg-accent-foreground" : "bg-primary"}`}
                                                    />
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete workspace "${ws.name}"?`)) {
                                                        deleteWorkspace(ws.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                    {filteredWorkspaces.length === 0 && (
                                        <div className="py-8 text-center text-xs text-muted-foreground italic">
                                            No workspaces found
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
                                    <span>New Workspace</span>
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground font-mono">
                <span>
                    Updated:{" "}
                    {new Date(activeWorkspace?.lastModified || Date.now()).toLocaleTimeString()}
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
