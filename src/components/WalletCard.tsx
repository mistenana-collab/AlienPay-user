import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { WalletBalances } from '../types';

interface WalletCardProps {
  balances: WalletBalances;
  onRefresh?: () => void;
  onDepositClick?: (currency: 'INR' | 'USDT') => void;
  onWithdrawClick?: (currency: 'INR' | 'USDT') => void;
  selectedCurrency?: 'USDT' | 'INR';
  onSelectCurrency?: (currency: 'USDT' | 'INR') => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balances,
  onRefresh,
  selectedCurrency: controlledCurrency,
  onSelectCurrency,
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localCurrency, setLocalCurrency] = useState<'USDT' | 'INR'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return 'USDT';
  });

  const selectedCurrency = controlledCurrency || localCurrency;

  const handleSelectCurrency = (cur: 'USDT' | 'INR') => {
    setLocalCurrency(cur);
    onSelectCurrency?.(cur);
    try {
      localStorage.setItem('alienpay_selected_currency', cur);
    } catch {}
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const rate = balances.exchangeRateUsdtToInr || 100;
  const totalInr = balances.inrBalance + (balances.usdtBalance * rate);
  const totalUsdt = balances.usdtBalance + (balances.inrBalance / rate);

  return (
    <div className="w-full px-4 pt-3 pb-2">
      <div 
        className="w-full rounded-2xl p-4 border shadow-xl relative overflow-hidden transition-colors duration-250"
        style={{
          background: 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
          boxShadow: '0 10px 25px -5px var(--app-shadow)',
        }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header row of the wallet card with currency toggle pill */}
        <div className="flex items-center justify-between text-xs mb-3.5 relative z-10" style={{ color: 'var(--app-text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs" style={{ color: 'var(--app-text-primary)' }}>Main Asset Balance</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: 'var(--app-text-secondary)' }}
              title={showBalance ? 'Hide balance' : 'Show balance'}
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-1 hover:opacity-100 transition-all cursor-pointer ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ color: 'var(--app-text-secondary)' }}
              title="Refresh balances"
              aria-label="Refresh wallet balances"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* USDT / INR Currency Selector Pill (Single currency view) */}
          <div 
            className="flex items-center p-0.5 rounded-xl border transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <button
              onClick={() => handleSelectCurrency('USDT')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCurrency === 'USDT'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'hover:opacity-100'
              }`}
              style={{
                color: selectedCurrency === 'USDT' ? '#021312' : 'var(--app-text-muted)',
              }}
            >
              USDT
            </button>
            <button
              onClick={() => handleSelectCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCurrency === 'INR'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'hover:opacity-100'
              }`}
              style={{
                color: selectedCurrency === 'INR' ? '#021312' : 'var(--app-text-muted)',
              }}
            >
              INR
            </button>
          </div>
        </div>

        {/* Prominent Single Balance Display: in USDT or INR */}
        <div className="relative z-10 my-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedCurrency === 'USDT' ? '#10b981' : '#00bcd4' }}
            ></span>
            <span className="text-xs font-semibold" style={{ color: 'var(--app-text-muted)' }}>
              {selectedCurrency === 'USDT' ? 'Tether (USDT) Available Balance' : 'Indian Rupee (INR) Available Balance'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <div 
              className="font-heading font-black text-3xl sm:text-4xl tracking-tight tabular-nums" 
              style={{ color: 'var(--app-text-primary)' }}
            >
              {showBalance ? (
                selectedCurrency === 'USDT' ? (
                  <>${totalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  <>₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                )
              ) : (
                <span className="tracking-widest">••••••••</span>
              )}
            </div>

            <span 
              className="text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                color: 'var(--app-text-secondary)',
              }}
            >
              {selectedCurrency}
            </span>
          </div>

          {/* Direct live conversion equivalent */}
          <div className="text-xs mt-2 flex items-center justify-between font-mono" style={{ color: 'var(--app-text-dim)' }}>
            <span>
              {showBalance ? (
                selectedCurrency === 'USDT' ? (
                  <>≈ ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</>
                ) : (
                  <>≈ ${totalUsdt.toFixed(2)} USDT</>
                )
              ) : (
                '≈ ••••••'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
