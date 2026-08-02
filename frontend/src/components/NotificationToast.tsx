import React from 'react';
import { Bell, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { NotificationItem } from '../types/trading';

interface NotificationToastProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transform transition-all duration-300 animate-bounce-once ${
            n.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
              : n.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
              : 'bg-[#121721]/95 border-[#1E2638] text-slate-100'
          }`}
        >
          {n.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : n.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Bell className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs">{n.title}</h4>
            <p className="text-[11px] opacity-90 leading-tight mt-0.5">{n.message}</p>
          </div>

          <button
            onClick={() => onDismiss(n.id)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
