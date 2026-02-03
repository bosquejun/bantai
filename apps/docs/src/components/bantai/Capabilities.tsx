import React from 'react';

const PILLARS = [
  { 
    title: "TypeScript-First & Zod-Powered", 
    desc: "Built with TypeScript and Zod for end-to-end type safety. Define your context schemas and get full autocompletion across your logic." 
  },
  { 
    title: "Policy-Based Evaluation", 
    desc: "Bantai isn't just validation. It's a deterministic engine that separates your business rules from your execution flow for clean audits." 
  },
  { 
    title: "Composable Rules & Strategies", 
    desc: "Compose modular rules into powerful policies. Use 'preemptive' strategy to fail fast or 'exhaustive' to collect all violations." 
  },
  { 
    title: "Environment Agnostic", 
    desc: "Works anywhere JavaScript runs. Deploy in Next.js Middleware, Cloudflare Workers, Node.js servers, or even the browser." 
  }
];

export const Capabilities: React.FC = () => {
  return (
    <section id="features" className="py-40 bg-[var(--bg-primary)] relative border-b border-[var(--border-muted)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-32">
            <span className="text-[var(--text-primary)]/20 font-mono text-[10px] font-bold uppercase tracking-[0.5em] mb-4 block">CORE_PILLARS</span>
            <h3 className="text-5xl lg:text-7xl font-bold text-[var(--text-primary)] tracking-tighter uppercase leading-none font-heading">
                ENGINEERED FOR <br />DETERMINISM.
            </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          {PILLARS.map((item, i) => (
            <div key={i} className="group">
              <div className="w-12 h-[2px] bg-[var(--text-primary)] mb-8 group-hover:w-full transition-all duration-700 opacity-20 group-hover:opacity-100"></div>
              <h4 className="text-2xl font-black mb-6 uppercase tracking-tight text-[var(--text-primary)]">{item.title}</h4>
              <p className="text-lg text-[var(--text-primary)]/50 font-medium uppercase tracking-tight leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

