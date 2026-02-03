'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const EvaluationFlow: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto relative mt-32 px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-0">
        
        {/* LEFT: INPUTS */}
        <div className="lg:col-span-3 flex flex-col justify-center gap-4">
          <div className="text-[9px] font-mono dark:text-white/30 text-black/30 uppercase tracking-[0.3em] mb-2">Real-world Inputs</div>
          
          <div className="p-4 border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 space-y-1 relative overflow-hidden group dark:hover:border-white/30 hover:border-black/30 transition-colors">
            <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="text-[10px] font-black dark:text-white/60 text-black/60 uppercase">User Context</div>
            <div className="text-[9px] font-mono dark:text-white/40 text-black/40 italic">{'{ role: "editor", age: 25 }'}</div>
            <div className="absolute top-0 right-0 w-1 h-full dark:bg-white/10 bg-black/10"></div>
          </div>
          
          <div className="p-4 border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 space-y-1 opacity-80 relative overflow-hidden group hover:opacity-100 transition-all">
            <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="text-[10px] font-black dark:text-white/60 text-black/60 uppercase">Risk Signals</div>
            <div className="text-[9px] font-mono dark:text-white/40 text-black/40 italic">{'{ kyc: true, score: 0.9 }'}</div>
            <div className="absolute top-0 right-0 w-1 h-full dark:bg-white/10 bg-black/10"></div>
          </div>
          
          <div className="p-4 border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 space-y-1 opacity-60 relative overflow-hidden group hover:opacity-100 transition-all">
            <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="text-[10px] font-black dark:text-white/60 text-black/60 uppercase">LLM Prompt</div>
            <div className="text-[9px] font-mono dark:text-white/40 text-black/40 italic">{'{ risk: "low", size: 120 }'}</div>
            <div className="absolute top-0 right-0 w-1 h-full dark:bg-white/10 bg-black/10"></div>
          </div>
          
          <div className="mt-4 flex gap-3 grayscale opacity-30 justify-start lg:justify-start">
            <img src="https://simpleicons.org/icons/nextdotjs.svg" className="w-4 h-4 invert" alt="Next.js" />
            <img src="https://simpleicons.org/icons/nodedotjs.svg" className="w-4 h-4 invert" alt="Node.js" />
            <img src="https://simpleicons.org/icons/cloudflareworkers.svg" className="w-4 h-4 invert" alt="Workers" />
          </div>
        </div>

        {/* CONNECTORS (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-1 relative">
          <svg className="w-full h-full" viewBox="0 0 100 400" preserveAspectRatio="none">
            <path d="M 0 100 Q 50 100 100 200" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="dark:text-white text-black opacity-10 animate-dash-flow" />
            <path d="M 0 200 Q 50 200 100 200" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="dark:text-white text-black opacity-10 animate-dash-flow" />
            <path d="M 0 300 Q 50 300 100 200" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="dark:text-white text-black opacity-10 animate-dash-flow" />
            
            <circle r="2" fill="currentColor" className="dark:text-white text-black">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 0 100 Q 50 100 100 200" />
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="currentColor" className="dark:text-white text-black">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M 0 200 Q 50 200 100 200" begin="0.5s" />
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="currentColor" className="dark:text-white text-black">
              <animateMotion dur="3s" repeatCount="indefinite" path="M 0 300 Q 50 300 100 200" begin="1s" />
              <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* CENTER: BANTAI ENGINE */}
        <div className="lg:col-span-4 flex items-center">
          <div className="w-full relative group">
            <div className="absolute -inset-1 dark:bg-gradient-to-r dark:from-white/20 bg-gradient-to-r from-black/20 to-transparent opacity-30 blur-xl group-hover:opacity-50 transition-opacity"></div>
            <div className="relative border-2 dark:border-white/10 border-black/10 dark:bg-black bg-white p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center justify-center w-full gap-3">
                <Image src="/logo.png" alt="Bantai" width={40} height={40} className='dark:invert' />

                  <span className="text-[12px] font-black dark:text-white text-black tracking-[0.2em] uppercase">BANTAI</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border dark:border-white/20 border-black/20 px-3 py-2 text-[10px] font-black uppercase flex items-center justify-between dark:bg-white/5 bg-black/5 relative overflow-hidden group/item">
                  <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover/item:translate-x-full transition-transform duration-500"></div>
                  <span className="dark:text-white text-black">Context (Zod)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[8px] dark:text-white/40 text-black/40">Validated</span>
                  </div>
                </div>
                <div className="border dark:border-white/20 border-black/20 px-3 py-2 text-[10px] font-black uppercase flex items-center justify-between dark:bg-white/5 bg-black/5 relative overflow-hidden group/item">
                  <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover/item:translate-x-full transition-transform duration-500"></div>
                  <span className="dark:text-white text-black">Rules</span>
                  <span className="text-[8px] dark:text-white/40 text-black/40 italic">Composable</span>
                </div>
                <div className="border dark:border-white/20 border-black/20 px-3 py-2 text-[10px] font-black uppercase flex items-center justify-between dark:bg-white/5 bg-black/5 relative overflow-hidden group/item">
                  <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover/item:translate-x-full transition-transform duration-500"></div>
                  <span className="dark:text-white text-black">Policy</span>
                  <span className="text-[8px] dark:text-white/40 text-black/40">v1.0.0</span>
                </div>
                <div className="border dark:border-white/20 border-black/20 px-3 py-2 text-[10px] font-black uppercase flex items-center justify-between dark:bg-white/5 bg-black/5 relative overflow-hidden group/item">
                  <div className="absolute inset-0 dark:bg-white/5 bg-black/5 -translate-x-full group-hover/item:translate-x-full transition-transform duration-500"></div>
                  <span className="dark:text-white text-black">Strategy</span>
                  <span className="text-[8px] dark:text-white/40 text-black/40 italic">Preemptive</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t dark:border-white/10 border-black/10 flex justify-between items-center">
                 <span className="text-[9px] font-mono dark:text-white/30 text-black/30 tracking-[0.2em] uppercase">Evaluating...</span>
                 <div className="flex gap-1">
                    <div className="w-1 h-1 dark:bg-white/20 bg-black/20"></div>
                    <div className="w-1 h-1 dark:bg-white/40 bg-black/40"></div>
                    <div className="w-1 h-1 dark:bg-white bg-black animate-pulse"></div>
                 </div>
              </div>
              <div className="absolute top-0 left-0 w-full h-px dark:bg-white/40 bg-black/40 animate-scan"></div>
            </div>
          </div>
        </div>

        {/* CONNECTORS (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-1 relative">
          <svg className="w-full h-full" viewBox="0 0 100 400" preserveAspectRatio="none">
            <path d="M 0 200 L 100 200" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="dark:text-white text-black opacity-10 animate-dash-flow" />
            <circle r="2" fill="currentColor" className="dark:text-white text-black">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 0 200 L 100 200" />
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* RIGHT: DECISION OUTPUT */}
        <div className="lg:col-span-3 flex flex-col justify-center gap-6">
          <div className="text-[9px] font-mono dark:text-white/30 text-black/30 uppercase tracking-[0.3em] mb-2 text-center">Explainable Decision</div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-green-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative border-2 border-green-500 bg-green-500/10 p-6 flex flex-col items-center text-center transition-all group-hover:bg-green-500/20">
              <div className="text-green-500 font-black text-3xl tracking-tighter uppercase mb-2">ALLOW</div>
              <div className="w-full h-px bg-green-500/20 my-4"></div>
              <div className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest mb-1">Status: OK</div>
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-tight leading-tight">User is of legal age</div>
            </div>
          </div>

          <div className="relative grayscale opacity-40 blur-[0.5px] hover:grayscale-0 hover:opacity-100 hover:blur-0 transition-all">
            <div className="border border-[#f87171]/40 bg-[#f87171]/5 p-4 flex flex-col items-center text-center">
              <div className="text-[#f87171] font-black text-xl tracking-tighter uppercase mb-1">DENY</div>
              <div className="text-[9px] font-bold dark:text-white/40 text-black/40 uppercase tracking-widest italic">Violation: age-verification</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-24 lg:pt-60 lg:pb-48 overflow-hidden bg-hex">
      <div className="absolute inset-0 bg-glow pointer-events-none"></div>

      <div className="relative max-w-[1400px] mx-auto px-6 sm:px-12">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center border border-[var(--border-muted)] px-3 py-1 mb-12 relative overflow-hidden bg-[var(--bg-secondary)]">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--text-primary)]/60">Logic-to-Decision Engine</span>
          </div>

          <h1 className="text-[clamp(2.5rem,10vw,140px)] font-bold text-[var(--text-primary)] tracking-[-0.05em] mb-8 leading-[0.85] uppercase font-heading">
            <span className="block">Turn complex logic</span>
            <span className="block relative text-outline">into clear decisions</span>
          </h1>
          
          <div className="w-full max-w-2xl border-t border-[var(--border-muted)] pt-8 mb-20">
             <p className="text-xl lg:text-2xl text-[var(--text-primary)]/60 leading-tight font-medium uppercase tracking-tighter font-heading">
               Bantai evaluates real-world inputs into <span className="text-[var(--text-primary)]">deterministic, explainable allow/deny decisions</span> with full TypeScript safety.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-0 w-full max-w-xl mb-12 relative z-30">
            <Link href="/docs" className="w-full sm:w-1/2">
            <button className="w-full py-6 dark:bg-white dark:text-black bg-black text-white font-black transition-all dark:hover:bg-white/90 hover:bg-black/90 uppercase tracking-[0.4em] text-[10px] border-2 dark:border-white border-black font-heading dark:shadow-[0_0_30px_rgba(255,255,255,0.1)] shadow-[0_0_30px_rgba(0,0,0,0.1)]">
              GET STARTED
            </button>
            </Link>
            <Link href="https://github.com/bosquejun/bantai" target="_blank" className="w-full sm:w-1/2">
            <button className="w-full py-6 bg-transparent border-y-2 border-r-2 border-l-2 sm:border-l-0 border-[var(--border-muted)] text-[var(--text-primary)] font-black transition-all hover:bg-[var(--bg-secondary)] uppercase tracking-[0.4em] text-[10px] font-heading">
              VIEW ON GITHUB
            </button>
            </Link>
          </div>

          <EvaluationFlow />
        </div>
      </div>
    </section>
  );
};

