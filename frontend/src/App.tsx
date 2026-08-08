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
import { Key, Database, ShieldCheck, CheckCircle2, User, ExternalLink } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('watchlist');
  
  // Data States
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

  // Initial Data Fetching & Session Restore
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
      console.error('Failed loading dashboard data:', err);
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

      // Update Open Positions P&Ls with ticks
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
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          const searchInput = document.querySelector('header input') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addNotification = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `notif-${Date.now()}`;
    const newNotif: NotificationItem = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 5));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const addActivity = (message: string, type: ActivityItem['type'] = 'ORDER', status: ActivityItem['status'] = 'success') => {
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      status,
    };
    setActivities((prev) => [newAct, ...prev].slice(0, 50));
  };

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleOrderPlaced = (msg: string) => {
    addNotification('Order Processed', msg, msg.includes('🔴') ? 'error' : 'success');
    addActivity(msg, 'ORDER', msg.includes('🔴') ? 'error' : 'success');
    loadDashboardData();
  };

  const handlePositionsUpdated = (msg: string) => {
    addNotification('Position Update', msg, 'info');
    addActivity(msg, 'TRADE', 'info');
    loadDashboardData();
  };

  const handleOrdersUpdated = (msg: string) => {
    addNotification('Order Book Update', msg, 'info');
    addActivity(msg, 'ORDER', 'info');
    loadDashboardData();
  };

  const handleDuplicateOrder = (order: Order) => {
    const match = watchlist.find((s) => s.symbol === order.symbol);
    if (match) {
      handleSelectStock(match);
      addNotification('Order Pre-filled', `Selected ${order.symbol} for order entry`, 'info');
    }
  };

  const handleSaveSettings = async () => {
    try {
      localStorage.setItem('zerodha_api_key', apiKeyInput.trim());
      localStorage.setItem('zerodha_api_secret', apiSecretInput.trim());
      await saveZerodhaCredentials(apiKeyInput, apiSecretInput);
      setSettingsMsg('✅ Zerodha API Credentials updated & saved locally!');
      loadDashboardData();
    } catch (err: any) {
      setSettingsMsg(`Error updating credentials: ${err.message}`);
    }
  };

  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex h-screen bg-[#0B0E14] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pb-16 lg:pb-0">
        {/* Top Navbar */}
        <TopNav
          onSelectStock={handleSelectStock}
          openKeyboardModal={() => setShowShortcutsModal(true)}
          wsConnected={wsConnected}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto">

          {/* DESKTOP LAYOUT VIEWS (lg:flex) */}
          <div className="hidden lg:block h-[calc(100vh-100px)] min-h-[680px]">
            {/* Dashboard View (Multi-grid layout) */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-4 h-full">
                <PortfolioCard portfolio={portfolio} />
                <div className="grid grid-cols-12 gap-4 flex-1">
                  <div className="col-span-4 h-full">
                    <WatchlistPanel
                      watchlist={watchlist}
                      selectedStock={selectedStock}
                      onSelectStock={handleSelectStock}
                      onWatchlistUpdated={loadDashboardData}
                    />
                  </div>
                  <div className="col-span-4 flex flex-col gap-4 h-full">
                    <div className="flex-1 min-h-[420px]">
                      <OrderEntryPanel
                        selectedStock={selectedStock}
                        onOrderPlaced={handleOrderPlaced}
                      />
                    </div>
                    <div className="h-44">
                      <ActivityFeed activities={activities} />
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col gap-4 h-full">
                    <div className="flex-1 min-h-[280px]">
                      <PositionsPanel
                        positions={positions}
                        onPositionsUpdated={handlePositionsUpdated}
                      />
                    </div>
                    <div className="flex-1 min-h-[280px]">
                      <OrdersPanel
                        orders={orders}
                        onOrdersUpdated={handleOrdersUpdated}
                        onDuplicateOrder={handleDuplicateOrder}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Strategy Algo Studio Page */}
            {activeTab === 'strategy' && (
              <div className="h-full">
                <StrategyStudio />
              </div>
            )}

            {/* Watchlist Full Page */}
            {activeTab === 'watchlist' && (
              <div className="h-full max-w-4xl mx-auto">
                <WatchlistPanel
                  watchlist={watchlist}
                  selectedStock={selectedStock}
                  onSelectStock={handleSelectStock}
                  onWatchlistUpdated={loadDashboardData}
                />
              </div>
            )}

            {/* Orders Book Full Page */}
            {activeTab === 'orders' && (
              <div className="h-full">
                <OrdersPanel
                  orders={orders}
                  onOrdersUpdated={handleOrdersUpdated}
                  onDuplicateOrder={handleDuplicateOrder}
                />
              </div>
            )}

            {/* Positions Full Page with Portfolio Card */}
            {activeTab === 'positions' && (
              <div className="flex flex-col gap-4 h-full">
                <PortfolioCard portfolio={portfolio} />
                <div className="flex-1">
                  <PositionsPanel
                    positions={positions}
                    onPositionsUpdated={handlePositionsUpdated}
                  />
                </div>
              </div>
            )}

            {/* Holdings Full Page */}
            {activeTab === 'holdings' && (
              <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-6 h-full">
                <h2 className="text-base font-bold text-slate-100 mb-4">Portfolio Holdings (CNC Long-term Assets)</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
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

            {/* Settings Full Page */}
            {activeTab === 'settings' && (
              <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-6 max-w-2xl mx-auto space-y-6">
                <h2 className="text-base font-bold text-slate-100 border-b border-[#1E2638] pb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#387ED1]" />
                  TradeGorai Terminal Settings
                </h2>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#387ED1]" />
                    Zerodha Kite Connect Credentials
                  </h3>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">API Key</label>
                    <input
                      type="text"
                      placeholder="Enter Kite API Key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-[#387ED1] rounded-lg p-2.5 text-xs font-mono text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">API Secret</label>
                    <input
                      type="password"
                      placeholder="Enter Kite API Secret..."
                      value={apiSecretInput}
                      onChange={(e) => setApiSecretInput(e.target.value)}
                      className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-[#387ED1] rounded-lg p-2.5 text-xs font-mono text-slate-100 outline-none"
                    />
                  </div>

                  {settingsMsg && (
                    <div className="p-3 rounded-lg bg-[#182030] border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                      {settingsMsg}
                    </div>
                  )}

                  <button
                    onClick={handleSaveSettings}
                    className="bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold py-2.5 px-6 rounded-lg text-xs transition-all shadow-md shadow-[#387ED1]/30"
                  >
                    Save API Settings
                  </button>
                </div>

                <div className="pt-4 border-t border-[#1E2638] space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    Database & Storage Status
                  </h3>
                  <div className="p-3 bg-[#0D111A] border border-[#1E2638] rounded-xl text-xs flex justify-between items-center">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      MongoDB Atlas Active
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ZERODHA KITE MOBILE LAYOUT VIEWS (< 1024px) */}
          <div className="lg:hidden h-[calc(100vh-170px)] min-h-[500px]">
            {activeMobileTab === 'watchlist' && (
              <WatchlistPanel
                watchlist={watchlist}
                selectedStock={selectedStock}
                onSelectStock={handleSelectStock}
                onWatchlistUpdated={loadDashboardData}
              />
            )}

            {activeMobileTab === 'orders' && (
              <OrdersPanel
                orders={orders}
                onOrdersUpdated={handleOrdersUpdated}
                onDuplicateOrder={handleDuplicateOrder}
              />
            )}

            {activeMobileTab === 'portfolio' && (
              <div className="flex flex-col gap-3 h-full">
                <PortfolioCard portfolio={portfolio} />
                <div className="flex-1 overflow-hidden">
                  <PositionsPanel
                    positions={positions}
                    onPositionsUpdated={handlePositionsUpdated}
                  />
                </div>
              </div>
            )}

            {activeMobileTab === 'baskets' && (
              <StrategyStudio />
            )}

            {activeMobileTab === 'profile' && (
              <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#387ED1] to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{zerodhaStatus.user_name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{zerodhaStatus.client_id}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0D111A] border border-[#1E2638] rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                    <span className="text-slate-400">Broker:</span>
                    <span className="font-semibold text-slate-200">Zerodha Broking Ltd.</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                    <span className="text-slate-400">Status:</span>
                    <span className={`font-semibold ${zerodhaStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {zerodhaStatus.connected ? '🟢 Zerodha Live Active' : '🟡 Disconnected / Sandbox'}
                    </span>
                  </div>
                </div>

                <a
                  href={zerodhaStatus.login_url || `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKeyInput || 'YOUR_KEY'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#387ED1]/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  Login via Zerodha OAuth (Live Session)
                </a>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeMobileTab={activeMobileTab}
        setActiveMobileTab={setActiveMobileTab}
        openPositionsCount={openPositionsCount}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Notification Toast Layer */}
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}

export default App;
