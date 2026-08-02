import React, { useState } from 'react';
import { Briefcase, Edit3, XCircle, Copy } from 'lucide-react';
import type { Order } from '../types/trading';
import { modifyOrder, cancelOrder } from '../services/api';

interface OrdersPanelProps {
  orders: Order[];
  onOrdersUpdated: (msg: string) => void;
  onDuplicateOrder: (order: Order) => void;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  onOrdersUpdated,
  onDuplicateOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'EXECUTED' | 'CANCELLED'>('ALL');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQty, setEditQty] = useState<number>(0);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      onOrdersUpdated(`Cancelled order ${orderId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const openModifyModal = (order: Order) => {
    setEditingOrder(order);
    setEditPrice(order.price);
    setEditQty(order.qty);
  };

  const handleSaveModify = async () => {
    if (!editingOrder) return;
    try {
      await modifyOrder(editingOrder.id, { price: editPrice, qty: editQty });
      onOrdersUpdated(`Modified order ${editingOrder.id}`);
      setEditingOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header Tabs */}
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between bg-[#0E131D]">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Orders Book ({orders.length})
          </h2>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-lg border border-[#1E2638]">
          {(['ALL', 'PENDING', 'EXECUTED', 'CANCELLED'] as const).map((tab) => {
            const count = tab === 'ALL' ? orders.length : orders.filter((o) => o.status === tab).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-[#182030] text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse trading-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Order ID</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Target</th>
              <th>Stop Loss</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-8 text-slate-500 text-xs">
                  No orders found under {activeTab} tab.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const isBuy = ord.side === 'BUY';
                const isPending = ord.status === 'PENDING';
                const isExecuted = ord.status === 'EXECUTED';

                return (
                  <tr key={ord.id} className="hover:bg-[#181F2C]">
                    <td className="font-mono text-slate-400 text-xs">{ord.time}</td>
                    <td className="font-mono text-slate-300 text-xs">{ord.id}</td>
                    <td className="font-bold text-slate-100">{ord.symbol}</td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isBuy ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {ord.side} ({ord.product})
                      </span>
                    </td>
                    <td className="font-mono text-slate-200">{ord.qty}</td>
                    <td className="font-mono text-slate-100 font-semibold">
                      ₹{ord.price > 0 ? ord.price.toFixed(2) : 'MKT'}
                    </td>
                    <td className="font-mono text-emerald-400">
                      {ord.target ? `₹${ord.target.toFixed(2)}` : '-'}
                    </td>
                    <td className="font-mono text-rose-400">
                      {ord.stop_loss ? `₹${ord.stop_loss.toFixed(2)}` : '-'}
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isExecuted
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : isPending
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <>
                            <button
                              onClick={() => openModifyModal(ord)}
                              className="p-1 rounded bg-[#181F2C] hover:bg-[#20293A] text-amber-400 border border-[#1E2638]"
                              title="Modify Order"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelOrder(ord.id)}
                              className="p-1 rounded bg-[#181F2C] hover:bg-[#20293A] text-rose-400 border border-[#1E2638]"
                              title="Cancel Order"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onDuplicateOrder(ord)}
                          className="p-1 rounded bg-[#181F2C] hover:bg-[#20293A] text-slate-300 border border-[#1E2638]"
                          title="Duplicate Order"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modify Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              Modify Order ({editingOrder.id})
            </h3>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">New Limit Price (₹)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">New Quantity</label>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveModify}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingOrder(null)}
                className="bg-[#181F2C] hover:bg-[#20293A] text-slate-300 py-2 px-4 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
