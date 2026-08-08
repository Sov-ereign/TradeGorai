import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { PortfolioCard } from './components/PortfolioCard';
import { WatchlistPanel } from './components/WatchlistPanel';
import { OrderEntryPanel } from './components/OrderEntryPanel';
import { PositionsPanel } from './components/PositionsPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { StrategyStudio } from './components/StrategyStudio';
import { NotificationToast } from './components/NotificationToast';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { MobileBottomNav, type MobileTab } from './components/MobileBottomNav';

import type { Stock, Order, Position, PortfolioMetrics, ActivityItem, NotificationItem } from './types/trading';
import { getWatchlists, getOrders, getPositions, getPortfolioSummary, saveZerodhaCredentials, getZerodhaStatus } from './services/api';
import { wsClient } from './services/websocket';
import { Key, ShieldCheck, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('watchlist');
  
  // Clean Data States directly driven by REST API & Server Sockets
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioMetrics>({
    today_pnl: 0.00,
    today_pnl_percent: 0.00,
    overall_pnl: 0.00,
    overall_pnl_percent: 0.00,
    available_margin: 0.00,
    used_margin: 0.00,
    capital: 0.00,
    total_investment: 0.00,
  });

  // Settings State
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('zerodha_api_key') || '');
  const [apiSecretInput, setApiSecretInput] = useState(() => localStorage.getItem('zerodha_api_secret') || '');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [zerodhaStatus, setZerodhaStatus] = useState<any>({ connected: false, mock_mode: true });

  // System & Logs
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Check URL parameters for OAuth Login Token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('zerodha') === 'connected') {
      const token = params.get('token');
      if (token) {
        localStorage.setItem('zerodha_access_token', token);
      }
      addNotification('Zerodha OAuth Connected', 'Successfully logged in to live Zerodha session!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Fresh Dashboard Data from REST Backend
  const loadDashboardData = async () => {
    try {
      const savedKey = localStorage.getItem('zerodha_api_key');
      const savedSecret = localStorage.getItem('zerodha_api_secret');
      const savedToken = localStorage.getItem('zerodha_access_token');
      if (savedKey && savedSecret) {
        await saveZerodhaCredentials(savedKey, savedSecret, savedToken || undefined).catch(() => {});
      }

      const [groups, ordData, posData, portData, zStatus] = await Promise.all([
        getWatchlists(),
        getOrders(),
        getPositions(),
        getPortfolioSummary(),
        getZerodhaStatus(),
      ]);

      const flatWatchlist = groups.length > 0 ? groups[0].items : [];
      setWatchlist(flatWatchlist);
      if (flatWatchlist.length > 0 && !selectedStock) {
        setSelectedStock(flatWatchlist[0]);
      }

      setOrders(ordData);
      setPositions(posData);
      setPortfolio(portData);
      setZerodhaStatus(zStatus);
    } catch (err) {
      console.error('Failed loading dashboard data from backend API:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Connect WebSocket tick stream & virtual trigger events
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((data) => {
      setWsConnected(true);

      // Check Virtual Trigger Notifications
      if (data.type === 'VIRTUAL_TRIGGER') {
        addNotification(
          data.trigger_type === 'TARGET' ? '🎯 Virtual Target Triggered' : '🛡️ Virtual Stop Loss Triggered',
          data.message,
          data.trigger_type === 'TARGET' ? 'success' : 'warning'
        );
        addActivity(data.message, 'ORDER', 'info');
        loadDashboardData();
        return;
      }

      const ticks = data.ticks || {};

      // Update Watchlist items with new tick prices
      setWatchlist((prevWl) =>
        prevWl.map((item) => {
          if (ticks[item.symbol]) {
            const tick = ticks[item.symbol];
            return {
              ...item,
              ltp: tick.ltp,
              high: tick.high,
              low: tick.low,
            };
          }
          return item;
        })
      );

      // Update Active Selected Stock if tick matches
      setSelectedStock((prevSelected) => {
        if (prevSelected && ticks[prevSelected.symbol]) {
          return {
            ...prevSelected,
            ltp: ticks[prevSelected.symbol].ltp,
          };
        }
        return prevSelected;
      });

      // Update Open Positions P&Ls with live ticks
      setPositions((prevPos) =>
        prevPos.map((pos) => {
          if (pos.status === 'OPEN' && ticks[pos.symbol] && ticks[pos.symbol].ltp !== undefined) {
            const currentLtp = ticks[pos.symbol].ltp;
            const avgPrice = pos.avg_price || currentLtp || 1;
            const diff = currentLtp - avgPrice;
            const pnl = Number((diff * (pos.qty || 1)).toFixed(2));
            const pnl_percent = Number(((diff / avgPrice) * 100).toFixed(2));
            return {
              ...pos,
              current_price: currentLtp,
              pnl,
              unrealized_pnl: pnl,
              pnl_percent,
            };
          }
          return pos;
        })
      );
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newNotif: NotificationItem = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addActivity = (
    message: string, 
    type: 'ORDER' | 'TRADE' | 'BROKER' | 'ERROR' | 'SYSTEM' = 'SYSTEM', 
    status: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const newActivity: ActivityItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
      status,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleOrderPlaced = (orderMsg: string) => {
    addNotification('Order Execution', orderMsg, orderMsg.includes('🔴') ? 'error' : 'success');
    addActivity(orderMsg, 'ORDER', orderMsg.includes('🔴') ? 'error' : 'success');
    loadDashboardData();
  };

  const handleSaveCredentials = async () => {
    if (!apiKeyInput || !apiSecretInput) {
      setSettingsMsg('⚠️ Please enter both API Key and API Secret.');
      return;
    }
    try {
      localStorage.setItem('zerodha_api_key', apiKeyInput);
      localStorage.setItem('zerodha_api_secret', apiSecretInput);
      await saveZerodhaCredentials(apiKeyInput, apiSecretInput);
      setSettingsMsg('🟢 Zerodha credentials saved successfully!');
      addNotification('Settings Saved', 'Zerodha API Key and Secret updated', 'success');
      loadDashboardData();
    } catch (err: any) {
      setSettingsMsg(`🔴 Save failed: ${err.message || 'Error connecting to Zerodha'}`);
    }
  };

  const handleZerodhaOAuthLogin = () => {
    const apiKey = apiKeyInput || localStorage.getItem('zerodha_api_key');
    if (!apiKey) {
      setSettingsMsg('⚠️ Please enter your Zerodha API Key first.');
      return;
    }
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.location.href = `${backendUrl}/api/zerodha/login-url?api_key=${apiKey}`;
  };

  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex h-screen bg-[#0B0E14] text-slate-100 font-sans antialiased overflow-hidden">
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      {/* Toast Notifications */}
      <NotificationToast notifications={notifications} onDismiss={removeNotification} />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Nav */}
        <TopNav
          onSelectStock={setSelectedStock}
          openKeyboardModal={() => setShowShortcutsModal(true)}
          wsConnected={wsConnected}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 pb-20 md:pb-4">
          {/* Main Dashboard Layout */}
          {activeTab === 'dashboard' && (
            <>
              {/* Portfolio Balance & Profit Banner */}
              <PortfolioCard portfolio={portfolio} />

              {/* Core 3-Column Trading Terminal */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[580px]">
                {/* Watchlist Panel (Left Column - 4 Cols) */}
                <div className="lg:col-span-4 h-[450px] lg:h-full">
                  <WatchlistPanel
                    watchlist={watchlist}
                    selectedStock={selectedStock}
                    onSelectStock={setSelectedStock}
                    onWatchlistUpdated={loadDashboardData}
                  />
                </div>

                {/* Order Execution Panel (Middle Column - 4 Cols) */}
                <div className="lg:col-span-4 h-auto lg:h-full">
                  <OrderEntryPanel
                    selectedStock={selectedStock}
                    onOrderPlaced={handleOrderPlaced}
                  />
                </div>

                {/* Open Positions & Active Orders Tabs (Right Column - 4 Cols) */}
                <div className="lg:col-span-4 h-[500px] lg:h-full flex flex-col gap-4">
                  <div className="flex-1 min-h-0">
                    <PositionsPanel positions={positions} onPositionsUpdated={loadDashboardData} />
                  </div>
                  <div className="flex-1 min-h-0">
                    <OrdersPanel
                      orders={orders}
                      onOrdersUpdated={loadDashboardData}
                      onDuplicateOrder={(ord) => setSelectedStock({ symbol: ord.symbol, name: ord.symbol, ltp: ord.price, change: 0, high: ord.price, low: ord.price, starred: false })}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Activity & Execution Logs */}
              <ActivityFeed activities={activities} />
            </>
          )}

          {/* Dedicated Full Page Views */}
          {activeTab === 'watchlist' && (
            <div className="h-[calc(100vh-140px)]">
              <WatchlistPanel
                watchlist={watchlist}
                selectedStock={selectedStock}
                onSelectStock={setSelectedStock}
                onWatchlistUpdated={loadDashboardData}
              />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="h-[calc(100vh-140px)]">
              <OrdersPanel
                orders={orders}
                onOrdersUpdated={loadDashboardData}
                onDuplicateOrder={(ord) => setSelectedStock({ symbol: ord.symbol, name: ord.symbol, ltp: ord.price, change: 0, high: ord.price, low: ord.price, starred: false })}
              />
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="h-[calc(100vh-140px)]">
              <PositionsPanel positions={positions} onPositionsUpdated={loadDashboardData} />
            </div>
          )}

          {activeTab === 'strategy' && <StrategyStudio />}

          {/* Holdings Full Page */}
          {activeTab === 'holdings' && (
            <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-6 h-full">
              <h2 className="text-base font-bold text-slate-100 mb-4">Portfolio Holdings (CNC Long-term Assets)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0D111A] border border-[#1E2638] p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Total Book Value</span>
                  <span className="text-lg font-bold font-mono text-slate-100">₹{(portfolio.total_investment ?? 0).toFixed(2)}</span>
                </div>
                <div className="bg-[#0D111A] border border-[#1E2638] p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Current Value</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">₹{((portfolio.total_investment ?? 0) + (portfolio.overall_pnl ?? 0)).toFixed(2)}</span>
                </div>
                <div className="bg-[#0D111A] border border-[#1E2638] p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Total Holdings Return</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">+₹{(portfolio.overall_pnl ?? 0).toFixed(2)} ({(portfolio.overall_pnl_percent ?? 0).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-[#1E2638] rounded-xl">
                Executing CNC equity orders directly accumulates long-term holdings in your Zerodha Demat account.
              </div>
            </div>
          )}

          {/* Settings & Zerodha Integration Center */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-[#121721] border border-[#1E2638] rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E2638]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-[#387ED1]/10 text-[#387ED1]">
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Zerodha Kite Connect Credentials</h2>
                      <p className="text-xs text-slate-400">Configure your official Zerodha API Key & Secret for live trading & account sync.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      zerodhaStatus.connected
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {zerodhaStatus.connected ? `Connected (${zerodhaStatus.client_id})` : 'Paper Trading / Off-Market Mode'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                      API Key
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 99x88y77z66a55b"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-[#387ED1] rounded-xl p-3 text-xs text-slate-100 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                      API Secret
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••"
                      value={apiSecretInput}
                      onChange={(e) => setApiSecretInput(e.target.value)}
                      className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-[#387ED1] rounded-xl p-3 text-xs text-slate-100 font-mono outline-none"
                    />
                  </div>

                  {settingsMsg && (
                    <div className="p-3 rounded-xl bg-[#0D111A] border border-[#1E2638] text-xs font-semibold text-slate-200">
                      {settingsMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleSaveCredentials}
                      className="px-5 py-2.5 rounded-xl bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold text-xs shadow-lg transition-all"
                    >
                      Save Credentials
                    </button>

                    <button
                      onClick={handleZerodhaOAuthLogin}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Login with Zerodha Kite (OAuth)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeMobileTab={activeMobileTab}
          setActiveMobileTab={(tab: MobileTab) => {
            setActiveMobileTab(tab);
            if (tab === 'watchlist') setActiveTab('dashboard');
            else if (tab === 'portfolio') setActiveTab('holdings');
          }}
          openPositionsCount={openPositionsCount}
          pendingOrdersCount={pendingOrdersCount}
        />
      </div>
    </div>
  );
}
