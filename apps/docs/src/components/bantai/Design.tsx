import React from 'react';

export const Design: React.FC = () => {
  return (
    <section className="py-40 bg-white border-b border-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div>
            <span className="text-black/50 font-mono text-[10px] font-black uppercase tracking-[0.5em] mb-6 block">PHILOSOPHY</span>
            <h2 className="text-5xl font-black text-black mb-12 leading-[0.9] tracking-tighter uppercase">POLICY-FIRST <br /> DESIGN.</h2>
            <div className="space-y-6">
                <p className="text-black/85 text-lg leading-relaxed font-medium">
                  Bantai treats policies as the single source of truth. By decoupling definitions from implementation, you ensure auditable behavior across all environments.
                </p>
                <ul className="space-y-4 pt-4">
                    {['Zero hardcoded limits', 'Auditable request logic', 'Environment parity', 'Predictable scaling'].map(b => (
                        <li key={b} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-black">
                            <div className="w-2 h-2 bg-black"></div>
                            {b}
                        </li>
                    ))}
                </ul>
            </div>
          </div>

          <div className="space-y-12">
            <div className="border-2 border-black p-10 hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/50 block mb-4">MODE_01</span>
                <h4 className="text-2xl font-black uppercase tracking-tight mb-4 text-black">LIBRARY MODE</h4>
                <p className="text-sm text-black/85 leading-relaxed font-semibold uppercase tracking-tight">Fully flexible, code-driven usage. Best for specific request guards inside your existing application logic.</p>
            </div>
            <div className="border-2 border-black p-10 bg-black text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-4">MODE_02</span>
                <h4 className="text-2xl font-black uppercase tracking-tight mb-4 text-white">FRAMEWORK MODE (BETA)</h4>
                <p className="text-sm text-white/90 leading-relaxed font-semibold uppercase tracking-tight">Config-driven, centralized control. Best for platform teams managing multiple services with global policies.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

