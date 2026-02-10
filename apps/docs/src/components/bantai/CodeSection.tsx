"use client";

import React, { useState } from "react";

const TABS = [
    {
        id: "context",
        label: "01. Context",
        filename: "context.ts",
        code: `import { z } from 'zod';
import { defineContext } from '@bantai-dev/core';

// Define your input schema
export const userContext = defineContext(
  z.object({
    age: z.number().min(0),
    role: z.enum(['admin', 'editor', 'guest']),
    isKycVerified: z.boolean()
  })
);`,
    },
    {
        id: "rule",
        label: "02. Rule",
        filename: "rules.ts",
        code: `import { defineRule, allow, deny } from '@bantai-dev/core';
import { userContext } from './context';

// Logic-driven decision units
export const ageRule = defineRule(userContext, 'age-v', async (ctx) => {
  if (ctx.age >= 18) {
    return allow({ reason: 'User is of legal age' });
  }
  return deny({ reason: 'User must be 18+' });
});`,
    },
    {
        id: "policy",
        label: "03. Policy",
        filename: "policy.ts",
        code: `import { definePolicy } from '@bantai-dev/core';
import { userContext } from './context';
import { ageRule } from './rules';

// Group rules into executable policies
export const signupPolicy = definePolicy(
  userContext, 
  'signup-policy', 
  [ageRule]
);`,
    },
    {
        id: "eval",
        label: "04. Evaluation",
        filename: "main.ts",
        code: `import { evaluatePolicy } from '@bantai-dev/core';
import { signupPolicy } from './policy';

// Execute anywhere (Edge, Node, Browser)
const result = await evaluatePolicy(signupPolicy, { 
  age: 25, 
  role: 'editor',
  isKycVerified: true 
});

console.log(result.decision); // 'allow'
console.log(result.isAllowed); // true
console.log(result.violatedRules); // []
console.log(result.evaluatedRules); // Array of all evaluated rules`,
    },
];

export const CodeSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);

    return (
        <section id="usage" className="py-40 bg-background border-b border-input relative">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="lg:flex items-start gap-32">
                    <div className="lg:w-2/5 mb-24 lg:mb-0">
                        <span className="text-foreground/20 font-mono text-[10px] font-black uppercase tracking-[0.5em] mb-6 block">
                            QUICK_START
                        </span>
                        <h2 className="text-4xl lg:text-6xl font-black text-foreground mb-10 uppercase tracking-tighter leading-none">
                            CLEAN <br />
                            IMPLEMENTATION.
                        </h2>
                        <p className="text-foreground/50 mb-12 leading-relaxed font-medium uppercase text-sm tracking-tight">
                            Bantai sits in the middle of your application and its decisions. Use our
                            declarative API to craft explainable, type-safe logic in minutes.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-background"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                                    Zod-Compatible
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-background"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                                    Strict TypeScript Support
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-3/5">
                        <div className="flex flex-nowrap gap-1 mb-6 border-b border-input pb-4 overflow-x-auto no-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                                        activeTab.id === tab.id
                                            ? "text-foreground border-b-2 border-foreground"
                                            : "text-foreground/30 hover:text-foreground/60"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="border-2 border-input bg-background dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] light:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] group">
                            <div className="border-b border-input px-6 py-4 flex items-center justify-between bg-input">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 bg-background/25 invert rounded-full"></div>
                                    <div className="w-3 h-3 bg-background/20 invert rounded-full"></div>
                                    <div className="w-3 h-3 bg-background/15 invert rounded-full"></div>
                                </div>
                                <span className="text-[9px] font-mono text-foreground/40 tracking-widest uppercase italic">
                                    {activeTab.filename}
                                </span>
                            </div>
                            <div className="p-8 md:p-12 font-mono text-[11px] md:text-sm leading-6 min-h-[350px] overflow-x-auto relative">
                                <pre className="text-foreground/80">
                                    <code className="block whitespace-pre">{activeTab.code}</code>
                                </pre>
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-[8px] font-mono text-foreground/20 uppercase tracking-widest">
                                        Read Only
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
