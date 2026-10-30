import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  Coins, 
  CreditCard,
  Crown,
  Clock,
  ArrowRight,
  Percent,
  Zap
} from 'lucide-react';
import { DepositPlan, WalletBalances, UserProfile } from '../../types';

interface PlanDetailModalProps {
  plan: DepositPlan | null;
  isOpen: boolean;
  onClose: () => void;
  balances: WalletBalances;
  user: UserProfile;
  onActivateSuccess: (planId: string) => void;
  onOpenDeposit: (currency: 'INR' | 'USDT') => void;
  onOpenCommission?: () => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  isOpen,
  onClose,
  balances,
  user,
  onActivateSuccess,
  onOpenDeposit,
  onOpenCommission,
}) => {
  if (!isOpen || !plan) return null;

  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cost = plan.usdtAmount;
  const currentBal = balances.usdtBalance;
  const hasSufficient = currentBal >= cost;

  const dailyReturnUsdt = plan.usdtAmount * 0.01;
  const dailyReturnInr = plan.inrAmount * 0.01;
  const totalReturnUsdt = dailyReturnUsdt * plan.validityDays;
  const totalReturnInr = dailyReturnInr * plan.validityDays;
  const totalMaturityUsdt = plan.usdtAmount + totalReturnUsdt;
  const totalMaturityInr = plan.inrAmount + totalReturnInr;

  const handleActivate = () => {
    setErrorMsg(null);
    if (!hasSufficient) {
      setErrorMsg(`Insufficient USDT balance. Need $${cost} USDT. (Available: $${currentBal.toFixed(2)} USDT)`);
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      onActivateSuccess(plan.id);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none overflow-y-auto">
      <div 
        className="w-full max-w-sm rounded-3xl shadow-2xl relative border animate-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col transition-colors duration-250 overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface), var(--app-surface-subtle))',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
          boxShadow: '0 20px 40px -10px var(--app-shadow)',
        }}
      >
        
        {/* Header - Fixed at top */}
        <div 
          className="p-4 pb-3 border-b flex items-center justify-between shrink-0" 
          style={{ 
            borderColor: 'var(--app-border-subtle)',
            backgroundColor: 'var(--app-header-bg)',
          }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center font-heading font-black text-slate-950 text-xs shadow-md"
              style={{ backgroundColor: plan.badgeColor }}
            >
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base" style={{ color: 'var(--app-text-primary)' }}>
                {plan.name} Subscription
              </h3>
              <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>1.0% Daily Dividend · Withdraw Anytime</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg cursor-pointer hover:opacity-80" style={{ color: 'var(--app-text-dim)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Benefits & Returns Content Body */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-3 scrollbar-thin">
          {/* Pricing Banner */}
          <div 
            className="rounded-2xl p-3 border flex items-center justify-between transition-colors duration-250"
            style={{
              background: 'linear-gradient(to right, var(--app-surface-highlight), var(--app-surface))',
              borderColor: 'var(--app-border)',
            }}
          >
            <div>
              <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Security Deposit</span>
              <div className="font-heading font-extrabold text-lg" style={{ color: 'var(--app-text-primary)' }}>
                {plan.usdtAmount} USDT <span className="text-xs font-semibold font-sans" style={{ color: 'var(--app-text-secondary)' }}>or ₹{plan.inrAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Tenure Duration</span>
              <span className="text-xs font-bold font-mono text-teal-600 dark:text-cyan-300">{plan.validityDays} Days</span>
            </div>
          </div>

          {/* Projected Returns Box */}
          <div 
            className="rounded-xl p-3 border space-y-2 text-xs transition-colors duration-250"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
              <span>Security Deposit:</span>
              <span className="font-bold font-mono text-emerald-400">
                100% Refundable (Withdraw Anytime)
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
              <span>Daily Dividend Yield:</span>
              <span className="font-bold text-emerald-500 font-mono">
                +1.0% / Day (+${dailyReturnUsdt.toFixed(2)} / ₹{dailyReturnInr.toLocaleString('en-IN')})
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
              <span>Total Maturity ROI:</span>
              <span className="font-bold font-mono" style={{ color: 'var(--app-text-primary)' }}>
                +{plan.maturityRoiPercent}% (+${totalReturnUsdt.toFixed(0)} USDT / +₹{totalReturnInr.toLocaleString('en-IN')})
              </span>
            </div>

            <div 
              className="p-2.5 rounded-xl border mt-1 font-mono"
              style={{
                background: 'linear-gradient(to right, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.1))',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              }}
            >
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Total Payout at Maturity:</span>
                </span>
                <span>
                  ${totalMaturityUsdt.toFixed(0)} USDT / ₹{totalMaturityInr.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-[9.5px] text-emerald-300/80 font-sans mt-0.5">
                Total ROI return with principal at the last of maturity date ({plan.validityDays} days)
              </div>
            </div>

            {/* Security Deposit Policy Callout: Always withdrawable */}
            <div 
              className="p-2.5 rounded-xl border flex items-start gap-2 text-[10px] leading-relaxed"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: 'var(--app-text-secondary)',
              }}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-400 block font-bold mb-0.5">Security Deposit & Dividend Policy</strong>
                <span>Security deposit can always be withdrawn at any time. For daily dividends, simply keep your deposit in your account to earn 1% daily dividend, paid with principal at maturity ({plan.validityDays} days).</span>
              </div>
            </div>

            {/* Account Running Commission Callout - Instant Settlement */}
            <div 
              className="p-2.5 rounded-xl border flex items-start justify-between gap-2 text-[10px] leading-relaxed"
              style={{
                backgroundColor: 'rgba(6, 182, 212, 0.08)',
                borderColor: 'rgba(6, 182, 212, 0.3)',
                color: 'var(--app-text-secondary)',
              }}
            >
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-cyan-400 font-bold">Account Running Commission is Different</strong>
                    <span className="text-[8.5px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 rounded">
                      Instant Settlement
                    </span>
                  </div>
                  <span className="block mt-0.5">
                    Earn commission up to 10% with account running on Gaming & Stock Funds, plus a 10% direct referral deposit bonus. All commissions feature instant real-time settlement directly into your wallet. Check commission section for details.
                  </span>
                </div>
              </div>
              {onOpenCommission && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCommission();
                  }}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 shrink-0 cursor-pointer pt-0.5"
                >
                  Check
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <span style={{ color: 'var(--app-text-dim)' }}>Settlement Cycle:</span>
              <span className="font-bold text-teal-600 dark:text-cyan-300">1% Daily Accrual · Full Maturity Payout ({plan.validityDays}d)</span>
            </div>
          </div>

          {/* Included Features / Subscription Privileges */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] font-semibold block" style={{ color: 'var(--app-text-muted)' }}>Subscription Privileges:</span>
            <div className="space-y-1">
              {plan.features.map((feat, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px]"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                    color: 'var(--app-text-body)',
                  }}
                >
                  <Check className="w-3 h-3 text-teal-600 dark:text-cyan-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button Footer - Always visible, never cut off */}
        <div 
          className="p-4 pt-3 border-t shrink-0 space-y-2"
          style={{ 
            borderColor: 'var(--app-border-subtle)',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          {errorMsg && (
            <div className="bg-red-950/60 border border-red-800/60 text-red-200 p-2 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1 text-[11px]">{errorMsg}</div>
            </div>
          )}

          {hasSufficient ? (
            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isActivating ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  <span>Confirm & Activate {plan.name}</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeposit('USDT');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>Deposit USDT to Activate</span>
              </button>
              <div className="flex items-center justify-between text-[10px] px-1" style={{ color: 'var(--app-text-dim)' }}>
                <span>Required: <strong className="text-amber-400">{cost} USDT</strong></span>
                <span>Available USDT: <strong className="font-mono text-cyan-400">${balances.usdtBalance.toFixed(2)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
