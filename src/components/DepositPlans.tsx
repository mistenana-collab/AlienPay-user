import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  TrendingUp, 
  Zap, 
  Crown, 
  Clock,
  ArrowRight,
  Shield,
  Coins,
  Percent
} from 'lucide-react';
import { DepositPlan } from '../types';
import { DEPOSIT_PLANS } from '../data/plans';

interface DepositPlansProps {
  activePlanId?: string | null;
  onSelectPlan: (plan: DepositPlan) => void;
  currencyPreference?: 'INR' | 'USDT';
  exchangeRate?: number;
  onOpenCommission?: () => void;
}

export const DepositPlans: React.FC<DepositPlansProps> = ({
  activePlanId,
  onSelectPlan,
  exchangeRate = 100.00,
  onOpenCommission,
}) => {
  const [currencyMode, setCurrencyMode] = useState<'BOTH' | 'USDT' | 'INR'>('BOTH');
  const activePlan = DEPOSIT_PLANS.find(p => p.id === activePlanId);

  return (
    <div className="w-full px-4 pt-2 pb-6 transition-colors duration-250">
      {/* Active Subscription Status Banner if subscribed */}
      {activePlan && (
        <div 
          className="mb-4 rounded-2xl p-3.5 border shadow-lg relative overflow-hidden transition-colors duration-250"
          style={{
            background: 'linear-gradient(to right, var(--app-card-gradient-from), var(--app-surface-highlight))',
            borderColor: 'var(--app-border-strong)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-950 text-xs shadow"
                style={{ backgroundColor: activePlan.badgeColor }}
              >
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold block" style={{ color: 'var(--app-text-secondary)' }}>
                  Active Subscription
                </span>
                <h4 className="font-heading font-extrabold text-sm" style={{ color: 'var(--app-text-primary)' }}>
                  {activePlan.name}
                </h4>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Daily Dividend</span>
              <span className="font-heading font-black text-sm text-emerald-500 dark:text-emerald-400 tabular-nums">
                +1.0% / Day
              </span>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
              <Clock className="w-3.5 h-3.5 text-teal-500 dark:text-cyan-400" />
              <span>Security deposit can always be withdrawn · Keep deposit to earn daily dividend</span>
            </div>
            <button
              onClick={() => onSelectPlan(activePlan)}
              className="text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
              style={{ color: 'var(--app-text-secondary)' }}
            >
              <span>Manage Plan</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-500 dark:text-cyan-400" />
            <h3 className="font-heading font-extrabold text-base tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
              VIP Subscription Plans
            </h3>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
            Earn 1% daily dividend on your security deposit · Withdraw your deposit anytime
          </p>
        </div>

        {/* Currency Display Filter */}
        <div 
          className="flex items-center p-0.5 rounded-lg border text-[10px]"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <button
            onClick={() => setCurrencyMode('BOTH')}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
              currencyMode === 'BOTH' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCurrencyMode('USDT')}
            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
              currencyMode === 'USDT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            USDT
          </button>
          <button
            onClick={() => setCurrencyMode('INR')}
            className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
              currencyMode === 'INR' ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            INR
          </button>
        </div>
      </div>

      {/* Account Running Commission Notice Banner */}
      <div 
        className="mb-3.5 p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%), var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 sm:mt-0">
            <Zap className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-heading font-extrabold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                Account Running Commission is Different
              </h4>
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                Earn Up to 10%
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Instant Settlement
              </span>
            </div>
            <p className="text-[10.5px] mt-0.5 leading-snug" style={{ color: 'var(--app-text-dim)' }}>
              Account running commission is different from VIP security deposits. Earn commission up to 10% with instant automated settlement directly on Gaming & Stock Funds, plus a flat 10% direct referral deposit bonus. Check commission section for more details.
            </p>
          </div>
        </div>

        {onOpenCommission && (
          <button
            type="button"
            onClick={onOpenCommission}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 cursor-pointer shrink-0 py-1.5 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <span>Check Commission Section</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3 Subscription Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEPOSIT_PLANS.map((plan) => {
          const isCurrentActive = activePlanId === plan.id;
          const isGold = plan.id === 'gold';
          const dailyUsdt = plan.usdtAmount * 0.01;
          const dailyInr = plan.inrAmount * 0.01;
          const totalRoiUsdt = dailyUsdt * plan.validityDays;
          const totalRoiInr = dailyInr * plan.validityDays;
          const totalMaturityUsdt = plan.usdtAmount + totalRoiUsdt;
          const totalMaturityInr = plan.inrAmount + totalRoiInr;

          return (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan)}
              className={`rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group select-none border ${
                isCurrentActive
                  ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-xl'
                  : isGold
                  ? 'border-amber-500/50 hover:border-amber-400 shadow-md'
                  : 'hover:border-teal-500/50'
              }`}
              style={{
                background: isCurrentActive 
                  ? 'linear-gradient(to bottom, var(--app-surface-highlight), var(--app-surface))'
                  : 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
                borderColor: isCurrentActive ? undefined : isGold ? undefined : 'var(--app-border)',
                boxShadow: '0 8px 20px -4px var(--app-shadow)',
              }}
            >
              {/* Top Accent Ribbon */}
              {isGold && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}

              {/* Plan Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ 
                      color: plan.badgeColor, 
                      borderColor: `${plan.badgeColor}40`,
                      backgroundColor: `${plan.badgeColor}15`
                    }}
                  >
                    {plan.badge}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Withdraw Anytime
                  </span>
                </div>

                <h4 className="font-heading font-extrabold text-base tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  {plan.name}
                </h4>

                {/* Pricing Block */}
                <div className="mt-2 pb-2.5 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                      Security Deposit:
                    </span>
                    <span className="text-[9.5px] font-mono text-cyan-400 font-bold">
                      {plan.validityDays} Days Term
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    {currencyMode !== 'INR' && (
                      <span className="font-heading font-black text-xl tracking-tight tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                        {plan.usdtAmount} <span className="text-xs font-sans font-bold" style={{ color: 'var(--app-text-secondary)' }}>USDT</span>
                      </span>
                    )}

                    {currencyMode === 'BOTH' && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--app-text-dim)' }}>/</span>
                    )}

                    {currencyMode !== 'USDT' && (
                      <span className="font-heading font-extrabold text-base tabular-nums text-teal-600 dark:text-cyan-300">
                        ₹{plan.inrAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* 1% Daily Dividend Display - Applies when deposit is kept according to tenure */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] font-semibold block" style={{ color: 'var(--app-text-dim)' }}>
                        Daily Dividend Yield:
                      </span>
                      <span className="text-[8.5px] text-emerald-400/90 font-medium">
                        Kept through {plan.validityDays}d tenure
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-black text-emerald-400 text-sm font-mono block">
                        +1.0% / Day
                      </span>
                      <span className="text-[9.5px] font-mono text-emerald-300 font-bold">
                        +${dailyUsdt.toFixed(2)} USDT / +₹{dailyInr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Total ROI return with principal at the last of maturity date */}
                  <div 
                    className="mt-2.5 p-2 rounded-xl border"
                    style={{
                      background: 'linear-gradient(to right, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Maturity Total Return:</span>
                      </span>
                      <span className="font-mono">
                        {currencyMode === 'INR' ? (
                          <>₹{totalMaturityInr.toLocaleString('en-IN')}</>
                        ) : currencyMode === 'USDT' ? (
                          <>${totalMaturityUsdt.toFixed(0)} USDT</>
                        ) : (
                          <>${totalMaturityUsdt.toFixed(0)} / ₹{totalMaturityInr.toLocaleString('en-IN')}</>
                        )}
                      </span>
                    </div>
                    <p className="text-[9.5px] mt-1 leading-tight text-emerald-300/80">
                      Total ROI return with principal at the last of maturity date ({plan.validityDays} days)
                    </p>
                  </div>

                  {/* Account Running Commission Callout - Instant Settlement & Up to 10% */}
                  <div 
                    className="mt-2 p-1.5 rounded-lg border text-[9.5px] leading-tight flex items-start gap-1"
                    style={{
                      backgroundColor: 'rgba(6, 182, 212, 0.06)',
                      borderColor: 'rgba(6, 182, 212, 0.25)',
                      color: 'var(--app-text-secondary)',
                    }}
                  >
                    <Zap className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-cyan-400 font-bold">Account Running Commission is Different:</strong> Earn commission up to 10% with account running featuring <strong>instant settlement</strong>. Check commission section for more account running related commission.
                    </span>
                  </div>

                  {/* Security Deposit Policy: Withdraw Anytime */}
                  <div 
                    className="mt-1.5 p-1.5 rounded-lg border text-[9.5px] leading-tight flex items-start gap-1"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                      color: 'var(--app-text-secondary)',
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-emerald-400 font-bold">Always Withdrawable:</strong> Security deposit can always be withdrawn anytime. For dividend, you can keep your deposit active to earn the 1% daily dividend.
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="py-2.5 space-y-1.5 text-xs">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: 'var(--app-surface-highlight)',
                          borderColor: 'var(--app-border)',
                        }}
                      >
                        <Check className="w-2.5 h-2.5 text-teal-600 dark:text-cyan-400 stroke-[3]" />
                      </div>
                      <span className="text-[11px] leading-tight" style={{ color: 'var(--app-text-body)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer CTA Button */}
              <div className="pt-2 border-t mt-1" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <button
                  type="button"
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-heading font-extrabold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCurrentActive
                      ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30'
                      : isGold
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-teal-600 hover:bg-cyan-400 hover:text-slate-950 text-white dark:bg-teal-900/70 dark:text-cyan-200 border border-teal-600/30 dark:border-teal-700/60'
                  }`}
                >
                  {isCurrentActive ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Current Active Plan</span>
                    </>
                  ) : (
                    <>
                      <span>Activate {plan.name.split(' ')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
