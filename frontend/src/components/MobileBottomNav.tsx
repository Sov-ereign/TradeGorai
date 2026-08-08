import React from 'react';
import { Bookmark, ClipboardList, Briefcase, Layers, User } from 'lucide-react';

export type MobileTab = 'watchlist' | 'orders' | 'portfolio' | 'baskets' | 'profile';

interface TabItem {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'orders', label: 'Orders', icon: ClipboardList, count: pendingOrdersCount },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, count: openPositionsCount },
    { id: 'baskets', label: 'Baskets', icon: Layers },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0B0E14] border-t border-[#1E2638] flex items-center justify-around px-1 z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeMobileTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all ${
              isActive
                ? 'text-[#387ED1] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#387ED1]' : 'text-slate-400'}`} />
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#387ED1] text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-[#0B0E14]">
                  {tab.count}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
            {isActive && (
              <span className="absolute top-0 w-8 h-0.5 bg-[#387ED1] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
