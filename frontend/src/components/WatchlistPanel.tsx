import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ListOrdered,
  FolderPlus,
  Edit2,
  X,
  Check
} from 'lucide-react';
import type { Stock, WatchlistGroup, OrderSide } from '../types/trading';
import { 
  getWatchlists, 
  addToWatchlist, 
  removeFromWatchlist, 
  toggleStarStock, 
  searchStocks,
  createWatchlistGroup,
  renameWatchlistGroup,
  deleteWatchlistGroup 
} from '../services/api';
import { KiteOrderModal } from './KiteOrderModal';

interface WatchlistPanelProps {
  watchlist: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  onWatchlistUpdated: () => void;
}

const safeNum = (val: any, decimals: number = 2): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toFixed(decimals);
};

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  watchlist: propWatchlist,
  selectedStock,
  onSelectStock,
  onWatchlistUpdated,
}) => {
  const [groups, setGroups] = useState<WatchlistGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('wl-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  
  // Kite Order Sheet Modal state
  const [modalStock, setModalStock] = useState<Stock | null>(null);
  const [modalSide, setModalSide] = useState<OrderSide>('BUY');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Group creation & editing states
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadGroups = async () => {
    try {
      const data = await getWatchlists();
      setGroups(data);
      if (data.length > 0) {
        if (!data.some((g) => g.id === activeGroupId)) {
          setActiveGroupId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading watchlist groups:', err);
    }
  };

  useEffect(() => {
    loadGroups();
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

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const currentStocks = activeGroup ? activeGroup.items : propWatchlist;

  const handleOpenOrderModal = (stock: Stock, side: OrderSide) => {
    setModalStock(stock);
    setModalSide(side);
    setIsModalOpen(true);
  };

  const handleAddStock = async (stock: Stock) => {
    try {
      await addToWatchlist(stock, activeGroupId);
      setSearchQuery('');
      loadGroups();
      onWatchlistUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveStock = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      await removeFromWatchlist(symbol, activeGroupId);
      loadGroups();
      onWatchlistUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStarToggle = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      await toggleStarStock(symbol);
      loadGroups();
      onWatchlistUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await createWatchlistGroup(newGroupName.trim());
      setNewGroupName('');
      setShowNewGroupModal(false);
      await loadGroups();
      if (res.group) setActiveGroupId(res.group.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!editingName.trim()) return;
    try {
      await renameWatchlistGroup(groupId, editingName.trim());
      setEditingGroupId(null);
      loadGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteWatchlistGroup(groupId);
      loadGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = (currentStocks || []).filter(
    (stock) =>
      stock &&
      (stock.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl h-full flex flex-col overflow-hidden shadow-xl">
      {/* Header & Watchlist Group Selector Tabs */}
      <div className="p-3 border-b border-[#1E2638] bg-[#0F1420] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {groups.map((group) => {
            const isActive = group.id === activeGroupId;
            const isEditing = editingGroupId === group.id;

            return (
              <div
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#387ED1] text-white shadow-md shadow-[#387ED1]/30'
                    : 'bg-[#182030] text-slate-400 hover:text-slate-200 hover:bg-[#1F2B40]'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-[#0D111A] text-slate-100 px-1.5 py-0.5 rounded text-[11px] outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleRenameGroup(group.id)} className="text-emerald-400">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingGroupId(null)} className="text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{group.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/30 text-white' : 'bg-[#0D111A] text-slate-400'
                      }`}
                    >
                      {group.items ? group.items.length : 0}
                    </span>
                    {isActive && !group.is_default && (
                      <div className="flex items-center gap-1 ml-0.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditingName(group.name);
                          }}
                          className="text-white/80 hover:text-white"
                          title="Rename Watchlist"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-white/80 hover:text-rose-300"
                          title="Delete Watchlist"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Watchlist Button */}
        <button
          onClick={() => setShowNewGroupModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#182030] hover:bg-[#202B40] border border-[#387ED1]/40 text-[#387ED1] text-xs font-semibold whitespace-nowrap transition-colors"
          title="Create New Watchlist"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Watchlist</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-2.5 border-b border-[#1E2638] bg-[#0D111A] relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search & add 53,800+ symbols (e.g. NIFTY 24800 CE)..."
            className="w-full bg-[#121721] border border-[#1E2638] focus:border-[#387ED1] rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-[#121721] border border-[#1E2638] rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 text-xs text-slate-400 text-center">Searching 53,800+ instruments...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">No instruments found for "{searchQuery}"</div>
            ) : (
              searchResults.map((stock) => (
                <div
                  key={`${stock.exchange}-${stock.symbol}`}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#181F2C] border-b border-[#1E2638]/50 last:border-0"
                >
                  <div>
                    <span className="font-bold text-slate-100">{stock.symbol}</span>
                    <span className="text-[10px] text-slate-400 block">{stock.name} ({stock.exchange})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-200">₹{safeNum(stock.ltp)}</span>
                    <button
                      onClick={() => handleAddStock(stock)}
                      className="p-1 rounded bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold text-[11px] flex items-center gap-1 px-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Filter Active Watchlist Search */}
      <div className="p-2 border-b border-[#1E2638] bg-[#0F1420]">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={`Filter ${activeGroup ? activeGroup.name : 'watchlist'}...`}
          className="w-full bg-[#121721] border border-[#1E2638] focus:border-[#387ED1] rounded-md px-3 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none"
        />
      </div>

      {/* Watchlist Items Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E2638]/40">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <ListOrdered className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <p className="font-semibold text-slate-300">Watchlist Empty</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Search any stock or F&O contract above to add it, or connect Zerodha to sync live holdings.
            </p>
          </div>
        ) : (
          filteredList.map((stock) => {
            const isSelected = selectedStock?.symbol === stock.symbol;
            const changeVal = stock.change ?? 0;
            const isProfit = changeVal >= 0;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock)}
                className={`group p-3 flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#182030] border-l-4 border-l-[#387ED1]'
                    : 'hover:bg-[#151B28]'
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
                      <span className="text-[9px] px-1 rounded bg-[#0D111A] text-slate-400 font-mono">
                        {stock.exchange || 'NSE'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {stock.name}
                    </span>
                  </div>
                </div>

                {/* LTP, % Change & Big Kite Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <div className="font-mono text-xs font-semibold text-slate-100">
                      ₹{safeNum(stock.ltp)}
                    </div>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      <span>
                        {isProfit ? '+' : ''}
                        {safeNum(changeVal)}%
                      </span>
                    </div>
                  </div>

                  {/* Kite Quick BUY & SELL Action Buttons */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenOrderModal(stock, 'BUY');
                    }}
                    className="bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm transition-all"
                  >
                    B
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenOrderModal(stock, 'SELL');
                    }}
                    className="bg-[#DF514C] hover:bg-[#B83E3A] text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm transition-all"
                  >
                    S
                  </button>

                  {/* Remove Stock Button */}
                  <button
                    onClick={(e) => handleRemoveStock(e, stock.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/30 transition-all"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Kite Order Modal Sheet */}
      {modalStock && (
        <KiteOrderModal
          stock={modalStock}
          initialSide={modalSide}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onOrderPlaced={onWatchlistUpdated}
        />
      )}

      {/* New Watchlist Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <button
              onClick={() => setShowNewGroupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#387ED1]" />
              Create New Watchlist
            </h3>

            <input
              type="text"
              placeholder="Watchlist Name (e.g. Options Scalping)..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-[#387ED1] rounded-lg p-2.5 text-xs text-slate-100 outline-none mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="flex-1 bg-[#182030] hover:bg-[#202B40] text-slate-300 py-2 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold py-2 rounded-lg text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
