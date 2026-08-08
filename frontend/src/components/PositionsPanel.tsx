import React from 'react';
import { Layers, LogOut, Lock } from 'lucide-react';
import type { Position } from '../types/trading';
import { exitPosition, squareOffAllPositions } from '../services/api';

interface PositionsPanelProps {
  positions: Position[];
  onPositionsUpdated: (msg: string) => void;
}

export const PositionsPanel: React.FC<PositionsPanelProps> = ({
  positions,
  onPositionsUpdated,
}) => {
  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const totalUnrealizedPnl = openPositions.reduce((acc, p) => acc + p.unrealized_pnl, 0);

  const handleExitPosition = async (symbol: string, product: string) => {
    try {
      await exitPosition(symbol, product);
      onPositionsUpdated(`Exited open position in ${symbol} (${product})`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSquareOffAll = async () => {
    if (!window.confirm('Are you sure you want to square off ALL open positions?')) {
      return;
    }
    try {
      const res = await squareOffAllPositions();
      onPositionsUpdated(res.message);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#121721] border border-[#1E2638] rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between bg-[#0E131D]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Positions ({openPositions.length} Open)
          </h2>
          {openPositions.length > 0 && (
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                totalUnrealizedPnl >= 0
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
              }`}
            >
              Total Open P&L: {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toFixed(2)}
            </span>
          )}
        </div>

        {openPositions.length > 0 && (
          <button
            onClick={handleSquareOffAll}
            className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs px-3 py-1 rounded-lg transition-all shadow-md shadow-rose-950/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            Square Off All
          </button>
        )}
      </div>

      {/* Positions Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse trading-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Avg Price</th>
              <th>LTP</th>
              <th>P&L</th>
              <th>Hidden Triggers (Target / SL)</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-slate-500 text-xs">
                  No open positions. Execute orders with hidden Target/SL to manage trades.
                </td>
              </tr>
            ) : (
              positions.map((pos, idx) => {
                const isProfit = pos.pnl >= 0;
                const isOpen = pos.status === 'OPEN';
                const posAny = pos as any;

                return (
                  <tr key={`${pos.symbol}-${pos.product}-${idx}`} className={isOpen ? '' : 'opacity-60 bg-[#0B0E14]'}>
                    <td className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{pos.symbol}</span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          pos.product === 'CNC'
                            ? 'bg-blue-950/50 text-blue-400 border-blue-800/40'
                            : 'bg-amber-950/50 text-amber-400 border-amber-800/40'
                        }`}
                      >
                        {pos.product}
                      </span>
                    </td>
                    <td className="font-mono text-slate-200">{pos.qty}</td>
                    <td className="font-mono text-slate-300">₹{pos.avg_price.toFixed(2)}</td>
                    <td className="font-mono text-slate-100 font-semibold">₹{pos.current_price.toFixed(2)}</td>
                    <td className={`font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}₹{pos.pnl.toFixed(2)}
                      <span className="text-[10px] block font-normal">
                        ({isProfit ? '+' : ''}{pos.pnl_percent.toFixed(2)}%)
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {posAny.target ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            T: ₹{posAny.target}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">T: --</span>
                        )}
                        {posAny.stop_loss ? (
                          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            SL: ₹{posAny.stop_loss}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">SL: --</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOpen
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {pos.status}
                      </span>
                    </td>
                    <td className="text-right">
                      {isOpen ? (
                        <button
                          onClick={() => handleExitPosition(pos.symbol, pos.product)}
                          className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs px-2.5 py-1 rounded-md font-semibold transition-all"
                        >
                          Exit
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs">Exited</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
