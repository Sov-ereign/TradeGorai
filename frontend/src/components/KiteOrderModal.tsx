import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Zap, Shield, Lock } from 'lucide-react';
import type { Stock, ProductType, OrderType, OrderSide } from '../types/trading';
import { placeOrder } from '../services/api';

interface KiteOrderModalProps {
  stock: Stock;
  initialSide?: OrderSide;
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (msg: string) => void;
}

export const KiteOrderModal: React.FC<KiteOrderModalProps> = ({
  stock,
  initialSide = 'BUY',
  isOpen,
  onClose,
  onOrderPlaced,
}) => {
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [product, setProduct] = useState<ProductType>('CNC');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [qty, setQty] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(stock.ltp);
  
  // Virtual / Hidden Target & Stop Loss inputs
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const isBuy = side === 'BUY';
  const effectivePrice = orderType === 'MARKET' ? stock.ltp : limitPrice;
  const estimatedAmount = (effectivePrice * qty).toFixed(2);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await placeOrder({
        symbol: stock.symbol,
        side,
        qty,
        product,
        order_type: orderType,
        exchange: stock.exchange || 'NSE',
        price: effectivePrice,
        target: targetPrice ? parseFloat(targetPrice) : undefined,
        stop_loss: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
        validity: 'DAY',
      });
      
      const hiddenMsg = (targetPrice || stopLossPrice) 
        ? ' (🔒 Target/SL kept HIDDEN from Zerodha until LTP triggers)'
        : '';

      const orderIdMsg = res.order?.id ? ` [ID: ${res.order.id}]` : '';
      onOrderPlaced(`🟢 Order placed: ${side} ${qty} qty of ${stock.symbol} @ ₹${effectivePrice}${orderIdMsg}${hiddenMsg}`);
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Placement failed';
      onOrderPlaced(`🔴 Order note: ${errMsg}`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full max-w-lg bg-[#121721] border-t sm:border border-[#1E2638] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[92vh] sm:max-h-[85vh]`}
      >
        {/* Kite Header Banner (Blue for BUY, Red for SELL) */}
        <div
          className={`p-3.5 sm:p-4 transition-colors ${
            isBuy ? 'bg-[#387ED1]' : 'bg-[#DF514C]'
          } text-white flex items-center justify-between shrink-0`}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">{stock.symbol}</h2>
              <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">
                {stock.exchange || 'NSE'}
              </span>
            </div>
            <span className="text-xs opacity-95 block truncate max-w-[200px] sm:max-w-xs">{stock.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="font-mono text-base font-bold block">₹{(stock?.ltp ?? 0).toFixed(2)}</span>
              <span className="text-[11px] font-semibold opacity-95">
                {(stock?.change ?? 0) >= 0 ? '+' : ''}{(stock?.change ?? 0).toFixed(2)}%
              </span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-black/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Side Toggle Tabs */}
        <div className="flex border-b border-[#1E2638] bg-[#0D111A] shrink-0">
          <button
            onClick={() => setSide('BUY')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              isBuy ? 'bg-[#387ED1]/20 text-[#387ED1] border-b-2 border-[#387ED1]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            BUY
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isBuy ? 'bg-[#DF514C]/20 text-[#DF514C] border-b-2 border-[#DF514C]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            SELL
          </button>
        </div>

        {/* Scrollable Main Form Fields */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Product Type Pills (CNC vs MIS) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Product
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProduct('CNC')}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  product === 'CNC'
                    ? 'bg-[#182030] text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-[#0D111A] text-slate-400 border-[#1E2638] hover:text-white'
                }`}
              >
                CNC (Longterm Delivery)
              </button>
              <button
                type="button"
                onClick={() => setProduct('MIS')}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  product === 'MIS'
                    ? 'bg-[#182030] text-amber-400 border-amber-500/50 shadow-sm'
                    : 'bg-[#0D111A] text-slate-400 border-[#1E2638] hover:text-white'
                }`}
              >
                MIS (Intraday Margin)
              </button>
            </div>
          </div>

          {/* Order Type Pills (MARKET vs LIMIT) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  orderType === 'MARKET'
                    ? 'bg-[#182030] text-slate-100 border-slate-500 shadow-sm'
                    : 'bg-[#0D111A] text-slate-400 border-[#1E2638] hover:text-white'
                }`}
              >
                Market (Best LTP)
              </button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  orderType === 'LIMIT'
                    ? 'bg-[#182030] text-slate-100 border-slate-500 shadow-sm'
                    : 'bg-[#0D111A] text-slate-400 border-[#1E2638] hover:text-white'
                }`}
              >
                Limit (Custom Price)
              </button>
            </div>
          </div>

          {/* Quantity & Price Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Quantity</label>
              <div className="flex items-center bg-[#0D111A] border border-[#1E2638] rounded-xl overflow-hidden focus-within:border-[#387ED1]">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-2.5 text-slate-300 hover:text-white font-bold bg-[#151B28] text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center bg-transparent py-2 text-sm font-bold font-mono text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="px-4 py-2.5 text-slate-300 hover:text-white font-bold bg-[#151B28] text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Price (₹)</label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? stock.ltp : limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || stock.ltp)}
                className={`w-full bg-[#0D111A] border border-[#1E2638] rounded-xl px-3 py-2.5 text-sm font-bold font-mono text-slate-100 outline-none ${
                  orderType === 'MARKET' ? 'opacity-50 cursor-not-allowed' : 'focus:border-[#387ED1]'
                }`}
              />
            </div>
          </div>

          {/* HIDDEN TARGET & STOP LOSS SECTION */}
          <div className="pt-3 border-t border-[#1E2638]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Virtual / Hidden Triggers
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Zerodha Protected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Hidden Target (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 385.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold outline-none placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Hidden Stop Loss (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 370.00"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-rose-500 rounded-xl px-3 py-2 text-xs font-mono text-rose-400 font-bold outline-none placeholder-slate-600"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-1.5 italic">
              🔒 Target & SL remain hidden locally inside TradeGorai. Zerodha is notified ONLY when LTP reaches trigger level!
            </p>
          </div>

          {/* Estimated Margin & Total Amount Banner */}
          <div className="bg-[#0D111A] border border-[#1E2638] p-3 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Approx. Required Margin:</span>
            <span className="font-mono font-bold text-slate-100 text-sm">₹{estimatedAmount}</span>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-3.5 bg-[#0D111A] border-t border-[#1E2638] shrink-0">
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
              isBuy
                ? 'bg-[#387ED1] hover:bg-[#2C68B2] shadow-[#387ED1]/30'
                : 'bg-[#DF514C] hover:bg-[#B83E3A] shadow-[#DF514C]/30'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isSubmitting ? 'Processing Order...' : `${side} ${stock.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
};
