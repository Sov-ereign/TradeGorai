import React, { useState } from 'react';
import { Briefcase, Edit3, XCircle, Copy, Trash2 } from 'lucide-react';
import type { Order } from '../types/trading';
import { modifyOrder, cancelOrder, clearOrders } from '../services/api';

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

  const handleClearAllOrders = async () => {
    try {
      await clearOrders();
      onOrdersUpdated('Cleared order history');
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

        <div className="flex items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex bg-[#0D111A] p-0.5 rounded-lg border border-[#1E2638]">
            {(['ALL', 'PENDING', 'EXECUTED', 'CANCELLED'] as const).map((tab) => {
              const count = tab === 'ALL' ? orders.length : orders.filter((o) => o.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    activeTab === tab
                      ? 'bg-[#182030] text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Clear History Button */}
          {orders.length > 0 && (
            <button
              onClick={handleClearAllOrders}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Clear Order History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} orders found.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D111A] text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 border-b border-[#1E2638]">
              <tr>
                <th className="p-2.5">Time</th>
                <th className="p-2.5">Order ID</th>
                <th className="p-2.5">Symbol</th>
                <th className="p-2.5">Side</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5">Price</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2638]/40">
              {filteredOrders.map((order) => {
                const isBuy = order.side === 'BUY';
                const isPending = order.status === 'PENDING' || order.status === 'OPEN' || order.status === 'AMO REQ';

                return (
                  <tr key={order.id} className="hover:bg-[#151B28] transition-colors">
                    <td className="p-2.5 text-slate-400 text-[11px] whitespace-nowrap">{order.time}</td>
                    <td className="p-2.5 font-bold text-slate-200 text-[11px] font-mono whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="p-2.5 font-bold text-slate-100 whitespace-nowrap">{order.symbol}</td>
                    <td className="p-2.5 font-semibold whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-[#387ED1]/20 text-[#387ED1]' : 'bg-[#DF514C]/20 text-[#DF514C]'
                        }`}
                      >
                        {order.side} ({order.product})
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-200">{order.qty}</td>
                    <td className="p-2.5 font-semibold text-slate-200">₹{order.price ? order.price.toFixed(2) : '0.00'}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          order.status === 'EXECUTED' || order.status === 'COMPLETE'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                            : isPending
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onDuplicateOrder(order)}
                          className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#182030]"
                          title="Reorder"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => openModifyModal(order)}
                              className="p-1 text-amber-400 hover:text-amber-300 rounded hover:bg-[#182030]"
                              title="Modify Order"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-[#182030]"
                              title="Cancel Order"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modify Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121721] border border-[#1E2638] rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-4">
              Modify Order: {editingOrder.symbol}
            </h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] rounded-xl px-3 py-2 text-xs font-mono text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editQty}
                  onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] rounded-xl px-3 py-2 text-xs font-mono text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 bg-[#182030] hover:bg-[#202B40] text-slate-300 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModify}
                className="flex-1 bg-[#387ED1] hover:bg-[#2C68B2] text-white font-bold py-2 rounded-xl text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
