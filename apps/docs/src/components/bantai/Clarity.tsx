import React from 'react';

const USE_CASES = [
  { label: "Authorization & Access Control", desc: "Complex permission trees and multi-tenant logic." },
  { label: "Fintech Risk & Compliance", desc: "KYC verification and transaction limit evaluation." },
  { label: "AI / LLM Guardrails", desc: "Evaluate prompts for risk scores and confidence thresholds." },
  { label: "Business Rule Engines", desc: "Move dynamic logic out of code and into policies." },
  { label: "Feature Flags & Entitlements", desc: "Determine user features based on subscription context." },
  { label: "OSS Trust Signals", desc: "Evaluate contributor reputation and code quality metrics." }
];

export const Clarity: React.FC = () => {
  return (
    <section className="py-40 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-24 text-center">
            <span className="text-[var(--text-primary)]/20 font-mono text-[10px] font-black uppercase tracking-[0.5em] mb-6 block">SCENARIOS</span>
            <h3 className="text-5xl lg:text-7xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none font-heading">
                VERSATILE BY DESIGN.
            </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border-muted)] border border-[var(--border-muted)]">
          {USE_CASES.map((uc, i) => (
            <div key={i} className="bg-[var(--bg-primary)] p-12 dark:hover:bg-white hover:bg-black transition-all group cursor-default">
              <span className="font-mono text-[10px] text-[var(--text-primary)]/30 dark:group-hover:text-black/40 group-hover:text-white/40 block mb-8">USE_CASE_0{i+1}</span>
              <h4 className="text-xl font-black uppercase tracking-tight text-[var(--text-primary)] dark:group-hover:text-black group-hover:text-white mb-4">{uc.label}</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]/40 dark:group-hover:text-black/60 group-hover:text-white/60 leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

