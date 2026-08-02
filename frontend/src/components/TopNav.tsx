import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Wifi, 
  WifiOff, 
  Activity, 
  User, 
  Keyboard, 
  X,
  ExternalLink,
  Key,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { searchStocks, getZerodhaStatus, saveZerodhaCredentials } from '../services/api';
import type { Stock } from '../types/trading';

interface TopNavProps {
  onSelectStock: (stock: Stock) => void;
  openKeyboardModal: () => void;
  wsConnected: boolean;
  onToggleMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onSelectStock,
  openKeyboardModal,
  wsConnected,
  onToggleMobileSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [zerodhaStatus, setZerodhaStatus] = useState<any>({
    connected: false,
    mock_mode: true,
    user_name: 'Pro Trader',
    client_id: 'ZF8921',
    login_url: ''
  });

  const refreshStatus = () => {
    getZerodhaStatus().then((data) => {
      setZerodhaStatus(data);
      if (data.login_url) {
        setSaveMessage('Credentials saved! Click "Login via Zerodha" to complete OAuth flow.');
      }
    }).catch(console.error);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSaveCredentials = async () => {
    if (!apiKeyInput.trim() || !apiSecretInput.trim()) {
      setSaveMessage('Please enter both Zerodha API Key and API Secret!');
      return;
    }
    try {
      await saveZerodhaCredentials(apiKeyInput, apiSecretInput);
      setSaveMessage('✅ Credentials saved successfully!');
      refreshStatus();
    } catch (err: any) {
      setSaveMessage(`Error saving credentials: ${err.message}`);
    }
  };

  return (
    <>
      <header className="h-14 bg-[#0D111A] border-b border-[#1E2638] px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
        {/* Left: Mobile Hamburger Toggle + Stock Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm lg:max-w-xs">
          {/* Hamburger Menu Toggle (Mobile) */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-[#121721] border border-[#1E2638] text-slate-300 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Desktop & Mobile Search Input */}
          <div className="relative w-full">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stock symbol..."
                className="w-full bg-[#121721] border border-[#1E2638] focus:border-emerald-500 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#121721] border border-[#1E2638] rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-xs text-slate-400 text-center">Searching instruments...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">No stocks found for "{searchQuery}"</div>
                ) : (
                  searchResults.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => {
                        onSelectStock(stock);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#181F2C] border-b border-[#1E2638]/50 last:border-0 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-100">{stock.symbol}</span>
                        <span className="text-[10px] text-slate-400 block">{stock.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-slate-200">₹{stock.ltp.toFixed(2)}</span>
                        <span
                          className={`block text-[10px] font-semibold ${
                            stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Keyboard Shortcuts Button */}
          <button
            onClick={openKeyboardModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121721] hover:bg-[#181F2C] border border-[#1E2638] text-xs text-slate-300 transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">Shortcuts</span>
          </button>

          {/* Market Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>NSE: Open</span>
          </div>

          {/* Zerodha Connection Status Button */}
          <button
            onClick={() => setShowConnectModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              zerodhaStatus.connected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50 hover:bg-emerald-900/40'
                : 'bg-amber-950/30 text-amber-400 border-amber-800/40 hover:bg-amber-900/40'
            }`}
          >
            {zerodhaStatus.connected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="hidden xs:inline">
              {zerodhaStatus.connected ? 'Zerodha Live' : 'Kite Connect'}
            </span>
          </button>

          {/* WebSockets Tick Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border ${
              wsConnected
                ? 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20'
                : 'text-slate-500 border-slate-800 bg-slate-900'
            }`}
            title={wsConnected ? 'WebSockets Live Ticks Active' : 'Connecting WS Ticks...'}
          >
            <Activity className={`w-3 h-3 ${wsConnected ? 'animate-pulse text-emerald-400' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">{wsConnected ? 'LIVE WS' : 'WS'}</span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#1E2638]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-slate-200">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-bold text-slate-200 block leading-tight">
                {zerodhaStatus.user_name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {zerodhaStatus.client_id}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Zerodha Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowConnectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                Z
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Zerodha Kite Integration</h2>
                <p className="text-xs text-slate-400">Configure Credentials & Login via OAuth</p>
              </div>
            </div>

            {/* Status Summary */}
            <div className="space-y-2 bg-[#0D111A] border border-[#1E2638] p-3 rounded-xl text-xs mb-4">
              <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                <span className="text-slate-400">Connection Mode:</span>
                <span className={`font-semibold ${zerodhaStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {zerodhaStatus.connected ? '🟢 LIVE Zerodha Active' : '🟡 Sandbox / Mock Engine'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
                <span className="text-slate-400">Configured API Key:</span>
                <span className="font-mono text-slate-300">{zerodhaStatus.api_key}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Client Profile:</span>
                <span className="font-semibold text-slate-200">{zerodhaStatus.user_name} ({zerodhaStatus.client_id})</span>
              </div>
            </div>

            {/* Input Credentials Form */}
            <div className="space-y-3 mb-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Step 1: Enter Kite API Key & Secret
              </h3>
              
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">API Key (api_key)</label>
                <input
                  type="text"
                  placeholder="e.g. 9x8a7b6c5d4e3f2g"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">API Secret (api_secret)</label>
                <input
                  type="password"
                  placeholder="e.g. abc123xyz456secret"
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              {saveMessage && (
                <div className="p-2.5 rounded bg-[#182030] border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                  {saveMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveCredentials}
                className="w-full bg-[#182030] hover:bg-[#202B40] text-emerald-400 border border-emerald-500/40 font-semibold py-2.5 rounded-lg text-xs transition-colors"
              >
                Save Credentials
              </button>
            </div>

            {/* Step 2: Login via Zerodha OAuth */}
            <div className="pt-3 border-t border-[#1E2638] mb-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Step 2: Login with Zerodha Account
              </h3>

              <a
                href={zerodhaStatus.login_url || `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKeyInput || 'YOUR_KEY'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40"
              >
                <ExternalLink className="w-4 h-4" />
                Login via Zerodha OAuth (Live Session)
              </a>
            </div>

            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full bg-[#181F2C] hover:bg-[#20293A] text-slate-300 py-2.5 rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
