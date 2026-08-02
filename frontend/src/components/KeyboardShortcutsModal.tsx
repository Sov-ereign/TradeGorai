import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'B', action: 'Focus BUY order in Order Panel' },
    { key: 'S', action: 'Focus SELL order in Order Panel' },
    { key: '/', action: 'Focus Stock Search bar in Top Navigation' },
    { key: 'Esc', action: 'Close active modals / clears selection' },
    { key: 'Tab', action: 'Cycle between Product (CNC / MIS) & Order Type' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-md p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-emerald-400" />
          Terminal Keyboard Shortcuts
        </h3>

        <div className="space-y-2 mb-4">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D111A] border border-[#1E2638] text-xs"
            >
              <span className="text-slate-300 font-medium">{s.action}</span>
              <kbd className="px-2 py-1 rounded bg-[#182030] text-emerald-400 border border-emerald-500/40 font-mono text-[11px] font-bold">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#181F2C] hover:bg-[#20293A] text-slate-200 py-2 rounded-lg text-xs font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
