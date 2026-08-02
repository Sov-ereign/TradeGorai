import React from 'react';
import { Activity, AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { ActivityItem } from '../types/trading';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between bg-[#0E131D]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Activity & Execution Stream
          </h2>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Live Logs</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No system events logged yet.
          </div>
        ) : (
          activities.map((act) => {
            const isSuccess = act.status === 'success';
            const isError = act.status === 'error';
            const isWarning = act.status === 'warning';

            return (
              <div
                key={act.id}
                className="p-2 rounded-lg bg-[#0D111A] border border-[#1E2638] flex items-start gap-2 text-xs transition-colors hover:border-[#2A354D]"
              >
                {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                {isWarning && <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                {!isSuccess && !isError && !isWarning && (
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-[11px] text-slate-200">{act.type}</span>
                    <span className="text-[9px] font-mono text-slate-500">{act.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">{act.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
