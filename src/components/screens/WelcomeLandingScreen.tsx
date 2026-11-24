import React from 'react';
import { 
  ArrowRight, 
  Percent, 
  Building2, 
  Users,
  Sparkles
} from 'lucide-react';

interface WelcomeLandingScreenProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onExplore?: () => void;
}

export const WelcomeLandingScreen: React.FC<WelcomeLandingScreenProps> = ({
  onGetStarted,
}) => {
  return (
    <div 
      className="min-h-full flex flex-col justify-between transition-colors duration-250 select-none pb-4"
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text-primary)',
      }}
    >
      {/* Top Header - Centered AlienPay Brand */}
      <header 
        className="sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-center transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center shadow-md shadow-cyan-500/20 text-slate-950 font-black text-base font-heading">
            AP
          </div>
          <span className="font-heading font-black text-lg tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            AlienPay
          </span>
        </div>
      </header>

      {/* Main Container - Focused Hero & Metrics */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 pb-6 space-y-4 flex flex-col justify-center">
        {/* 1. Hero Title & Value Proposition */}
        <section className="text-center space-y-2.5 pt-1">
          {/* Centered Brand Emblem & Standard Size AlienPay */}
          <div className="flex flex-col items-center justify-center gap-1.5 mb-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-slate-950 font-black text-2xl font-heading">
              AP
            </div>
            <span className="font-heading font-black text-2xl tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
              AlienPay
            </span>
            <p className="text-[11px] font-medium" style={{ color: 'var(--app-text-dim)' }}>
              Automated Payout & Commission Gateway
            </p>
          </div>

          {/* Accepting All Accounts Pill Badge */}
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold shadow-sm"
            style={{
              backgroundColor: 'var(--app-surface-highlight)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Accepting Savings · Current · Corporate for OTP Work</span>
          </div>

          <h1 className="font-heading font-black text-xl sm:text-2xl tracking-tight leading-snug" style={{ color: 'var(--app-text-primary)' }}>
            Run Your Account,{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Earn Up to 10% Commission
            </span>
          </h1>

          {/* 3 Distinct Value Highlights (Accepts All Bank Accounts, Refer & Earn Up to 10%, Get Commission Up to 10%) */}
          <div className="space-y-1.5 max-w-sm mx-auto pt-1 text-left">
            {/* Line 1: Accepts All Bank Accounts */}
            <div 
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="w-5 h-5 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Accepts All Bank Accounts
                </div>
                <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                  Savings, Current & Corporate accounts supported for OTP work
                </div>
              </div>
            </div>

            {/* Line 2: Refer & Earn Up to 10% */}
            <div 
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="w-5 h-5 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Refer & Earn Up to 10%
                </div>
                <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                  Instant cash rewards on referee deposits & team turnover
                </div>
              </div>
            </div>

            {/* Line 3: Get Commission Up to 10% */}
            <div 
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Percent className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold leading-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Get Commission Up to 10%
                </div>
                <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                  Automated INR IMPS settlements credited directly to your bank
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button - Opens Auth Login Page */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </section>

        {/* 2. Live Platform Metrics Strip - Processed Volume ₹50M+ / Payout Success 99.9% */}
        <section 
          className="grid grid-cols-3 gap-2 p-3 rounded-2xl border text-center shadow-sm"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div>
            <div className="font-heading font-black text-sm sm:text-base text-cyan-400 font-mono tracking-tight">
              ₹50M+
            </div>
            <div className="text-[9px] font-medium" style={{ color: 'var(--app-text-dim)' }}>
              Processed Volume
            </div>
          </div>
          <div className="border-x" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="font-heading font-black text-sm sm:text-base text-emerald-400 font-mono tracking-tight">
              99.9%
            </div>
            <div className="text-[9px] font-medium" style={{ color: 'var(--app-text-dim)' }}>
              Payout Success
            </div>
          </div>
          <div>
            <div className="font-heading font-black text-sm sm:text-base text-teal-400 font-mono tracking-tight">
              &lt;10 Min
            </div>
            <div className="text-[9px] font-medium" style={{ color: 'var(--app-text-dim)' }}>
              Settlement Speed
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
