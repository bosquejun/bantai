import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Editor } from "@/features/editor/components/Editor";
import { CompilationErrorPanel } from "@/shared/components/CompilationErrorPanel";
import { useBantaiStore } from "@/shared/store/store";
import type { TraceStep } from "@/shared/types";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Info,
    Loader2,
    Terminal,
    XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const TraceItem: React.FC<{ step: TraceStep; index: number }> = ({ step, index }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), index * 50);
        return () => clearTimeout(timer);
    }, [index]);

    if (!visible) return <div className="h-6" />;

    const getIcon = () => {
        switch (step.status) {
            case "success":
                return <CheckCircle2 size={12} className="text-green-500" />;
            case "failure":
                return <XCircle size={12} className="text-destructive" />;
            case "skip":
                return <Info size={12} className="text-muted-foreground" />;
            case "error":
                return <AlertCircle size={12} className="text-amber-500" />;
            default:
                return <Info size={12} className="text-muted-foreground" />;
        }
    };

    const getTextColor = () => {
        if (step.status === "success") return "text-foreground";
        if (step.status === "failure") return "text-muted-foreground";
        if (step.status === "error") return "text-amber-600 dark:text-amber-400";
        return "text-muted-foreground";
    };

    return (
        <div className="flex items-center gap-3 text-xs py-1.5 border-b border-border last:border-0">
            <span className="text-muted-foreground w-5 text-right font-mono text-[10px]">
                {(index + 1).toString().padStart(2, "0")}
            </span>
            <div className="shrink-0">{getIcon()}</div>
            <div className="flex flex-col min-w">
                <span className={`font-medium ${getTextColor()} truncate`}>{step.label}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                    {step.message || <i>No message</i>}
                </span>
            </div>
        </div>
    );
};

export const SimulationConsole: React.FC = () => {
    const {
        simulationInput,
        setSimulationInput,
        simulationInputErrors,
        isSimulationRunning,
        simulationResult,
    } = useBantaiStore();
    const [isOpen, setIsOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [simulationResult?.trace.length]);

    return (
        <div
            className={`border-t border-border bg-background flex flex-col transition-[height] duration-300 ease-in-out ${isOpen ? "h-80" : "h-10"}`}
        >
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex flex-col h-full">
                <CollapsibleTrigger className="h-10 px-4 bg-muted/50 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted s shrink-0">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-foreground" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Simulation Console
                        </span>
                        {isSimulationRunning && (
                            <Loader2 size={12} className="text-primary animate-spin ml-2" />
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {!isOpen && simulationResult && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                {simulationResult.allowed ? (
                                    <Badge
                                        variant="default"
                                        className="text-green-600 dark:text-green-500 bg-green-500/10 border-green-500/20"
                                    >
                                        <CheckCircle2 size={10} /> ALLOW
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">
                                        <XCircle size={10} /> DENY
                                    </Badge>
                                )}
                                <span className="text-muted-foreground">|</span>
                                <span className="flex items-center gap-1">
                                    <Clock size={10} /> {simulationResult.duration}ms
                                </span>
                            </div>
                        )}
                        {isOpen ? (
                            <ChevronDown size={14} className="text-muted-foreground" />
                        ) : (
                            <ChevronUp size={14} className="text-muted-foreground" />
                        )}
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Left: Editor */}
                    <div className="w-1/2 h-full border-r border-border flex flex-col bg-background">
                        <div className="px-3 py-1.5 bg-muted/30 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Info size={10} />
                            Input Payload
                        </div>
                        <div className="flex-1 min-h-0 relative flex flex-col">
                            <div className="flex-1 min-h-0">
                                <Editor
                                    language="json"
                                    value={simulationInput}
                                    onChange={(val) => setSimulationInput(val || "")}
                                    options={{
                                        lineNumbers: "on",
                                        folding: true,
                                        glyphMargin: false,
                                        lineDecorationsWidth: 0,
                                    }}
                                />
                            </div>
                            <CompilationErrorPanel
                                errors={simulationInputErrors}
                                title="Payload Problems"
                            />
                        </div>
                    </div>

                    {/* Right: Results & Trace */}
                    <div className="w-1/2 h-full flex flex-col bg-muted/20">
                        <div className="px-3 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={10} />
                                Evaluation Result
                            </span>
                            {simulationResult && (
                                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} /> {simulationResult.duration}ms
                                    </span>
                                </div>
                            )}
                        </div>

                        <div
                            className="flex-1 overflow-y-auto p-4 custom-scrollbar"
                            ref={scrollRef}
                        >
                            {isSimulationRunning ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse s">
                                    <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
                                    <span className="text-xs font-medium tracking-wide">
                                        Executing engine...
                                    </span>
                                </div>
                            ) : simulationResult ? (
                                <div className="space-y-6">
                                    <div
                                        className={`flex items-center gap-4 p-4 rounded-xl border s ${
                                            simulationResult.allowed
                                                ? "bg-emerald-500/5 border-emerald-500/20"
                                                : "bg-destructive/5 border-destructive/20"
                                        }`}
                                    >
                                        <div
                                            className={`p-2 rounded-lg ${
                                                simulationResult.allowed
                                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                    : "bg-destructive/20 text-destructive"
                                            }`}
                                        >
                                            {simulationResult.allowed ? (
                                                <CheckCircle2 size={24} />
                                            ) : (
                                                <XCircle size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={`text-lg font-bold tracking-tight ${
                                                    simulationResult.allowed
                                                        ? "text-emerald-700 dark:text-emerald-400"
                                                        : "text-destructive"
                                                }`}
                                            >
                                                {simulationResult.allowed ? "ALLOW" : "DENY"}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate font-medium">
                                                {simulationResult.error ||
                                                    simulationResult.reason ||
                                                    (simulationResult.allowed
                                                        ? "Access granted."
                                                        : "Access denied.")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                                Trace Logs
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                Steps: {simulationResult.trace.length}
                                            </span>
                                        </div>
                                        <Card className="p-2 space-y-0.5 gap-0">
                                            {simulationResult.trace.map((step, i) => (
                                                <TraceItem
                                                    key={`${step.id}-${simulationResult.timestamp}`}
                                                    step={step}
                                                    index={i}
                                                />
                                            ))}
                                        </Card>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8 text-muted-foreground gap-3">
                                    <Terminal size={32} strokeWidth={1.5} className="opacity-20" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium">
                                            Waiting for simulation
                                        </p>
                                        <p className="text-[10px] leading-relaxed">
                                            Run the engine to see the evaluation trace.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};
