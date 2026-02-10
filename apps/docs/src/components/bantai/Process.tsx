import React from "react";

const STEPS = [
    {
        step: "01",
        title: "Define Context",
        desc: "Use defineContext(z.object({...})) to establish your schema requirements.",
        size: "large",
    },
    {
        step: "02",
        title: "Craft Rules",
        desc: "Write individual validation rules that return typed allow() or deny() responses.",
        size: "medium",
    },
    {
        step: "03",
        title: "Compose Policies",
        desc: "Group multiple rules into a single policy with custom evaluation strategies.",
        size: "medium",
    },
    {
        step: "04",
        title: "Execute Eval",
        desc: "Trigger evaluatePolicy() with real-time data to get an instant decision.",
        size: "large",
    },
    {
        step: "05",
        title: "Handle Results",
        desc: "Utilize decision and violatedRules arrays to power your application's logic.",
        size: "small",
    },
];

export const Process: React.FC = () => {
    return (
        <section className="py-24 bg-background text-foreground relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
                    <div className="max-w-2xl">
                        <span className="text-foreground/40 font-mono text-[9px] font-bold uppercase tracking-[0.5em] mb-3 block">
                            DEVELOPER_WORKFLOW
                        </span>
                        <h3 className="text-4xl lg:text-6xl font-bold text-foreground tracking-tighter uppercase leading-none font-heading">
                            LOGIC IN FIVE <br />
                            PHASES.
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr">
                    {/* Step 1 - Large */}
                    <div className="md:col-span-2 lg:col-span-2 md:row-span-1 bg-background border-2 border-input p-6 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-12 h-12 border-l-2 border-b-2 border-input dark:group-hover:border-black group-hover:border-white transition-colors"></div>
                        <div className="text-5xl font-black mb-3 italic text-foreground/10 dark:group-hover:text-black/10 group-hover:text-white/10 transition-colors">
                            {STEPS[0].step}
                        </div>
                        <h4 className="text-lg font-bold uppercase tracking-tight mb-2">
                            {STEPS[0].title}
                        </h4>
                        <p className="text-xs font-medium uppercase tracking-tight opacity-60 dark:group-hover:opacity-100 group-hover:opacity-100 leading-relaxed">
                            {STEPS[0].desc}
                        </p>
                    </div>

                    {/* Step 2 - Medium */}
                    <div className="md:col-span-1 lg:col-span-1 md:row-span-1 bg-background border-2 border-input p-5 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-10 h-10 border-l-2 border-b-2 border-input dark:group-hover:border-black group-hover:border-white transition-colors"></div>
                        <div className="text-4xl font-black mb-3 italic text-foreground/10 dark:group-hover:text-black/10 group-hover:text-white/10 transition-colors">
                            {STEPS[1].step}
                        </div>
                        <h4 className="text-base font-bold uppercase tracking-tight mb-2">
                            {STEPS[1].title}
                        </h4>
                        <p className="text-xs font-medium uppercase tracking-tight opacity-60 dark:group-hover:opacity-100 group-hover:opacity-100 leading-relaxed">
                            {STEPS[1].desc}
                        </p>
                    </div>

                    {/* Step 3 - Medium */}
                    <div className="md:col-span-1 lg:col-span-1 md:row-span-1 bg-background border-2 border-input p-5 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-10 h-10 border-l-2 border-b-2 border-input dark:group-hover:border-black group-hover:border-white transition-colors"></div>
                        <div className="text-4xl font-black mb-3 italic text-foreground/10 dark:group-hover:text-black/10 group-hover:text-white/10 transition-colors">
                            {STEPS[2].step}
                        </div>
                        <h4 className="text-base font-bold uppercase tracking-tight mb-2">
                            {STEPS[2].title}
                        </h4>
                        <p className="text-xs font-medium uppercase tracking-tight opacity-60 dark:group-hover:opacity-100 group-hover:opacity-100 leading-relaxed">
                            {STEPS[2].desc}
                        </p>
                    </div>

                    {/* Step 4 - Large */}
                    <div className="md:col-span-2 lg:col-span-2 md:row-span-1 bg-background border-2 border-input p-6 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-12 h-12 border-l-2 border-b-2 border-input dark:group-hover:border-black group-hover:border-white transition-colors"></div>
                        <div className="text-5xl font-black mb-3 italic text-foreground/10 dark:group-hover:text-black/10 group-hover:text-white/10 transition-colors">
                            {STEPS[3].step}
                        </div>
                        <h4 className="text-lg font-bold uppercase tracking-tight mb-2">
                            {STEPS[3].title}
                        </h4>
                        <p className="text-xs font-medium uppercase tracking-tight opacity-60 dark:group-hover:opacity-100 group-hover:opacity-100 leading-relaxed">
                            {STEPS[3].desc}
                        </p>
                    </div>

                    {/* Step 5 - Small */}
                    <div className="md:col-span-2 lg:col-span-2 md:row-span-1 bg-background border-2 border-input p-5 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-10 h-10 border-l-2 border-b-2 border-input dark:group-hover:border-black group-hover:border-white transition-colors"></div>
                        <div className="flex items-start gap-4 flex-1">
                            <div className="text-4xl font-black italic text-foreground/10 dark:group-hover:text-black/10 group-hover:text-white/10 transition-colors flex-shrink-0">
                                {STEPS[4].step}
                            </div>
                            <div className="flex-1 flex flex-col">
                                <h4 className="text-base font-bold uppercase tracking-tight mb-2">
                                    {STEPS[4].title}
                                </h4>
                                <p className="text-xs font-medium uppercase tracking-tight opacity-60 dark:group-hover:opacity-100 group-hover:opacity-100 leading-relaxed">
                                    {STEPS[4].desc}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
