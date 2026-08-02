import React, { useState } from 'react';
import { Star, Trash2, Plus, Search, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import type { Stock } from '../types/trading';
import { addToWatchlist, removeFromWatchlist, toggleStarStock, searchStocks } from '../services/api';

interface WatchlistPanelProps {
  watchlist: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  onWatchlistUpdated: () => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlist,
  selectedStock,
  onSelectStock,
  onWatchlistUpdated,
}) => {
  const [filterText, setFilterText] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<Stock[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const filteredList = watchlist.filter((item) => {
    const matchesQuery =
      item.symbol.toLowerCase().includes(filterText.toLowerCase()) ||
      item.name.toLowerCase().includes(filterText.toLowerCase());
    const matchesStar = onlyStarred ? item.starred : true;
    return matchesQuery && matchesStar;
  });

  const handleStarToggle = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      await toggleStarStock(symbol);
      onWatchlistUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      await removeFromWatchlist(symbol);
      onWatchlistUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchForAdd = async (q: string) => {
    setAddSearchQuery(q);
    if (!q.trim()) {
      setAddSearchResults([]);
      return;
    }
    try {
      const results = await searchStocks(q);
      setAddSearchResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStock = async (stock: Stock) => {
    setIsAdding(true);
    try {
      await addToWatchlist(stock);
      onWatchlistUpdated();
      setShowAddModal(false);
      setAddSearchQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* Watchlist Header */}
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between gap-2 bg-[#0E131D]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Watchlist ({watchlist.length})
          </h2>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono">
            MongoDB Synced
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOnlyStarred(!onlyStarred)}
            className={`p-1.5 rounded-lg border transition-colors ${
              onlyStarred
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-[#181F2C] border-[#1E2638] text-slate-400 hover:text-slate-200'
            }`}
            title="Filter Favorites"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-all shadow-md shadow-emerald-950/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stock
          </button>
        </div>
      </div>

      {/* Filter / Quick Search Input */}
      <div className="p-2 border-b border-[#1E2638] bg-[#0F1420]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter watchlist..."
            className="w-full bg-[#121721] border border-[#1E2638] focus:border-emerald-500 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Watchlist Items Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E2638]/40">
        {filteredList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No stocks found in watchlist. Click <b>Add Stock</b> to search and track symbols.
          </div>
        ) : (
          filteredList.map((stock) => {
            const isSelected = selectedStock?.symbol === stock.symbol;
            const isProfit = stock.change >= 0;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock)}
                className={`group p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-950/50 via-[#182030] to-transparent border-l-4 border-l-emerald-500'
                    : 'hover:bg-[#181F2C]'
                }`}
              >
                {/* Symbol & Name */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <button
                    onClick={(e) => handleStarToggle(e, stock.symbol)}
                    className="text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        stock.starred ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-100">{stock.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {stock.exchange || 'NSE'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">
                      {stock.name}
                    </span>
                  </div>
                </div>

                {/* LTP, % Change, Daily High & Low */}
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-slate-100 flex items-center justify-end gap-1">
                      <span>₹{stock.ltp.toFixed(2)}</span>
                      {isProfit ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px]">
                      <span
                        className={`font-semibold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}{stock.change.toFixed(2)}%
                      </span>
                      <span className="text-slate-500 text-[9px] hidden sm:inline">
                        H: {stock.high.toFixed(1)} L: {stock.low.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Stock Button */}
                  <button
                    onClick={(e) => handleRemove(e, stock.symbol)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-md p-5 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Stock to Watchlist (MongoDB)
            </h3>
            <input
              type="text"
              value={addSearchQuery}
              onChange={(e) => handleSearchForAdd(e.target.value)}
              placeholder="Search symbol (e.g. TCS, INFY, HDFCBANK)..."
              className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none mb-3"
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-[#1E2638] mb-4">
              {addSearchResults.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-2.5 flex items-center justify-between hover:bg-[#181F2C] rounded-lg transition-colors"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">{stock.symbol}</span>
                    <span className="text-[10px] text-slate-400">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-200">₹{stock.ltp.toFixed(2)}</span>
                    <button
                      disabled={isAdding}
                      onClick={() => handleAddStock(stock)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1 rounded-md transition-all shadow-md shadow-emerald-950/30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(false)}
              className="w-full bg-[#181F2C] hover:bg-[#20293A] text-slate-300 py-2 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
