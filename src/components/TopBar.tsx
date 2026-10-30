import React from 'react';
import { Menu, User, ShieldCheck, Sun, Moon } from 'lucide-react';
import { UserProfile, ThemeMode } from '../types';

interface TopBarProps {
  user: UserProfile | null;
  onOpenDrawer: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onOpenDrawer,
  onOpenProfile,
  theme,
  onToggleTheme,
}) => {
  return (
    <header 
      className="sticky top-0 z-20 w-full backdrop-blur-md px-4 py-3 border-b flex items-center justify-between transition-colors duration-250"
      style={{
        backgroundColor: 'var(--app-header-bg)',
        borderColor: 'var(--app-border-subtle)'
      }}
    >
      {/* Left: Hamburger menu toggle for sliding navbar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
          style={{
            backgroundColor: 'var(--app-surface-subtle)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-secondary)',
          }}
          aria-label="Open navigation drawer"
          title="Open slide navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Wordmark brand name matching screenshot with AlienPay branding */}
        <div className="flex items-center gap-1.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-sm shadow-cyan-500/30">
            <span className="font-heading font-black text-black text-xs tracking-tighter">AP</span>
          </div>
          <span className="font-heading font-extrabold text-2xl tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-300 bg-clip-text text-transparent">
            AlienPay
          </span>
        </div>
      </div>

      {/* Right: Quick Theme toggle & Profile Avatar Icon */}
      <div className="flex items-center gap-2">
        {onToggleTheme && (
          <button
            type="button"
            onClick={() => onToggleTheme?.()}
            className="w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-secondary)'
            }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-600" />
            )}
          </button>
        )}

        {user?.kycStatus === 'verified' && (
          <div 
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--app-surface-highlight)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-secondary)'
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>KYC Verified</span>
          </div>
        )}

        <button
          onClick={onOpenProfile}
          className="relative group cursor-pointer focus:outline-none"
          title="Open profile details"
          aria-label="View profile"
        >
          <div 
            className="w-10 h-10 rounded-full border-2 p-0.5 transition-colors flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
            style={{
              borderColor: 'var(--app-text-secondary)',
              backgroundColor: 'var(--app-surface-subtle)',
            }}
          >
            {(user?.avatarUrl || (user as any)?.profilePhoto) ? (
              <img
                src={user?.avatarUrl || (user as any)?.profilePhoto}
                alt={user?.fullName || 'User'}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--app-surface-highlight)', color: 'var(--app-text-secondary)' }}
              >
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
          {/* Active indicator dot */}
          <span 
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2"
            style={{ borderColor: 'var(--app-bg-main)' }}
          ></span>
        </button>
      </div>
    </header>
  );
};
