import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ShieldAlert, DollarSign, PieChart } from 'lucide-react';
import type { PortfolioMetrics } from '../types/trading';

interface PortfolioCardProps {
  portfolio: PortfolioMetrics;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ portfolio }) => {
  const isTodayProfit = portfolio.today_pnl >= 0;
  const isOverallProfit = portfolio.overall_pnl >= 0;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Today's P&L */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Today's P&L</span>
          {isTodayProfit ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-base font-bold font-mono ${isTodayProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isTodayProfit ? '+' : ''}{formatINR(portfolio.today_pnl)}
        </div>
        <span className={`text-[10px] font-semibold ${isTodayProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isTodayProfit ? '▲' : '▼'} {portfolio.today_pnl_percent.toFixed(2)}%
        </span>
      </div>

      {/* Overall P&L */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Overall P&L</span>
          {isOverallProfit ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-base font-bold font-mono ${isOverallProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isOverallProfit ? '+' : ''}{formatINR(portfolio.overall_pnl)}
        </div>
        <span className={`text-[10px] font-semibold ${isOverallProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isOverallProfit ? '▲' : '▼'} {portfolio.overall_pnl_percent.toFixed(2)}%
        </span>
      </div>

      {/* Available Margin */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Available Margin</span>
          <Wallet className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-100">
          {formatINR(portfolio.available_margin)}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Ready for Orders</span>
      </div>

      {/* Used Margin */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Used Margin</span>
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-base font-bold font-mono text-amber-400">
          {formatINR(portfolio.used_margin)}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Allocated in Positions</span>
      </div>

      {/* Total Capital */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Capital</span>
          <DollarSign className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-100">
          {formatINR(portfolio.capital)}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Total Account Value</span>
      </div>

      {/* Total Investment */}
      <div className="bg-[#121721] border border-[#1E2638] rounded-xl p-3 shadow-sm hover:border-[#2A354D] transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Investment</span>
          <PieChart className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-100">
          {formatINR(portfolio.total_investment)}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">CNC Holdings Book Value</span>
      </div>
    </div>
  );
};
