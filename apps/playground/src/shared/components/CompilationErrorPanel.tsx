import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import type { BantaiError } from "@/shared/types";
import { AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import React, { useState } from "react";

interface CompilationErrorPanelProps {
    errors: BantaiError[];
    title?: string;
}

export const CompilationErrorPanel: React.FC<CompilationErrorPanelProps> = ({
    errors,
    title = "Problems",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedError, setSelectedError] = useState<BantaiError | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const errorCount = errors.length;

    // Roughly limit preview to ~3 lines worth of text
    const MAX_PREVIEW_CHARS = 120;

    const getPreviewMessage = (
        message: string
    ): {
        preview: string;
        isTruncated: boolean;
    } => {
        // Prefer splitting on newlines if present
        const lines = message.split("\n");
        if (lines.length > 3) {
            return {
                preview: lines.slice(0, 3).join("\n"),
                isTruncated: true,
            };
        }

        if (message.length <= MAX_PREVIEW_CHARS) {
            return { preview: message, isTruncated: false };
        }

        // Truncate by characters and try to cut on a word boundary
        const slice = message.slice(0, MAX_PREVIEW_CHARS);
        const lastSpace = slice.lastIndexOf(" ");
        const safeSlice = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;

        return {
            preview: `${safeSlice}…`,
            isTruncated: true,
        };
    };

    const handleViewMore = (error: BantaiError) => {
        setSelectedError(error);
        setIsSheetOpen(true);
    };

    if (errorCount === 0) {
        return (
            <div className="h-8 border-t border-border bg-muted/50 flex items-center px-4 gap-2 text-[10px] text-muted-foreground font-medium shrink-0 s">
                <Info size={12} className="text-muted-foreground" />
                <span>No problems detected</span>
            </div>
        );
    }

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border-t border-destructive/20 bg-background flex flex-col transition-[height] duration-200 shrink-0"
        >
            <CollapsibleTrigger className="h-8 flex items-center justify-between px-4 bg-destructive/10 border-b border-destructive/10 cursor-pointer hover:bg-destructive/20 s shrink-0">
                <div className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-destructive" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                        {title} ({errorCount})
                    </span>
                </div>
                {isOpen ? (
                    <ChevronDown size={14} className="text-destructive" />
                ) : (
                    <ChevronUp size={14} className="text-destructive" />
                )}
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden">
                <ScrollArea className="h-[160px]">
                    <div className="p-2 space-y-0.5">
                        {errors.map((error, i) => {
                            const { preview, isTruncated } = getPreviewMessage(error.message);
                            return (
                                <div
                                    key={i}
                                    className="flex gap-2 px-2 py-1.5 rounded hover:bg-destructive/5 s group items-start"
                                >
                                    <div className="flex flex-col items-end w-9 shrink-0 border-r border-destructive/20 pr-2 pt-0.5">
                                        <span className="text-[10px] font-mono text-muted-foreground leading-none">
                                            {error.line ? `L${error.line}` : "--"}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                        {error.source && (
                                            <span className="text-[9px] font-bold text-destructive/70 uppercase tracking-wider leading-none">
                                                {error.source}
                                            </span>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] text-destructive font-mono leading-relaxed break-words whitespace-pre-wrap">
                                                {preview}
                                            </span>
                                            {isTruncated && (
                                                <button
                                                    onClick={() => handleViewMore(error)}
                                                    className="text-[10px] text-primary hover:text-primary/80 underline self-start transition-colors"
                                                >
                                                    View More
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CollapsibleContent>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-destructive" />
                            Error Details
                        </SheetTitle>
                        {selectedError && (
                            <SheetDescription>
                                {selectedError.source && (
                                    <div className="text-xs font-semibold text-destructive/70 uppercase tracking-wider mb-2">
                                        {selectedError.source}
                                    </div>
                                )}
                                {selectedError.line && (
                                    <div className="text-xs text-muted-foreground mb-2">
                                        Line {selectedError.line}
                                    </div>
                                )}
                            </SheetDescription>
                        )}
                    </SheetHeader>
                    {selectedError && (
                        <div className="mt-4 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                            <div className="text-sm font-mono text-destructive whitespace-pre-wrap break-words">
                                {selectedError.message}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </Collapsible>
    );
};
