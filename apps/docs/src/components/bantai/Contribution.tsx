import React from 'react';

export const Contribution: React.FC = () => {
  return (
    <section className="py-40 bg-background text-foreground relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="flex justify-center gap-4 mb-12">
          <img src="https://img.shields.io/badge/License-MIT-black.svg?style=flat-square" alt="MIT License" />
          <img src="https://img.shields.io/npm/v/@bantai-dev/core?color=black&style=flat-square" alt="NPM Version" />
        </div>
        <span className="text-foreground/20 font-mono text-[10px] font-black uppercase tracking-[0.5em] mb-8 block">TRUST_SIGNALS</span>
        <h2 className="text-4xl lg:text-7xl font-black mb-8 uppercase tracking-tighter leading-none">BUILT IN <br />THE OPEN.</h2>
        <p className="text-xl text-foreground/50 mb-16 uppercase tracking-tight font-bold max-w-2xl mx-auto">
          Bantai is 100% open-source and MIT licensed. We believe critical decision logic should be transparent and auditable by everyone.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a href="https://github.com/bosquejun/bantai" target="_blank" className="w-full sm:w-auto px-12 py-5 bg-background text-foreground invert font-black hover:bg-foreground hover:text-background transition-all uppercase tracking-[0.2em] text-[10px] border-2 border-foreground">
            CONTRIBUTE ON GITHUB
          </a>
          <a href="#" className="w-full sm:w-auto px-12 py-5 border-2 border-foreground text-foreground font-black hover:bg-foreground hover:text-background transition-all uppercase tracking-[0.2em] text-[10px]">
            INSTALL VIA NPM
          </a>
        </div>
      </div>
    </section>
  );
};

