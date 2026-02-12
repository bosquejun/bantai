import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Editor } from "@/features/editor/components/Editor";
import type { EditorProps } from "@monaco-editor/react";
import { AlertCircle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import React from "react";
import { defaultEditorOptions } from "../utils/editor-options";

type CollapsibleEditorCardProps = {
    title: string;
    icon?: React.ReactNode;
    isExpanded?: boolean;
    hasErrors?: boolean;
    isDirty?: boolean;
    onTitleChange?: (title: string) => void;
    onToggle?: () => void;
    onDelete?: () => void;
    editorProps?: EditorProps;
};

export const CollapsibleEditorCard: React.FC<CollapsibleEditorCardProps> = ({
    title,
    icon: Icon,
    isExpanded,
    onToggle,
    hasErrors,
    isDirty,
    onTitleChange,
    onDelete,
    editorProps,
}) => {
    return (
        <Card
            className={`group mb-3 rounded-none last:mb-0 py-0 s ${hasErrors ? "border-destructive/30" : isDirty ? "border-primary/30" : ""}`}
        >
            <Collapsible open={isExpanded} onOpenChange={onToggle}>
                <CollapsibleTrigger
                    className={`w-full h-9 flex items-center justify-between px-3 cursor-pointer s ${hasErrors ? "bg-destructive/10" : isDirty ? "bg-muted" : "bg-muted/50"} border-b`}
                >
                    <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle?.();
                            }}
                            className="text-muted-foreground hover:text-foreground s cursor-pointer p-0.5"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        {hasErrors ? (
                            <AlertCircle
                                size={14}
                                className="text-destructive shrink-0 animate-pulse"
                            />
                        ) : (
                            Icon && Icon
                        )}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Input
                                readOnly
                                className={`!bg-transparent !pl-1 border-0 h-auto p-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 w-fit truncate ${hasErrors ? "text-destructive" : isDirty ? "text-foreground" : "text-muted-foreground"}`}
                                value={title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    onTitleChange?.(e.target.value)
                                }
                                // onClick={(e: React.MouseEvent<HTMLInputElement>) =>
                                //     e.stopPropagation()
                                // }
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div
                            className="flex items-center gap-1 ml-2 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete?.()}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>

                        {isDirty && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="h-48 border-t border-border relative">
                        <Editor
                            {...editorProps}
                            options={{
                                ...defaultEditorOptions,
                                ...(editorProps?.options || {}),
                                scrollbar: {
                                    ...defaultEditorOptions.scrollbar,
                                    ...(editorProps?.options?.scrollbar || {}),
                                },
                            }}
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};
