import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { PortfolioCard } from './components/PortfolioCard';
import { WatchlistPanel } from './components/WatchlistPanel';
import { OrderEntryPanel } from './components/OrderEntryPanel';
import { PositionsPanel } from './components/PositionsPanel';
import { OrdersPanel } from './components/OrdersPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { NotificationToast } from './components/NotificationToast';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { MobileBottomNav, type MobileTab } from './components/MobileBottomNav';

import type { Stock, Order, Position, PortfolioMetrics, ActivityItem, NotificationItem } from './types/trading';
import { getWatchlist, getOrders, getPositions, getPortfolioSummary } from './services/api';
import { wsClient } from './services/websocket';

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
    today_pnl: 2340.00,
    today_pnl_percent: 1.18,
    overall_pnl: 45210.00,
    overall_pnl_percent: 9.42,
    available_margin: 185420.50,
    used_margin: 64580.00,
    capital: 250000.00,
    total_investment: 480000.00,
  });

  // System & Logs
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Initial Data Fetching
  const loadDashboardData = async () => {
    try {
      const [wlData, ordData, posData, portData] = await Promise.all([
        getWatchlist(),
        getOrders(),
        getPositions(),
        getPortfolioSummary(),
      ]);

      setWatchlist(wlData);
      if (wlData.length > 0 && !selectedStock) {
        setSelectedStock(wlData[0]);
      }
      setOrders(ordData);
      setPositions(posData);
      setPortfolio(portData);
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Connect WebSocket live tick stream
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((ticks) => {
      setWsConnected(true);

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
          if (pos.status === 'OPEN' && ticks[pos.symbol]) {
            const currentLtp = ticks[pos.symbol].ltp;
            const diff = currentLtp - pos.avg_price;
            const pnl = Number((diff * pos.qty).toFixed(2));
            const pnl_percent = Number(((diff / pos.avg_price) * 100).toFixed(2));
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

    // Auto dismiss after 4 seconds
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
    // On mobile, auto-switch to trade tab when user selects a stock
    if (window.innerWidth < 1024) {
      setActiveMobileTab('trade');
    }
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

        {/* Dashboard Content Container */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
          {/* Top Portfolio Summary Bar */}
          <PortfolioCard portfolio={portfolio} />

          {/* DESKTOP LAYOUT (Screen width >= 1024px) */}
          <div className="hidden lg:grid grid-cols-12 gap-4 h-[calc(100vh-170px)] min-h-[680px]">
            {/* Left Grid: Watchlist Panel (4 cols) */}
            <div className="col-span-4 h-full">
              <WatchlistPanel
                watchlist={watchlist}
                selectedStock={selectedStock}
                onSelectStock={handleSelectStock}
                onWatchlistUpdated={loadDashboardData}
              />
            </div>

            {/* Middle Grid: Order Entry Panel & Activity Stream (4 cols) */}
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

            {/* Right Grid: Positions & Orders Book (4 cols) */}
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

          {/* MOBILE LAYOUT (Screen width < 1024px) */}
          <div className="lg:hidden h-[calc(100vh-230px)] min-h-[500px]">
            {activeMobileTab === 'watchlist' && (
              <WatchlistPanel
                watchlist={watchlist}
                selectedStock={selectedStock}
                onSelectStock={handleSelectStock}
                onWatchlistUpdated={loadDashboardData}
              />
            )}

            {activeMobileTab === 'trade' && (
              <OrderEntryPanel
                selectedStock={selectedStock}
                onOrderPlaced={handleOrderPlaced}
              />
            )}

            {activeMobileTab === 'positions' && (
              <PositionsPanel
                positions={positions}
                onPositionsUpdated={handlePositionsUpdated}
              />
            )}

            {activeMobileTab === 'orders' && (
              <OrdersPanel
                orders={orders}
                onOrdersUpdated={handleOrdersUpdated}
                onDuplicateOrder={handleDuplicateOrder}
              />
            )}

            {activeMobileTab === 'activity' && (
              <ActivityFeed activities={activities} />
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
