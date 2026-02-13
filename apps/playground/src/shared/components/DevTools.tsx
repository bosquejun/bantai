import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { File, Folder, Tree, type TreeViewElement } from "@/components/ui/file-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/shared/store";
import { Code2, Copy, FileCode, Folder as FolderIcon, Info, X } from "lucide-react";
import React, { useState } from "react";

interface DevToolsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ isOpen, onClose }) => {
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const getWorkspacePath = useWorkspaceStore((state) => state.getWorkspacePath);
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

    const copyToClipboard = async (text: string, path: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedPath(path);
            setTimeout(() => setCopiedPath(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    // Extended tree element with path info
    type ExtendedTreeElement = TreeViewElement & {
        fullPath?: string;
        relativePath?: string;
    };

    // Helper to mask workspace ID in paths
    const maskWorkspaceId = (path: string, workspaceId: string) => {
        return path.replace(`file:///workspace/${workspaceId}`, "/workspace/..");
    };

    // Build file tree structure for a workspace
    const buildWorkspaceTree = (workspace: typeof workspaces[0]): ExtendedTreeElement => {
        const basePath = getWorkspacePath(workspace.id);
        const previewPath = getWorkspacePath(workspace.id, "/preview");
        const rulesPath = getWorkspacePath(workspace.id, "/rules");

        const ruleFiles: ExtendedTreeElement[] = workspace.rules.map((rule) => ({
            id: `${rulesPath}/${rule.id}.ts`,
            name: `${rule.id}.ts`,
            fullPath: `${rulesPath}/${rule.id}.ts`,
            relativePath: `${rule.id}.ts`,
            isSelectable: false,
        }));

        const previewRuleFiles: ExtendedTreeElement[] = workspace.rules.map((rule) => ({
            id: `${previewPath}/rules/${rule.id}.ts`,
            name: `${rule.id}.ts`,
            fullPath: `${previewPath}/rules/${rule.id}.ts`,
            relativePath: `${rule.id}.ts`,
            isSelectable: false,
        }));

        // Build tree structure with clean relative paths
        const children: ExtendedTreeElement[] = [
            {
                id: `${basePath}/context.ts`,
                name: "context.ts",
                fullPath: `${basePath}/context.ts`,
                relativePath: "context.ts",
                isSelectable: false,
            },
            {
                id: `${basePath}/context-global.d.ts`,
                name: "context-global.d.ts",
                fullPath: `${basePath}/context-global.d.ts`,
                relativePath: "context-global.d.ts",
                isSelectable: false,
            },
        ];

        // Add rules folder if there are rules
        if (workspace.rules.length > 0) {
            children.push({
                id: rulesPath,
                name: "rules",
                fullPath: rulesPath,
                relativePath: "rules",
                isSelectable: false,
                children: ruleFiles,
            } as ExtendedTreeElement);
        }

        // Add preview folder
        const previewChildren: ExtendedTreeElement[] = [
            {
                id: `${previewPath}/context.ts`,
                name: "context.ts",
                fullPath: `${previewPath}/context.ts`,
                relativePath: "context.ts",
                isSelectable: false,
            },
        ];

        // Add preview/rules folder if there are rules
        if (workspace.rules.length > 0) {
            previewChildren.push({
                id: `${previewPath}/rules`,
                name: "rules",
                fullPath: `${previewPath}/rules`,
                relativePath: "rules",
                isSelectable: false,
                children: previewRuleFiles,
            } as ExtendedTreeElement);
        }

        children.push({
            id: previewPath,
            name: "preview",
            fullPath: previewPath,
            relativePath: "preview",
            isSelectable: false,
            children: previewChildren,
        } as ExtendedTreeElement);

        return {
            id: basePath,
            name: maskWorkspaceId(basePath, workspace.id),
            fullPath: basePath,
            relativePath: maskWorkspaceId(basePath, workspace.id),
            isSelectable: false,
            children,
        } as ExtendedTreeElement;
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 h-full">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <Code2 size={18} />
                        DevTools
                    </SheetTitle>
                    <SheetDescription>View app metadata, workspace paths, contexts, and rules</SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-6 py-6 pb-8 space-y-6">
                        {/* App Metadata */}
                        <section>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                                <Info size={14} />
                                App Metadata
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Total Workspaces</span>
                                    <Badge variant="outline">{workspaces.length}</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Active Workspace</span>
                                    <Badge variant={activeWorkspace ? "default" : "secondary"}>
                                        {activeWorkspace?.name || "None"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Total Rules</span>
                                    <Badge variant="outline">
                                        {workspaces.reduce((sum, w) => sum + w.rules.length, 0)}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Total Policies</span>
                                    <Badge variant="outline">
                                        {workspaces.reduce((sum, w) => sum + w.policies.length, 0)}
                                    </Badge>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Workspace Paths */}
                        <section>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                                <FolderIcon size={14} />
                                Workspace Paths
                            </h3>
                            <div className="space-y-3">
                                {workspaces.map((workspace) => {
                                    const basePath = getWorkspacePath(workspace.id);
                                    const previewPath = getWorkspacePath(workspace.id, "/preview");
                                    const rulesPath = getWorkspacePath(workspace.id, "/rules");
                                    const workspaceTree = buildWorkspaceTree(workspace);

                                    const renderTree = (element: ExtendedTreeElement, level = 0): React.ReactNode => {
                                        const fullPath = element.fullPath || element.id;
                                        const displayName = element.relativePath || element.name;

                                        if (element.children && element.children.length > 0) {
                                            return (
                                                <Folder
                                                    key={element.id}
                                                    element={displayName}
                                                    value={element.id}
                                                    isSelectable={false}
                                                    className="group/folder"
                                                >
                                                    {element.children.map((child) => renderTree(child, level + 1))}
                                                </Folder>
                                            );
                                        }
                                        return (
                                            <div
                                                key={element.id}
                                                className="group/file flex items-center justify-between w-full pr-1 hover:bg-muted/50 rounded px-1 -ml-1"
                                            >
                                                <File
                                                    value={element.id}
                                                    isSelectable={false}
                                                    className="flex-1 min-w-0 text-xs font-mono"
                                                    onClick={() => copyToClipboard(fullPath, fullPath)}
                                                >
                                                    <span className="truncate" title={fullPath}>
                                                        {displayName}
                                                    </span>
                                                </File>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(fullPath, fullPath);
                                                    }}
                                                    title={`Copy: ${fullPath}`}
                                                >
                                                    {copiedPath === fullPath ? (
                                                        <X size={11} className="text-green-600 dark:text-green-400" />
                                                    ) : (
                                                        <Copy size={11} />
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div
                                            key={workspace.id}
                                            className={`p-3 rounded-lg border ${
                                                workspace.id === activeWorkspaceId
                                                    ? "border-primary/50 bg-primary/5 shadow-sm"
                                                    : "border-border bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <FolderIcon
                                                        size={12}
                                                        className={
                                                            workspace.id === activeWorkspaceId
                                                                ? "text-primary"
                                                                : "text-muted-foreground"
                                                        }
                                                    />
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {workspace.name}
                                                    </span>
                                                    {workspace.id === activeWorkspaceId && (
                                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <code className="text-[9px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                                                        {maskWorkspaceId(basePath, workspace.id)}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 opacity-60 hover:opacity-100"
                                                        onClick={() => copyToClipboard(basePath, basePath)}
                                                        title="Copy workspace path"
                                                    >
                                                        {copiedPath === basePath ? (
                                                            <X size={10} />
                                                        ) : (
                                                            <Copy size={10} />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="bg-background rounded-md border border-border p-2 min-h-[100px]">
                                                <Tree
                                                    elements={[workspaceTree]}
                                                    initialExpandedItems={[
                                                        basePath,
                                                        previewPath,
                                                        ...(workspace.rules.length > 0 ? [rulesPath] : []),
                                                    ].filter(Boolean)}
                                                    indicator={true}
                                                >
                                                    {renderTree(workspaceTree)}
                                                </Tree>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Modified: {formatDate(workspace.lastModified)}
                                                </span>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <span>{workspace.rules.length} rule{workspace.rules.length !== 1 ? "s" : ""}</span>
                                                    <span>•</span>
                                                    <span>{workspace.policies.length} polic{workspace.policies.length !== 1 ? "ies" : "y"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <Separator />

                        {/* Contexts */}
                        <section>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                                <FileCode size={14} />
                                Contexts ({workspaces.length})
                            </h3>
                            <div className="space-y-3">
                                {workspaces.map((workspace) => (
                                    <div
                                        key={workspace.id}
                                        className={`p-3 rounded border ${
                                            workspace.id === activeWorkspaceId
                                                ? "border-primary bg-primary/5"
                                                : "border-border bg-muted/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold">{workspace.name}</span>
                                            <div className="flex items-center gap-2">
                                                {workspace.errors.length > 0 && (
                                                    <Badge variant="destructive" className="text-[10px]">
                                                        {workspace.errors.length} error
                                                        {workspace.errors.length !== 1 ? "s" : ""}
                                                    </Badge>
                                                )}
                                                {workspace.isDirty && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        Dirty
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono bg-background p-2 rounded border border-border max-h-32 overflow-auto">
                                            <pre className="whitespace-pre-wrap wrap-break-word text-[10px]">
                                                {workspace.context || "(empty)"}
                                            </pre>
                                        </div>
                                        {workspace.errors.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {workspace.errors.slice(0, 3).map((error, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded"
                                                    >
                                                        Line {error.line}: {error.message}
                                                    </div>
                                                ))}
                                                {workspace.errors.length > 3 && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        +{workspace.errors.length - 3} more errors
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <Separator />

                        {/* Rules */}
                        <section>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                                <Code2 size={14} />
                                Rules (
                                {workspaces.reduce((sum, w) => sum + w.rules.length, 0)})
                            </h3>
                            <div className="space-y-3">
                                {workspaces.map((workspace) =>
                                    workspace.rules.length > 0 ? (
                                        <div
                                            key={workspace.id}
                                            className={`p-3 rounded border ${
                                                workspace.id === activeWorkspaceId
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold">{workspace.name}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {workspace.rules.length} rule
                                                    {workspace.rules.length !== 1 ? "s" : ""}
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {workspace.rules.map((rule) => (
                                                    <div
                                                        key={rule.id}
                                                        className="p-2 bg-background rounded border border-border"
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold">{rule.name}</span>
                                                            <div className="flex items-center gap-1">
                                                                {rule.errors.length > 0 && (
                                                                    <Badge variant="destructive" className="text-[10px]">
                                                                        {rule.errors.length}
                                                                    </Badge>
                                                                )}
                                                                {rule.isDirty && (
                                                                    <Badge variant="outline" className="text-[10px]">
                                                                        Dirty
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-mono bg-muted/50 p-1.5 rounded max-h-24 overflow-auto">
                                                            <pre className="whitespace-pre-wrap wrap-break-word text-[10px]">
                                                                {rule.code || "(empty)"}
                                                            </pre>
                                                        </div>
                                                        {rule.errors.length > 0 && (
                                                            <div className="mt-1.5 space-y-0.5">
                                                                {rule.errors.slice(0, 2).map((error, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded"
                                                                    >
                                                                        Line {error.line}: {error.message}
                                                                    </div>
                                                                ))}
                                                                {rule.errors.length > 2 && (
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        +{rule.errors.length - 2} more errors
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
};
