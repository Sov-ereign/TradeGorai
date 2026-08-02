import React from 'react';
import { ListOrdered, Zap, Layers, Briefcase, Activity, type LucideIcon } from 'lucide-react';

export type MobileTab = 'watchlist' | 'trade' | 'positions' | 'orders' | 'activity';

interface TabItem {
  id: MobileTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface MobileBottomNavProps {
  activeMobileTab: MobileTab;
  setActiveMobileTab: (tab: MobileTab) => void;
  openPositionsCount: number;
  pendingOrdersCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeMobileTab,
  setActiveMobileTab,
  openPositionsCount,
  pendingOrdersCount,
}) => {
  const tabs: TabItem[] = [
    { id: 'watchlist', label: 'Watchlist', icon: ListOrdered },
    { id: 'trade', label: 'Trade', icon: Zap },
    { 
      id: 'positions', 
      label: 'Positions', 
      icon: Layers, 
      count: openPositionsCount 
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: Briefcase, 
      count: pendingOrdersCount 
    },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0D111A]/95 backdrop-blur-md border-t border-[#1E2638] flex items-center justify-around px-2 z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeMobileTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all ${
              isActive
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-slate-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-[#0D111A]">
                  {tab.count}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
