import { ContextPanel } from "@/features/context/components/ContextPanel";
import { ContextSelector } from "@/features/context/components/ContextSelector";
import { PoliciesPanel } from "@/features/policies/components/PoliciesPanel";
import { RulesPanel } from "@/features/rules/components/RulesPanel";
import { SimulationConsole } from "@/features/simulation/components/SimulationConsole";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MobileUnsupported } from "@/shared/components/MobileUnsupported";
import { TopBar } from "@/shared/components/TopBar";
import { useBantaiStore } from "@/shared/store/store";
import React, { useEffect, useRef, useState } from "react";

const App: React.FC = () => {
    const {
        activeContextId,
        contexts,
        updateContext,
        saveActiveContext,
        discardActiveChanges,
        hasActiveErrors,
        theme,
    } = useBantaiStore();

    const [paneWidths, setPaneWidths] = useState([30, 35, 35]);
    const [isContextCollapsed, setIsContextCollapsed] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const activeContext = contexts.find((c) => c.id === activeContextId);
    const rafRef = useRef<number | null>(null);
    const activeErrors = hasActiveErrors();

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    const handleResize = (index: number, e: React.MouseEvent) => {
        if (isContextCollapsed && index === 0) return;

        const startX = e.clientX;
        const startWidths = [...paneWidths];

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);

            rafRef.current = requestAnimationFrame(() => {
                const deltaX = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
                const nextWidths = [...startWidths];

                if (index === 0) {
                    nextWidths[0] = Math.max(15, Math.min(60, startWidths[0] + deltaX));
                    const remaining = 100 - nextWidths[0];
                    const ratio = startWidths[1] / (startWidths[1] + startWidths[2]);
                    nextWidths[1] = remaining * ratio;
                    nextWidths[2] = remaining * (1 - ratio);
                } else if (index === 1) {
                    nextWidths[1] = Math.max(15, Math.min(60, startWidths[1] + deltaX));
                    const remaining =
                        100 - (isContextCollapsed ? 0 : nextWidths[0]) - nextWidths[1];
                    nextWidths[2] = Math.max(15, remaining);
                }

                setPaneWidths(nextWidths);
            });
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "default";
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "col-resize";
    };

    const toggleContext = () => {
        setIsContextCollapsed(!isContextCollapsed);
    };

    const getRulesWidth = () => {
        if (!isContextCollapsed) return `${paneWidths[1]}%`;
        const ratio = paneWidths[1] / (paneWidths[1] + paneWidths[2]);
        return `calc(${ratio * 100}% - 20px)`;
    };

    const getPoliciesWidth = () => {
        if (!isContextCollapsed) return `${paneWidths[2]}%`;
        const ratio = paneWidths[2] / (paneWidths[1] + paneWidths[2]);
        return `calc(${ratio * 100}% - 20px)`;
    };

    return (
        <div className="flex flex-col h-screen select-none bg-background text-foreground s">
            <MobileUnsupported />
            <TopBar />
            <ContextSelector />

            <main className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex min-h-0 relative">
                    <ContextPanel
                        isCollapsed={isContextCollapsed}
                        onToggle={toggleContext}
                        activeContext={activeContext}
                        activeContextId={activeContextId}
                        activeErrors={activeErrors}
                        onSave={saveActiveContext}
                        onDiscardOpen={() => setIsDiscardOpen(true)}
                        updateContext={updateContext}
                        width={isContextCollapsed ? "40px" : `${paneWidths[0]}%`}
                    />

                    {!isContextCollapsed && (
                        <div
                            className="w-1.5 h-full hover:bg-primary/10 cursor-col-resize active:bg-primary/20 s z-10 shrink-0"
                            onMouseDown={(e) => handleResize(0, e)}
                        />
                    )}

                    <div
                        style={{ width: getRulesWidth() }}
                        className="h-full flex flex-col transition-[width] duration-300 ease-in-out border-x border-border"
                    >
                        <RulesPanel />
                    </div>

                    <div
                        className="w-1.5 h-full hover:bg-primary/10 cursor-col-resize active:bg-primary/20 s z-10 shrink-0"
                        onMouseDown={(e) => handleResize(1, e)}
                    />

                    <div
                        style={{ width: getPoliciesWidth() }}
                        className="h-full flex flex-col transition-[width] duration-300 ease-in-out border-x border-border"
                    >
                        <PoliciesPanel />
                    </div>
                </div>

                <SimulationConsole />
            </main>

            <footer className="h-6 border-t border-border px-3 flex items-center justify-between text-[10px] text-muted-foreground font-medium bg-background shrink-0">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Engine Ready
                    </span>
                    <span className="uppercase tracking-wider">Context: {activeContext?.name}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>UTF-8</span>
                    <span>TypeScript</span>
                </div>
            </footer>

            <ConfirmDialog
                isOpen={isDiscardOpen}
                onClose={() => setIsDiscardOpen(false)}
                onConfirm={discardActiveChanges}
                title="Discard Active Changes?"
                message="This will revert all changes in this context to the last saved state."
                confirmText="Discard"
                variant="danger"
            />
        </div>
    );
};

export default App;
