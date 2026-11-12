import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  ArrowRight, 
  Sparkles, 
  Gift
} from 'lucide-react';
import { UserProfile, ActiveScreen } from '../types';

interface ReferralPromoCardProps {
  user: UserProfile;
  onNavigate: (screen: ActiveScreen) => void;
}

export const ReferralPromoCard: React.FC<ReferralPromoCardProps> = ({
  user,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `https://www.alienpay.in/?ref=${user.referralCode}`;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Join AlienPay using my referral code ${user.referralCode} and earn up to 10% commission on Savings, Current & Corporate OTP work (Gaming & Stock Funds) with instant settlement! Download the Android APK here: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="w-full px-4 py-2 select-none">
      <div 
        onClick={() => onNavigate('refer')}
        className="rounded-3xl p-4 border relative overflow-hidden transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-cyan-500/10 active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.12) 50%, var(--app-surface) 100%)',
          borderColor: 'var(--app-border)',
        }}
      >
        {/* Decorative corner glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-400/15 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

        {/* Top Tag & High-Impact Reward Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/35 text-teal-600 dark:text-cyan-300 text-[10px] font-black tracking-wide uppercase">
            <Gift className="w-3 h-3 text-cyan-400 animate-bounce" />
            <span>Referral Special Offer</span>
          </div>

          <span className="text-[10px] font-mono font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Instant Cash</span>
          </span>
        </div>

        {/* Main Headline & Description */}
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg tracking-tight flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--app-text-primary)' }}>
                <span>Refer & Earn</span>
                <span className="text-emerald-500 dark:text-emerald-400 drop-shadow-sm font-black">
                  ₹10,000 INR
                </span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                  Instantly
                </span>
              </h3>
              <p className="text-[11px] leading-snug mt-1" style={{ color: 'var(--app-text-dim)' }}>
                Invite partners to invest & earn up to 10% direct commission. Promote your link for maximum daily cash profits.
              </p>
            </div>

            <div className="w-11 h-11 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Quick Action Bar: Referral Code + Copy + WhatsApp Share */}
          <div 
            className="mt-3 p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[9px] block font-semibold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>
                Your Code:
              </span>
              <span className="font-mono text-sm font-black text-teal-600 dark:text-cyan-300 tracking-wider">
                {user.referralCode}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                style={{
                  backgroundColor: 'var(--app-surface-highlight)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-secondary)',
                }}
                title="Copy Referral Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Share on WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">WhatsApp</span>
              </button>

              <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
