import React from 'react';
import { Crown, Zap, ShieldCheck, ArrowRight, X, Percent, Building2 } from 'lucide-react';

interface SubscriptionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans: () => void;
  bankName?: string;
}

export const SubscriptionRequiredModal: React.FC<SubscriptionRequiredModalProps> = ({
  isOpen,
  onClose,
  onOpenPlans,
  bankName = 'Bank Account',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm rounded-3xl shadow-2xl relative border overflow-hidden animate-in zoom-in-95 duration-150 transition-colors"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
          boxShadow: '0 25px 50px -12px var(--app-shadow)',
        }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:opacity-80 transition-opacity cursor-pointer z-10"
          style={{ color: 'var(--app-text-dim)', backgroundColor: 'var(--app-surface-subtle)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 text-center relative z-10 space-y-4">
          {/* Crown Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Crown className="w-7 h-7 stroke-[2.2]" />
          </div>

          {/* Badge & Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Inactive Plan</span>
            </div>
            <h3 className="font-heading font-black text-lg tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
              VIP Subscription Required
            </h3>
            <p className="text-xs leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--app-text-dim)' }}>
              To start live OTP work on <strong className="font-semibold" style={{ color: 'var(--app-text-primary)' }}>{bankName}</strong> and earn up to 10% running commission, please activate a VIP subscription plan.
            </p>
          </div>

          {/* Perks Highlight Box */}
          <div 
            className="p-3 rounded-2xl border text-left space-y-2 text-xs"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <Percent className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[11px]" style={{ color: 'var(--app-text-secondary)' }}>
                Earn up to 10% turnover commission
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[11px]" style={{ color: 'var(--app-text-secondary)' }}>
                Instant automated INR IMPS settlements
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-[11px]" style={{ color: 'var(--app-text-secondary)' }}>
                Runs Savings, Current & Corporate accounts
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onOpenPlans}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-heading font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Take a Subscription</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-dim)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
