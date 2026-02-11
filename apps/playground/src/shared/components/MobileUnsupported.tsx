import React from 'react';
import { Monitor, Smartphone, Layout } from 'lucide-react';

export const MobileUnsupported: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background p-8 text-center md:hidden">
      <div className="relative mb-8">
        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
        <div className="relative flex items-center justify-center gap-4 text-muted-foreground">
          <Smartphone size={48} strokeWidth={1.5} className="text-muted-foreground" />
          <div className="h-px w-12 bg-border" />
          <Monitor size={64} strokeWidth={1.5} className="text-primary" />
        </div>
      </div>
      
      <div className="max-w-xs space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Desktop Experience Required
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bantai Playground is a production-grade policy IDE designed for large screens and complex workflows.
        </p>
        <div className="pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-left p-3 rounded-lg bg-card border border-border">
            <Layout size={18} className="text-primary shrink-0" />
            <span className="text-[11px] text-foreground font-medium">
              Multi-pane layout requires at least 768px width.
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold pt-2">
            Please switch to a desktop device
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] text-muted-foreground font-mono">
        Bantai Playground v1.0.0
      </div>
    </div>
  );
};
