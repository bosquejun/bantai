import Image from 'next/image';
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[var(--bg-primary)] border-t border-[var(--border-muted)] py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-24">
          <div className="max-w-xs">
          <div className="flex items-center space-x-2 group cursor-pointer mb-4">
          <div className="size-10 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-12">
            <Image src="/logo.png" alt="Bantai" width={40} height={40} className='dark:invert' />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-[0.3em] dark:text-white text-black uppercase leading-none">BANTAI</span>
          </div>
        </div>
            <p className="text-[10px] text-[var(--text-primary)]/40 font-bold leading-relaxed uppercase tracking-tight mb-8">
            TypeScript-first policy evaluation library for rule-based validation and decision-making
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-16 md:gap-24">
            <div className="flex flex-col space-y-6">
              <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em] mb-2">ENGINE</span>
              <a href="#" className="text-[10px] font-bold text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">GETTING STARTED</a>
              <a href="https://github.com/bosquejun/bantai" target="_blank" className="text-[10px] font-bold text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">GITHUB</a>
              <a href="#" className="text-[10px] font-bold text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">EXAMPLES</a>
            </div>
            <div className="flex flex-col space-y-6">
              <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em] mb-2">LEGAL</span>
              <span className="text-[10px] font-bold text-[var(--text-primary)]/20 uppercase tracking-widest cursor-default">MIT LICENSE</span>
              <span className="text-[10px] font-bold text-[var(--text-primary)]/20 uppercase tracking-widest cursor-default">CODE OF CONDUCT</span>
            </div>
          </div>
        </div>
        
        <div className="mt-40 pt-12 border-t border-[var(--border-muted)] flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="text-[9px] font-black text-[var(--text-primary)]/20 tracking-[0.4em] uppercase">
            &copy; {new Date().getFullYear()} BANTAI.DEV
          </div>
          <div className="flex space-x-12 text-[9px] font-black text-[var(--text-primary)]/20 tracking-[0.4em] uppercase">
            <a href="https://www.npmjs.com/package/@bantai-dev/core" target="_blank" className="hover:text-[var(--text-primary)] transition-colors">NPM_PACKAGE</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">REPORT_ISSUE</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

