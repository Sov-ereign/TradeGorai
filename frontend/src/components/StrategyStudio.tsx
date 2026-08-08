import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Pause, 
  Zap, 
  Code, 
  Copy, 
  Check, 
  Activity, 
  Sliders
} from 'lucide-react';
import type { AlgoStrategy } from '../types/trading';
import { getStrategies, toggleStrategy } from '../services/api';

export const StrategyStudio: React.FC = () => {
  const [strategies, setStrategies] = useState<AlgoStrategy[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const loadStrats = async () => {
    try {
      const data = await getStrategies();
      setStrategies(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStrats();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await toggleStrategy(id);
      loadStrats();
    } catch (err) {
      console.error(err);
    }
  };

  const sampleWebhookJson = JSON.stringify(
    {
      secret: "TG_SECRET_ALGO_99",
      symbol: "NIFTY 24800 CE",
      action: "BUY",
      qty: 50,
      product: "MIS",
      order_type: "MARKET",
      target: 240.0,
      stop_loss: 150.0
    },
    null,
    2
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-6 h-6 text-[#387ED1]" />
              <h1 className="text-xl font-bold text-slate-100">TradeGorai Quantitative Algo Studio</h1>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Automated execution engine powered by quantitative strategies, sub-second trigger algorithms, and TradingView webhook automation into Zerodha Kite API.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0D111A] border border-[#1E2638] px-4 py-2.5 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Algo Engine Status</span>
              <span className="text-xs font-bold text-emerald-400">🟢 ACTIVE (0.4ms Latency)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Quantitative Strategies Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Pre-built Quantitative Algos ({strategies.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strat) => {
            const isRunning = strat.status === 'RUNNING';

            return (
              <div
                key={strat.id}
                className="bg-[#121721] border border-[#1E2638] rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-[#387ED1]/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#182030] text-[#387ED1] uppercase">
                        {strat.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-1">{strat.name}</h3>
                    </div>

                    <button
                      onClick={() => handleToggle(strat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isRunning
                          ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                          : 'bg-[#182030] hover:bg-[#202B40] text-slate-400 hover:text-white border border-[#1E2638]'
                      }`}
                    >
                      {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isRunning ? 'RUNNING' : 'START ALGO'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{strat.description}</p>

                  {/* Strategy Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[#0D111A] border border-[#1E2638] p-3 rounded-xl mb-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Win Rate</span>
                      <span className="font-bold text-emerald-400 font-mono">{strat.win_rate}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Trades</span>
                      <span className="font-bold text-slate-200 font-mono">{strat.total_trades}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Generated P&L</span>
                      <span className="font-bold text-emerald-400 font-mono">+₹{strat.total_pnl.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Execution Log & Control */}
                <div className="pt-3 border-t border-[#1E2638] flex items-center justify-between text-[11px]">
                  <div className="truncate max-w-[240px]">
                    <span className="text-slate-500 block text-[9px]">LAST SIGNAL ({strat.last_signal_time})</span>
                    <span className="font-mono text-slate-300 font-medium truncate block">{strat.last_signal}</span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(JSON.stringify(strat.params, null, 2))}
                    className="p-1.5 rounded-lg bg-[#182030] hover:bg-[#202B40] text-slate-300 border border-[#1E2638]"
                    title="Copy Parameters"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TradingView Webhook Automation Bridge */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E2638] pb-4">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">TradingView & External Webhook Automation</h2>
              <p className="text-xs text-slate-400">Fire automated signals from TradingView alerts or Python scripts into Zerodha with hidden Target & SL.</p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard('https://tradegorai-backend.onrender.com/api/strategy/webhook')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#182030] hover:bg-[#202B40] border border-purple-500/40 text-purple-300 text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied URL!' : 'Copy Webhook URL'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Webhook Listener Endpoint</label>
            <input
              type="text"
              readOnly
              value="https://tradegorai-backend.onrender.com/api/strategy/webhook"
              className="w-full bg-[#0D111A] border border-[#1E2638] rounded-xl px-3 py-2 text-xs font-mono text-purple-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Secret Key</label>
            <input
              type="text"
              readOnly
              value="TG_SECRET_ALGO_99"
              className="w-full bg-[#0D111A] border border-[#1E2638] rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">TradingView JSON Alert Payload Template</label>
          <pre className="bg-[#0D111A] border border-[#1E2638] p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
            {sampleWebhookJson}
          </pre>
        </div>
      </div>
    </div>
  );
};
