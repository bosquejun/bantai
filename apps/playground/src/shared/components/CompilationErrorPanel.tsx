import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const errorCount = errors.length;

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

            <CollapsibleContent>
                <ScrollArea className="max-h-40 h-auto">
                    <div className="p-2 space-y-0.5">
                        {errors.map((error, i) => (
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
                                    <span className="text-[11px] text-destructive font-mono leading-relaxed break-words">
                                        {error.message}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CollapsibleContent>
        </Collapsible>
    );
};
