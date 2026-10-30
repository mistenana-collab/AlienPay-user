import React from 'react';
import { 
  X, 
  Home, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Crown, 
  Users, 
  Percent, 
  User, 
  Settings, 
  Headphones, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { ActiveScreen, UserProfile, WalletBalances, ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SlidingNavbarProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  user: UserProfile | null;
  balances: WalletBalances;
  onLogout: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  selectedCurrency?: 'USDT' | 'INR';
  onSelectCurrency?: (currency: 'USDT' | 'INR') => void;
}

export const SlidingNavbar: React.FC<SlidingNavbarProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  user,
  balances,
  onLogout,
  theme,
  onToggleTheme,
  selectedCurrency: controlledCurrency,
  onSelectCurrency,
}) => {
  const [internalCurrency, setInternalCurrency] = React.useState<'USDT' | 'INR'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return 'USDT';
  });

  const activeCurrency = controlledCurrency || internalCurrency;

  const handleCurrencyChange = (cur: 'USDT' | 'INR') => {
    setInternalCurrency(cur);
    onSelectCurrency?.(cur);
    try {
      localStorage.setItem('alienpay_selected_currency', cur);
    } catch {}
  };

  const rate = balances.exchangeRateUsdtToInr || 100;
  const totalInr = balances.inrBalance + (balances.usdtBalance * rate);
  const totalUsdt = balances.usdtBalance + (balances.inrBalance / rate);

  if (!isOpen) return null;

  const menuItems: { id: ActiveScreen; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'wallet', label: 'Dual Wallet (INR & USDT)', icon: Wallet },
    { id: 'plans', label: 'VIP Subscription Plans', icon: Crown, badge: 'Daily ROI' },
    { id: 'deposit', label: 'Deposit Money', icon: ArrowDownToLine, badge: 'Instant' },
    { id: 'withdraw', label: 'Withdraw Payout', icon: ArrowUpFromLine },
    { id: 'refer', label: 'Refer & Earn', icon: Users, badge: 'Up to 10%' },
    { id: 'commission', label: 'Commission Panel', icon: Percent },
    { id: 'profile', label: 'Profile & KYC', icon: User },
    { id: 'settings', label: 'Settings & Theme', icon: Settings },
    { id: 'support', label: '24/7 Live Support', icon: Headphones },
  ];

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide Drawer Content */}
      <div 
        className="relative w-4/5 max-w-xs h-full flex flex-col shadow-2xl border-r z-10 animate-in slide-in-from-left duration-250 transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-drawer-bg)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
        }}
      >
        {/* Drawer Header with User Card */}
        <div 
          className="p-4 border-b transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-drawer-card)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 font-heading font-black text-xs">
                AP
              </div>
              <span className="font-heading font-black text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-emerald-400 dark:from-cyan-400 dark:to-emerald-300 bg-clip-text text-transparent">
                AlienPay
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer transition-opacity"
              style={{ color: 'var(--app-text-secondary)' }}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User mini profile banner */}
          <div 
            onClick={() => { onNavigate('profile'); onClose(); }}
            className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-full border-2 p-0.5 shrink-0"
              style={{ borderColor: 'var(--app-text-secondary)' }}
            >
              {(user?.avatarUrl || (user as any)?.profilePhoto) ? (
                <img src={user?.avatarUrl || (user as any)?.profilePhoto} alt={user?.fullName || 'User'} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--app-surface-highlight)', color: 'var(--app-text-secondary)' }}
                >
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--app-text-primary)' }}>
                  {user?.fullName || 'AlienPay User'}
                </span>
                {user?.kycStatus === 'verified' && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: 'var(--app-text-dim)' }}>
                UID: {user?.alienPayId || 'AP-000000'}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
          </div>

          {/* Combined Single Balance Box with Currency Switcher (1 USDT = 100 INR) */}
          <div 
            className="mt-3 p-2.5 rounded-xl border transition-all"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Asset Balance
              </span>

              {/* Currency Switcher: USDT | INR */}
              <div 
                className="flex items-center p-0.5 rounded-lg border text-[10px]"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('USDT')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    activeCurrency === 'USDT'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    color: activeCurrency === 'USDT' ? '#021312' : 'var(--app-text-muted)',
                  }}
                >
                  USDT
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('INR')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                    activeCurrency === 'INR'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    color: activeCurrency === 'INR' ? '#021312' : 'var(--app-text-muted)',
                  }}
                >
                  INR
                </button>
              </div>
            </div>

            {/* Main Single Balance Display */}
            <div className="flex items-baseline justify-between">
              <div className="font-heading font-black text-lg tracking-tight tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {activeCurrency === 'USDT' ? (
                  <>${totalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  <>₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                )}
              </div>
              <span 
                className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: 'var(--app-surface-highlight)',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {activeCurrency}
              </span>
            </div>

            {/* Live Conversion Rate & Equivalent (1 USDT = 100 INR) */}
            <div 
              className="flex items-center justify-between text-[10px] mt-1.5 pt-1.5 border-t font-mono"
              style={{
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
              }}
            >
              <span>
                {activeCurrency === 'USDT' ? (
                  <>≈ ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</>
                ) : (
                  <>≈ ${totalUsdt.toFixed(2)} USDT</>
                )}
              </span>
              <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                1 USDT = ₹{rate.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isCurrent
                    ? 'border shadow-sm'
                    : 'hover:opacity-100 opacity-80'
                }`}
                style={{
                  backgroundColor: isCurrent ? 'var(--app-surface-highlight)' : 'transparent',
                  borderColor: isCurrent ? 'var(--app-border-strong)' : 'transparent',
                  color: isCurrent ? 'var(--app-text-secondary)' : 'var(--app-text-primary)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{
                      backgroundColor: isCurrent ? 'var(--app-text-secondary)' : 'var(--app-surface-subtle)',
                      color: isCurrent ? 'var(--app-bg-canvas)' : 'var(--app-text-secondary)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">{item.label}</span>
                </div>

                {item.badge && (
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: 'var(--app-surface-highlight)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text-secondary)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer with Theme Toggle & Logout */}
        <div 
          className="p-3 border-t space-y-2"
          style={{
            backgroundColor: 'var(--app-surface-subtle)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <PWAInstallButton label="Install AlienPay App" />
          {onToggleTheme && (
            <button
              type="button"
              onClick={() => onToggleTheme?.()}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-primary)'
              }}
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                <span>Theme Mode</span>
              </div>
              <span className="text-[11px] capitalize font-bold" style={{ color: 'var(--app-text-secondary)' }}>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-white transition-all text-xs font-bold cursor-pointer shadow-sm active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <div className="text-center text-[10px] opacity-60 font-mono leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
            <div>All Rights Reserved © 2026</div>
            <div>AlienPay Android v3.4.1</div>
          </div>
        </div>
      </div>
    </div>
  );
};
