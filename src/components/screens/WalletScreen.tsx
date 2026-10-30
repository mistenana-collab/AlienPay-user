import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { WalletBalances, Transaction, ActiveScreen } from '../../types';

interface WalletScreenProps {
  balances: WalletBalances;
  transactions: Transaction[];
  onNavigate: (screen: ActiveScreen) => void;
  onOpenDeposit: (currency: 'INR' | 'USDT') => void;
  onOpenWithdraw: (currency: 'INR' | 'USDT') => void;
  selectedCurrency?: 'INR' | 'USDT';
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  balances,
  transactions,
  onNavigate,
  onOpenDeposit,
  onOpenWithdraw,
  selectedCurrency = 'INR',
}) => {
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdraw' | 'commission'>('all');
  const [cur, setCur] = useState<'INR' | 'USDT'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return selectedCurrency || 'INR';
  });

  const rate = balances.exchangeRateUsdtToInr || 100;
  const totalInr = balances.inrBalance + (balances.usdtBalance * rate);
  const totalUsdt = balances.usdtBalance + (balances.inrBalance / rate);

  const filteredTx = transactions.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  return (
    <div className="flex-1 flex flex-col pb-8 transition-colors duration-250">
      {/* Top Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border-subtle)',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: 'var(--app-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
          AlienPay Dual Wallet
        </h1>

        <div className="w-8"></div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Main Dual Balance Overview Card */}
        <div 
          className="rounded-2xl p-4 border shadow-xl relative overflow-hidden transition-colors duration-250"
          style={{
            background: 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-primary)',
            boxShadow: '0 10px 25px -5px var(--app-shadow)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2.5" style={{ color: 'var(--app-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--app-text-primary)' }}>Combined Portfolio Valuation</span>
            
            {/* 2 Options Currency Switcher */}
            <div 
              className="flex items-center p-0.5 rounded-lg border text-[11px]"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setCur('INR');
                  try { localStorage.setItem('alienpay_selected_currency', 'INR'); } catch {}
                }}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  cur === 'INR'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: cur === 'INR' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                INR
              </button>
              <button
                type="button"
                onClick={() => {
                  setCur('USDT');
                  try { localStorage.setItem('alienpay_selected_currency', 'USDT'); } catch {}
                }}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  cur === 'USDT'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: cur === 'USDT' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                USDT
              </button>
            </div>
          </div>

          {/* Single Box Unified Display */}
          <div 
            className="p-3.5 rounded-xl border transition-colors duration-250 mb-3"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-heading font-black text-2xl tracking-tight tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {cur === 'INR' ? (
                  <>₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  <>${totalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</>
                )}
              </div>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase"
                style={{
                  backgroundColor: 'var(--app-surface-highlight)',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {cur}
              </span>
            </div>

            {/* Live Equivalent & Fixed Rate (1 USDT = 100 INR) */}
            <div 
              className="flex items-center justify-between text-[11px] pt-2 mt-1 border-t font-mono"
              style={{
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
              }}
            >
              <span>
                {cur === 'INR' ? (
                  <>≈ ${totalUsdt.toFixed(2)} USDT</>
                ) : (
                  <>≈ ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</>
                )}
              </span>
              <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                1 USDT = ₹{rate.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => onOpenDeposit(selectedCurrency)}
              className="py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>

            <button
              onClick={() => onOpenWithdraw(selectedCurrency)}
              className="py-2.5 px-3 rounded-xl border font-heading font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              <span>Withdraw Payout</span>
            </button>
          </div>
        </div>

        {/* Transaction History Section */}
        <div 
          className="rounded-2xl p-4 border transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <Clock className="w-4 h-4 text-teal-500 dark:text-cyan-400" />
              <span>Recent Activity</span>
            </h3>

            {/* Filter buttons */}
            <div 
              className="flex items-center gap-1 p-0.5 rounded-lg border text-[10px]"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              {(['all', 'deposit', 'withdraw', 'commission'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-2 py-1 rounded-md font-medium capitalize cursor-pointer transition-colors ${
                    filterType === tab ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--app-text-dim)' }}>
              No transactions recorded in this category yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTx.map((tx) => {
                const isPositive = tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'plan_reward';
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs overflow-hidden transition-colors duration-250"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                      }`}>
                        {isPositive ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold capitalize truncate" style={{ color: 'var(--app-text-primary)' }}>
                          {tx.type} · <span className="font-mono" style={{ color: 'var(--app-text-secondary)' }}>{tx.currency}</span>
                        </div>
                        <div className="text-[10px] font-mono truncate" style={{ color: 'var(--app-text-dim)' }}>
                          {tx.timestamp}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {isPositive ? '+' : '-'}{tx.currency === 'INR' ? `₹${tx.amount.toLocaleString('en-IN')}` : `$${tx.amount.toFixed(2)}`}
                      </div>
                      <span 
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border inline-block ${
                          tx.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : tx.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {tx.status === 'pending' ? '⏳ Pending' : tx.status === 'completed' ? '✓ Completed' : '✕ Rejected'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
