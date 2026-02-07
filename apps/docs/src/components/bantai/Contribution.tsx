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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">
        {/* Show Product Hunt badge based on theme */}
        <a
          href="https://www.producthunt.com/products/bantai?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-bantai"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden dark:block"
        >
          <img
            alt="Bantai - TypeScript-first policy library for rule-based decisions | Product Hunt"
            width="250"
            height="54"
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1072407&amp;theme=dark&amp;t=1770311428895"
          />
        </a>

        <a
          href="https://www.producthunt.com/products/bantai?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-bantai"
          target="_blank"
          rel="noopener noreferrer"
          className="block dark:hidden"
        >
          <img
            alt="Bantai - TypeScript-first policy library for rule-based decisions | Product Hunt"
            width="250"
            height="54"
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1072407&amp;theme=light&amp;t=1770311428895"
          />
        </a>
        </div>
      </div>
    </section>
  );
};

