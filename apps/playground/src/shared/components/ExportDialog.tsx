import React, { useState, useMemo } from 'react';
import { Copy, Download, Check, FileJson } from 'lucide-react';
import { Editor } from '@/features/editor/components/Editor';
import { Context } from '@/shared/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context: Context | undefined;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, context }) => {
  const [copied, setCopied] = useState(false);

  const exportData = useMemo(() => {
    if (!context) return '';
    const data = {
      name: context.name,
      definition: context.definition,
      rules: context.rules.map(r => ({ 
        name: r.name, 
        code: r.code, 
        enabled: r.enabled 
      })),
      policies: context.policies.map(p => ({ 
        name: p.name, 
        code: p.code, 
        enabled: p.enabled 
      })),
      exportedAt: new Date().toISOString(),
      version: "1.0.0"
    };
    return JSON.stringify(data, null, 2);
  }, [context]);

  if (!context) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bantai-${context.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl h-[80vh] max-h-[800px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileJson size={20} />
            </div>
            <div>
              <DialogTitle>Export Bundle</DialogTitle>
              <DialogDescription className="text-[10px] uppercase font-extrabold tracking-widest">
                {context.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-background relative flex flex-col border rounded-lg overflow-hidden">
          <div className="absolute top-4 right-6 z-10">
            <Button 
              onClick={handleCopy}
              variant={copied ? "default" : "outline"}
              size="sm"
              className={copied ? "bg-green-600 hover:bg-green-600" : ""}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Payload'}
            </Button>
          </div>
          <div className="flex-1 relative">
            <Editor 
              language="json"
              value={exportData}
              options={{
                readOnly: true,
                lineNumbers: 'on',
                folding: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground max-w-[320px] leading-relaxed italic text-center sm:text-left">
            This bundle contains the full schema, ruleset, and policies for the current context.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Close
            </Button>
            <Button onClick={handleDownload} className="flex-1 sm:flex-none">
              <Download size={16} />
              Download JSON
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
