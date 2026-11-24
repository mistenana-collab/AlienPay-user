import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Award, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Coins,
  RefreshCw
} from 'lucide-react';
import { UserProfile, ActiveScreen, WalletBalances } from '../../types';
import { ApiService } from '../../services/apiService';

interface ReferScreenProps {
  user: UserProfile;
  balances?: WalletBalances;
  onNavigate: (screen: ActiveScreen) => void;
}

interface TeamMember {
  id: string;
  name: string;
  userId: string;
  tier: 1 | 2 | 3;
  date: string;
  depositVolume: number;
  commissionEarned: number;
  status: 'Active' | 'VIP';
}

export const ReferScreen: React.FC<ReferScreenProps> = ({
  user,
  balances,
  onNavigate,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [isLoading, setIsLoading] = useState(false);

  const exchangeRate = balances?.exchangeRateUsdtToInr || 100;
  const inviteUrl = `https://www.alienpay.in/?ref=${user.referralCode}`;

  const [tierStats, setTierStats] = useState({
    tier1: {
      name: 'Tier 1 (Direct)',
      rate: '10%',
      desc: 'Direct invitations with your referral code',
      count: 0,
      earnedInr: 0,
      earnedUsdt: 0,
      rateNum: 10,
    },
    tier2: {
      name: 'Tier 2 (Indirect)',
      rate: '5%',
      desc: 'Invited by your Tier 1 direct team partners',
      count: 0,
      earnedInr: 0,
      earnedUsdt: 0,
      rateNum: 5,
    },
    tier3: {
      name: 'Tier 3 (Network)',
      rate: '2%',
      desc: 'Extended multi-tier community network deposits',
      count: 0,
      earnedInr: 0,
      earnedUsdt: 0,
      rateNum: 2,
    },
  });

  const [todayReferral, setTodayReferral] = useState({
    earnedInr: 0,
    earnedUsdt: 0,
    newMembers: 0,
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const loadReferralsFromDb = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.fetchReferrals(user);
      if (data?.tierStats) {
        setTierStats(data.tierStats);
      }
      if (data?.todayReferral) {
        setTodayReferral(data.todayReferral);
      }
      if (Array.isArray(data?.teamMembers)) {
        setTeamMembers(data.teamMembers);
      }
    } catch {
      // keep 0 defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferralsFromDb();
  }, [user.id, user.email]);

  const copy = (val: string, isCode: boolean) => {
    navigator.clipboard.writeText(val);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const totalTeamSize = tierStats.tier1.count + tierStats.tier2.count + tierStats.tier3.count;
  const totalEarnedInr = tierStats.tier1.earnedInr + tierStats.tier2.earnedInr + tierStats.tier3.earnedInr;
  const totalEarnedUsdt = tierStats.tier1.earnedUsdt + tierStats.tier2.earnedUsdt + tierStats.tier3.earnedUsdt;

  const filteredMembers = selectedTierFilter === 'all' 
    ? teamMembers 
    : teamMembers.filter(m => m.tier === selectedTierFilter);

  const handleShareWhatsApp = () => {
    const text = `Join AlienPay using my referral code ${user.referralCode} and earn up to 10% commission on Savings, Current & Corporate OTP work (Gaming & Stock Funds) with instant settlement! Download the Android APK here: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col pb-10 transition-colors duration-250 select-none">
      {/* Top Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border-subtle)',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--app-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <h1 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
          Refer &amp; Earn
        </h1>

        <button
          onClick={loadReferralsFromDb}
          className="p-1.5 rounded-lg cursor-pointer hover:opacity-80"
          style={{ color: 'var(--app-text-secondary)' }}
          title="Refresh Referrals"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Main Banner Card */}
        <div 
          className="rounded-3xl p-4 sm:p-5 border shadow-xl relative overflow-hidden transition-colors duration-250"
          style={{
            background: 'linear-gradient(135deg, var(--app-card-gradient-from), var(--app-card-gradient-to))',
            borderColor: 'var(--app-border)',
            boxShadow: '0 12px 30px -8px var(--app-shadow)',
          }}
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <h2 className="font-heading font-extrabold text-lg tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                Build Your Team &amp; Earn
              </h2>
              <p className="text-xs mt-1 leading-relaxed max-w-xs" style={{ color: 'var(--app-text-dim)' }}>
                Receive instant cash commissions on every deposit made across your 3-tier team network.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/25">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Referral Code & Quick Copy */}
          <div 
            className="mt-4 p-3 rounded-2xl border flex items-center justify-between transition-colors duration-250 relative z-10"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div>
              <span className="text-[10px] block font-medium" style={{ color: 'var(--app-text-dim)' }}>Your Referral Code</span>
              <span className="font-mono text-base font-black tracking-wider text-teal-600 dark:text-cyan-300">
                {user.referralCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copy(user.referralCode, true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Invitation Link Box */}
          <div 
            className="mt-2.5 p-3 rounded-2xl border flex items-center justify-between transition-colors duration-250 relative z-10"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="min-w-0 pr-2">
              <span className="text-[10px] block font-medium" style={{ color: 'var(--app-text-dim)' }}>Your Referral Link</span>
              <span className="font-mono text-xs truncate block font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                {inviteUrl}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => copy(inviteUrl, false)}
                className="p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--app-surface-highlight)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-secondary)',
                }}
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Share on WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Stats Row: Total Team Size | Total Earned | Today Referral */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Total Team Size */}
          <div 
            className="rounded-2xl p-3 border transition-colors duration-250 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>Total Team Size</span>
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-heading font-extrabold text-base tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                {totalTeamSize}
              </span>
              <span className="text-[10px] block text-cyan-400 font-medium">
                Members
              </span>
            </div>
          </div>

          {/* Total Earned Till Now by Referral */}
          <div 
            className="rounded-2xl p-3 border transition-colors duration-250 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>Total Earned</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-heading font-extrabold text-sm tracking-tight text-emerald-600 dark:text-emerald-400 block truncate">
                ₹{totalEarnedInr.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                ${totalEarnedUsdt.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Today Referral */}
          <div 
            className="rounded-2xl p-3 border transition-colors duration-250 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>Today Referral</span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-heading font-extrabold text-sm tracking-tight text-amber-500 dark:text-amber-400 block truncate">
                +₹{todayReferral.earnedInr.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-emerald-500 block">
                +{todayReferral.newMembers} Today
              </span>
            </div>
          </div>
        </div>

        {/* 3 Tier Breakdown Cards */}
        <div 
          className="rounded-3xl p-4 border space-y-3.5 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Tier Commission Breakdown
                </h3>
                <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                  Tier 1, Tier 2, and Tier 3 network rates
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-cyan-400">
              Total: {totalTeamSize} Team
            </span>
          </div>

          {/* 3 Tier Cards Grid */}
          <div className="space-y-2.5">
            {/* Tier 1 (Direct) */}
            <div 
              className="p-3.5 rounded-2xl border transition-all hover:border-cyan-500/40 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
                    T1
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                        Tier One (Direct)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-400 border border-teal-500/30">
                        {tierStats.tier1.rate}
                      </span>
                    </div>
                    <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>
                      {tierStats.tier1.desc}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-heading font-black text-emerald-500 block">
                    ₹{tierStats.tier1.earnedInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ${tierStats.tier1.earnedUsdt.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <span className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                  Active Team Members: <strong className="text-teal-600 dark:text-cyan-300">{tierStats.tier1.count} Partners</strong>
                </span>
                <span className="text-[10px] text-teal-600 dark:text-cyan-400 font-bold">
                  {totalTeamSize > 0 ? ((tierStats.tier1.count / totalTeamSize) * 100).toFixed(0) : 0}% of team
                </span>
              </div>
            </div>

            {/* Tier 2 (Level 2) */}
            <div 
              className="p-3.5 rounded-2xl border transition-all hover:border-cyan-500/40 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black">
                    T2
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                        Tier Two (Level 2)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {tierStats.tier2.rate}
                      </span>
                    </div>
                    <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>
                      {tierStats.tier2.desc}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-heading font-black text-emerald-500 block">
                    ₹{tierStats.tier2.earnedInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ${tierStats.tier2.earnedUsdt.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <span className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                  Active Team Members: <strong className="text-blue-400">{tierStats.tier2.count} Partners</strong>
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {totalTeamSize > 0 ? ((tierStats.tier2.count / totalTeamSize) * 100).toFixed(0) : 0}% of team
                </span>
              </div>
            </div>

            {/* Tier 3 (Level 3) */}
            <div 
              className="p-3.5 rounded-2xl border transition-all hover:border-cyan-500/40 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">
                    T3
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                        Tier Three (Level 3)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {tierStats.tier3.rate}
                      </span>
                    </div>
                    <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>
                      {tierStats.tier3.desc}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-heading font-black text-emerald-500 block">
                    ₹{tierStats.tier3.earnedInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ${tierStats.tier3.earnedUsdt.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <span className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                  Active Team Members: <strong className="text-indigo-400">{tierStats.tier3.count} Partners</strong>
                </span>
                <span className="text-[10px] text-indigo-400 font-bold">
                  {totalTeamSize > 0 ? ((tierStats.tier3.count / totalTeamSize) * 100).toFixed(0) : 0}% of team
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Section Settlement Box */}
        <div 
          className="p-3 sm:p-3.5 rounded-2xl border transition-colors duration-250 shadow-sm"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-teal-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate" style={{ color: 'var(--app-text-primary)' }}>
                  Commission Settlement
                </span>
                <span className="text-[10px] block truncate" style={{ color: 'var(--app-text-dim)' }}>
                  Referral income auto-credits to your Commission Section
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('commission')}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Team Members & Referral History Activity (Real DB Data) */}
        <div 
          className="rounded-3xl p-4 border space-y-3.5 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
              Team Activity &amp; Members
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-[10px]">
              {(['all', 1, 2, 3] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedTierFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedTierFilter === filter
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'bg-black/20 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === 'all' ? 'All Tiers' : `Tier ${filter}`}
                </button>
              ))}
            </div>
          </div>

          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--app-text-dim)' }}>
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No referred team members yet</p>
              <p className="text-[10px] mt-1">Share your referral code above to start earning 10% / 5% / 2% commissions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div 
                  key={member.id}
                  className="p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors duration-250"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 text-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                          {member.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({member.userId})
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                          member.tier === 1 
                            ? 'bg-teal-500/15 border-teal-500/30 text-teal-400' 
                            : member.tier === 2 
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                        }`}>
                          Tier {member.tier} ({member.tier === 1 ? '10%' : member.tier === 2 ? '5%' : '2%'})
                        </span>
                      </div>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--app-text-dim)' }}>
                        <Calendar className="w-3 h-3" />
                        <span>{member.date}</span>
                        <span>· Deposit: ₹{member.depositVolume.toLocaleString('en-IN')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-500 block">
                      +₹{member.commissionEarned.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      +${(member.commissionEarned / exchangeRate).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
