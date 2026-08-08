import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
} from 'lucide-react';
import type { Stock, ProductType, OrderType, OrderSide, ValidityType } from '../types/trading';
import { placeOrder } from '../services/api';

interface OrderEntryPanelProps {
  selectedStock: Stock | null;
  onOrderPlaced: (orderMsg: string) => void;
}

export const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({
  selectedStock,
  onOrderPlaced,
}) => {
  if (!selectedStock) {
    return (
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <Zap className="w-8 h-8 text-emerald-400 mb-2 opacity-60" />
        <h3 className="text-sm font-bold text-slate-200">No Instrument Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Search any stock, index option, or futures contract above to open order placement entry.
        </p>
      </div>
    );
  }

  const stock = selectedStock;

  const [qty, setQty] = useState<number>(50);
  const [product, setProduct] = useState<ProductType>('CNC');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [limitPrice, setLimitPrice] = useState<number>(stock.ltp);
  const [target, setTarget] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [trailingSL, setTrailingSL] = useState<string>('');
  const [validity, setValidity] = useState<ValidityType>('DAY');
  const [notes, setNotes] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setLimitPrice(stock.ltp);
  }, [stock]);

  // Calculations for Order Summary
  const currentExecPrice = orderType === 'MARKET' ? stock.ltp : limitPrice;
  const estimatedValue = currentExecPrice * qty;

  // Zerodha tariff calculation: ₹0 for CNC equity delivery, ₹20 max for MIS intraday
  const brokerage = product === 'CNC' ? 0.0 : Math.min(20.0, estimatedValue * 0.0003);
  const stt = product === 'CNC' ? estimatedValue * 0.001 : estimatedValue * 0.00025;
  const etc = estimatedValue * 0.0000345; // Exchange transaction charge
  const gst = (brokerage + etc) * 0.18;
  const sebi = estimatedValue * 0.000001;
  const totalCharges = Number((brokerage + stt + etc + gst + sebi).toFixed(2));
  const netBuyAmount = Number((estimatedValue + totalCharges).toFixed(2));

  const handleOrderSubmit = async (side: OrderSide) => {
    setIsSubmitting(true);
    try {
      const orderPayload = {
        symbol: stock.symbol,
        side,
        qty: Number(qty),
        product,
        order_type: orderType,
        price: orderType === 'LIMIT' ? Number(limitPrice) : stock.ltp,
        target: target ? Number(target) : undefined,
        stop_loss: stopLoss ? Number(stopLoss) : undefined,
        trailing_stop_loss: trailingSL ? Number(trailingSL) : undefined,
        validity,
        notes,
      };

      await placeOrder(orderPayload);
      onOrderPlaced(`🟢 ${side} order placed for ${qty} shares of ${stock.symbol} @ ₹${currentExecPrice.toFixed(2)}`);
    } catch (err: any) {
      console.error(err);
      onOrderPlaced(`🔴 Order failed: ${err.message || 'Error executing Zerodha order'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl flex flex-col h-full overflow-y-auto shadow-sm p-4">
      {/* Header Stock Focus */}
      <div className="pb-3 mb-3 border-b border-[#1E2638] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">{stock.symbol}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 font-mono font-semibold">
              NSE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{stock.name}</p>
        </div>

        <div className="text-right font-mono">
          <div className="text-base font-bold text-emerald-400">
            ₹{stock.ltp.toFixed(2)}
          </div>
          <span
            className={`text-[10px] font-semibold ${
              stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Product Selector: CNC vs MIS */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
          Product Type
        </label>
        <div className="grid grid-cols-2 gap-2 bg-[#0D111A] p-1 rounded-lg border border-[#1E2638]">
          <button
            type="button"
            onClick={() => setProduct('CNC')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              product === 'CNC'
                ? 'bg-[#182030] text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CNC (Long-term Delivery)
          </button>
          <button
            type="button"
            onClick={() => setProduct('MIS')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              product === 'MIS'
                ? 'bg-[#182030] text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MIS (Intraday Leverage)
          </button>
        </div>
      </div>

      {/* Order Type Selector: Market vs Limit */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
          Order Type
        </label>
        <div className="grid grid-cols-2 gap-2 bg-[#0D111A] p-1 rounded-lg border border-[#1E2638]">
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              orderType === 'MARKET'
                ? 'bg-[#182030] text-slate-100 border border-slate-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Market Price
          </button>
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              orderType === 'LIMIT'
                ? 'bg-[#182030] text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Limit Price
          </button>
        </div>
      </div>

      {/* Inputs: Qty & Price */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-[#0D111A] border border-[#1E2638] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 outline-none"
          />
          {/* Quick Lot Multipliers */}
          <div className="flex items-center gap-1 mt-1">
            {[10, 25, 50, 100, 500].map((lot) => (
              <button
                key={lot}
                type="button"
                onClick={() => setQty(lot)}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#181F2C] hover:bg-[#20293A] text-slate-400 hover:text-slate-200 border border-[#1E2638]"
              >
                +{lot}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Price (₹)
          </label>
          <input
            type="number"
            disabled={orderType === 'MARKET'}
            value={orderType === 'MARKET' ? stock.ltp.toFixed(2) : limitPrice}
            onChange={(e) => setLimitPrice(parseFloat(e.target.value) || stock.ltp)}
            className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono outline-none ${
              orderType === 'MARKET'
                ? 'bg-[#0D111A]/50 border-[#1E2638] text-slate-500 cursor-not-allowed'
                : 'bg-[#0D111A] border-[#1E2638] focus:border-amber-500 text-slate-100'
            }`}
          />
          <span className="text-[9px] text-slate-500 block mt-1">
            {orderType === 'MARKET' ? 'Executes at best LTP' : 'Executes at limit or better'}
          </span>
        </div>
      </div>

      {/* Optional Inputs: Target & Stop Loss */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Target Price (₹)
          </label>
          <input
            type="number"
            placeholder={`e.g. ${(stock.ltp * 1.05).toFixed(1)}`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-[#0D111A] border border-emerald-950/60 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
            Stop Loss (₹)
          </label>
          <input
            type="number"
            placeholder={`e.g. ${(stock.ltp * 0.95).toFixed(1)}`}
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-[#0D111A] border border-rose-950/60 focus:border-rose-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 outline-none"
          />
        </div>
      </div>

      {/* Advanced Inputs Toggle */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Advanced Options (Trailing SL, Validity, Notes)
        </button>

        {showAdvanced && (
          <div className="mt-2 p-3 bg-[#0D111A] border border-[#1E2638] rounded-xl space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Trailing Stop Loss (Pts)
              </label>
              <input
                type="number"
                placeholder="e.g. 5.0"
                value={trailingSL}
                onChange={(e) => setTrailingSL(e.target.value)}
                className="w-full bg-[#121721] border border-[#1E2638] rounded-md px-2.5 py-1 text-xs text-slate-100 outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Order Validity
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValidity('DAY')}
                  className={`py-1 text-xs font-semibold rounded ${
                    validity === 'DAY'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#121721] text-slate-400'
                  }`}
                >
                  DAY
                </button>
                <button
                  type="button"
                  onClick={() => setValidity('IOC')}
                  className={`py-1 text-xs font-semibold rounded ${
                    validity === 'IOC'
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                      : 'bg-[#121721] text-slate-400'
                  }`}
                >
                  IOC (Immediate/Cancel)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Strategy Notes / Tags
              </label>
              <input
                type="text"
                placeholder="e.g. Breakout retest strategy"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#121721] border border-[#1E2638] rounded-md px-2.5 py-1 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Action Buttons (Large BUY & SELL) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          disabled={isSubmitting}
          onClick={() => handleOrderSubmit('BUY')}
          className="btn-toggle-active-buy py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-emerald-950/40"
        >
          <Zap className="w-4 h-4" />
          BUY 🟢
        </button>

        <button
          disabled={isSubmitting}
          onClick={() => handleOrderSubmit('SELL')}
          className="btn-toggle-active-sell py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-rose-950/40"
        >
          <Zap className="w-4 h-4" />
          SELL 🔴
        </button>
      </div>

      {/* Order Summary breakdown */}
      <div className="bg-[#0D111A] border border-[#1E2638] rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex justify-between items-center text-slate-400">
          <span>Estimated Value:</span>
          <span className="font-mono text-slate-200">₹{estimatedValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Brokerage ({product}):</span>
          <span className="font-mono text-emerald-400">₹{brokerage.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Exchange & Tax Charges:</span>
          <span className="font-mono text-slate-300">₹{totalCharges.toFixed(2)}</span>
        </div>
        <div className="pt-1 border-t border-[#1E2638] flex justify-between items-center font-semibold">
          <span className="text-slate-200">Net Amount Required:</span>
          <span className="font-mono text-emerald-400 text-sm">
            ₹{netBuyAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
