import React from 'react';
import { 
  LayoutDashboard, 
  ListOrdered, 
  Briefcase, 
  PieChart, 
  Layers, 
  Bot, 
  Settings, 
  TrendingUp,
  ShieldCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'watchlist', label: 'Watchlist', icon: ListOrdered },
    { id: 'orders', label: 'Orders', icon: Briefcase },
    { id: 'positions', label: 'Positions', icon: Layers },
    { id: 'holdings', label: 'Holdings', icon: PieChart },
    { 
      id: 'strategy', 
      label: 'Strategy Builder', 
      icon: Bot, 
      badge: 'V2 Soon',
      disabled: true 
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1E2638]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
                  TradeGorai <span className="text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50">AI</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Algorithmic Trading</p>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg bg-[#181F2C]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    setActiveTab(item.id);
                    setMobileOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-xs font-medium transition-all ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-blue-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151C2A]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {(!collapsed || mobileOpen) && (
                  <span className="flex-1 text-left truncate flex items-center justify-between">
                    {item.label}
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Broker Connection Card */}
      {(!collapsed || mobileOpen) && (
        <div className="p-3 m-2 rounded-xl bg-[#121721] border border-[#1E2638]">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Zerodha Kite API</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Live Trading Engine Active (v4.2 SDK)
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside
        className={`hidden lg:flex h-screen bg-[#0D111A] border-r border-[#1E2638] flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible when hamburger is toggled) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[80vw] bg-[#0D111A] border-r border-[#1E2638] h-full shadow-2xl z-50 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
