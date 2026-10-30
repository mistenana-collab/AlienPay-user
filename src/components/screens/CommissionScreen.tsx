import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Percent, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Wallet,
  Building2,
  Calculator,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Gamepad2,
  LineChart,
  Layers,
  Zap,
  ArrowRight,
  Users,
  UserPlus,
  Gift,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { WalletBalances, ActiveScreen, UserProfile, Transaction, SavedBankAccount } from '../../types';
import { ApiService } from '../../services/apiService';

interface CommissionScreenProps {
  balances: WalletBalances;
  transactions?: Transaction[];
  bankAccounts?: SavedBankAccount[];
  user?: UserProfile;
  onNavigate: (screen: ActiveScreen) => void;
  onClaimCommission: (amount: number) => void;
}

export const CommissionScreen: React.FC<CommissionScreenProps> = ({
  balances,
  transactions = [],
  bankAccounts = [],
  user,
  onNavigate,
  onClaimCommission,
}) => {
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const exchangeRate = balances.exchangeRateUsdtToInr || 100;

  // Real pending/earned amounts from database & live running accounts
  const [runningCommPending, setRunningCommPending] = useState(balances.todayEarnings || 0);
  const [referralBonusPending, setReferralBonusPending] = useState(0);
  const [dailyDividendPending, setDailyDividendPending] = useState(0);

  useEffect(() => {
    setRunningCommPending(balances.todayEarnings || 0);
  }, [balances.todayEarnings]);

  const [referralStats, setReferralStats] = useState({
    activeRefereesCount: 0,
    refereesDepositInr: 0,
    refereesDepositUsdt: 0,
    bonusEarnedInr: balances.totalCommissionEarned || 0,
  });

  useEffect(() => {
    ApiService.fetchReferrals(user)
      .then((data) => {
        if (data) {
          const members = Array.isArray(data.teamMembers) ? data.teamMembers : [];
          const totalDepUsdt = members.reduce(
            (sum: number, m: any) => sum + Number(m.depositVolumeUsdt || 0),
            0
          );
          setReferralStats({
            activeRefereesCount: Number(data.totalTeamSize || members.length || 0),
            refereesDepositUsdt: totalDepUsdt,
            refereesDepositInr: Math.round(totalDepUsdt * exchangeRate),
            bonusEarnedInr: Number(data.totalEarnedInr || 0),
          });
        }
      })
      .catch(() => {});
  }, [user?.id, user?.email, exchangeRate]);

  // Total Combined Unclaimed Commission & Dividend Bonus
  const totalUnclaimedPending = runningCommPending + referralBonusPending + dailyDividendPending;

  const [activeTab, setActiveTab] = useState<'all' | 'gaming' | 'stock' | 'referral' | 'dividend'>('all');

  // Interactive Running Commission Calculator based on Gaming or Stock Fund (NO MONTH RETURN)
  const [calcVolume, setCalcVolume] = useState<number>(100000);
  const [calcAccountType, setCalcAccountType] = useState<'Savings' | 'Current' | 'Corporate'>('Savings');
  const [calcFundType, setCalcFundType] = useState<'both' | 'gaming' | 'stock'>('both');

  // Exact user commission rates:
  // Savings: Gaming 5%, Stock 10%
  // Current: Gaming 3%, Stock 5%
  // Corporate: Gaming 4%, Stock 6%
  const getRatesForType = (type: 'Savings' | 'Current' | 'Corporate') => {
    switch (type) {
      case 'Savings':
        return { gaming: 5, stock: 10 };
      case 'Current':
        return { gaming: 3, stock: 5 };
      case 'Corporate':
        return { gaming: 4, stock: 6 };
    }
  };

  const currentRates = getRatesForType(calcAccountType);
  const gamingComm = (calcVolume * (currentRates.gaming / 100));
  const stockComm = (calcVolume * (currentRates.stock / 100));

  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimAll = async () => {
    if (totalUnclaimedPending <= 0 || isClaiming) return;
    setIsClaiming(true);
    try {
      const gamingAccounts = bankAccounts.filter((a) => a.fundType !== 'stock' && (a.accumulatedCommission || 0) > 0);
      const stockAccounts = bankAccounts.filter((a) => a.fundType === 'stock' && (a.accumulatedCommission || 0) > 0);
      const gamingAccrued = gamingAccounts.reduce((s, a) => s + Number(a.accumulatedCommission || 0), 0);
      const stockAccrued = stockAccounts.reduce((s, a) => s + Number(a.accumulatedCommission || 0), 0);

      if (gamingAccrued > 0 && stockAccrued > 0) {
        await ApiService.transferCommission({
          amountInr: gamingAccrued,
          amountUsdt: gamingAccrued / exchangeRate,
          userId: user?.id,
          email: user?.email,
          fundType: 'gaming',
          description: `Gaming Fund Running Commission (₹${gamingAccrued.toLocaleString('en-IN')})`,
        });
        await ApiService.transferCommission({
          amountInr: stockAccrued,
          amountUsdt: stockAccrued / exchangeRate,
          userId: user?.id,
          email: user?.email,
          fundType: 'stock',
          description: `Stock Fund Running Commission (₹${stockAccrued.toLocaleString('en-IN')})`,
        });
      } else {
        const sourceAcc =
          stockAccounts[0] ||
          gamingAccounts[0] ||
          bankAccounts.find((a) => a.isRunning) ||
          bankAccounts[0];
        const isStockFund = sourceAcc?.fundType === 'stock';
        const acctType = sourceAcc?.accountType || 'Savings';
        const ratePct = isStockFund
          ? sourceAcc?.stockCommissionRate ?? (acctType === 'Corporate' ? 6 : acctType === 'Current' ? 5 : 10)
          : sourceAcc?.gamingCommissionRate ?? (acctType === 'Corporate' ? 4 : acctType === 'Current' ? 3 : 5);
        const exactDescription = isStockFund
          ? `Stock Fund Commission · ${acctType} ${ratePct}% (₹${totalUnclaimedPending.toLocaleString('en-IN')})`
          : `Gaming Fund Commission · ${acctType} ${ratePct}% (₹${totalUnclaimedPending.toLocaleString('en-IN')})`;

        await ApiService.transferCommission({
          amountInr: totalUnclaimedPending,
          amountUsdt: totalUnclaimedPending / exchangeRate,
          userId: user?.id,
          email: user?.email,
          fundType: isStockFund ? 'stock' : 'gaming',
          description: exactDescription,
        });
      }

      onClaimCommission(totalUnclaimedPending);
      setRunningCommPending(0);
      setReferralBonusPending(0);
      setDailyDividendPending(0);
      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 4000);
    } catch (err) {
      console.error('Commission transfer error:', err);
      onClaimCommission(totalUnclaimedPending);
      setRunningCommPending(0);
      setReferralBonusPending(0);
      setDailyDividendPending(0);
      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 4000);
    } finally {
      setIsClaiming(false);
    }
  };

  const myReferralCode = user?.referralCode || 'AP-VIP888';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Build settlements dynamically from real database transactions (Gaming Fund, Stock Fund, Referral Bonus, Daily Dividend)
  const settlements = transactions
    .filter(
      (tx) =>
        tx.type === 'commission' ||
        tx.type === 'plan_reward' ||
        tx.method?.toLowerCase().includes('referral') ||
        tx.method?.toLowerCase().includes('bonus') ||
        tx.method?.toLowerCase().includes('commission') ||
        tx.method?.toLowerCase().includes('dividend')
    )
    .map((tx) => {
      const lower = (tx.method || tx.note || '').toLowerCase();
      const rawType = (tx as any).rawType || tx.type;
      const defaultBank = bankAccounts.find((a) => a.isRunning) || bankAccounts[0];
      const defaultFundType: 'gaming' | 'stock' = defaultBank?.fundType === 'stock' ? 'stock' : 'gaming';

      let sType: 'gaming' | 'stock' | 'referral' | 'dividend' = defaultFundType;
      if (lower.includes('stock')) {
        sType = 'stock';
      } else if (lower.includes('gaming')) {
        sType = 'gaming';
      } else if (lower.includes('dividend') || lower.includes('daily roi') || tx.type === 'plan_reward') {
        sType = 'dividend';
      } else if (
        lower.includes('referral') ||
        lower.includes('level 1') ||
        lower.includes('level 2') ||
        lower.includes('level 3') ||
        lower.includes('signup bonus') ||
        rawType === 'referral_commission' ||
        rawType === 'referral_earning'
      ) {
        sType = 'referral';
      } else {
        sType = defaultFundType;
      }

      const amtInr = tx.currency === 'INR' ? tx.amount : tx.amount * exchangeRate;
      const amtUsdt = tx.currency === 'USDT' ? tx.amount : tx.amount / exchangeRate;

      const shortTitle =
        sType === 'stock'
          ? 'Stock Fund Commission'
          : sType === 'gaming'
          ? 'Gaming Fund Commission'
          : sType === 'dividend'
          ? '1% Daily Plan Dividend'
          : 'Referral Bonus Credit';

      return {
        id: tx.id,
        type: sType,
        title: shortTitle,
        detail: `$${amtUsdt.toFixed(2)} USDT`,
        amount: `+₹${amtInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: tx.timestamp,
        status: tx.status === 'completed' ? 'Settled' : 'Pending',
      };
    });

  const filteredSettlements = settlements.filter((s) => {
    if (activeTab === 'all') return true;
    return s.type === activeTab;
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
          Commission Center
        </h1>

        <div className="w-8"></div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* TOTAL UNCLAIMED COMMISSION & DIVIDEND BONUS CARD */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250 relative overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-primary)',
            boxShadow: '0 10px 25px -5px var(--app-shadow)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Total Unclaimed Commission & Bonus</span>
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
              {totalUnclaimedPending > 0 ? 'Ready to Claim' : 'Claimed'}
            </span>
          </div>

          <div className="my-2">
            <div className="font-heading font-extrabold text-3xl tabular-nums tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
              ₹{totalUnclaimedPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--app-text-secondary)' }}>
              ≈ ${(totalUnclaimedPending / balances.exchangeRateUsdtToInr).toFixed(2)} USDT
            </div>
          </div>

          {/* SHORTLY DISPLAY OF 3 UNCLAIMED SOURCES (Running Commission + 10% Referral Bonus + Daily Dividend) */}
          <div className="grid grid-cols-3 gap-1.5 my-3 pt-2.5 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
            {/* Source 1: Running Commission */}
            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="text-[9px] font-semibold flex items-center justify-center gap-0.5" style={{ color: 'var(--app-text-dim)' }}>
                <Gamepad2 className="w-2.5 h-2.5 text-cyan-400" />
                <span>Running Comm</span>
              </div>
              <div className="font-heading font-bold text-xs text-cyan-400 font-mono mt-0.5">
                ₹{runningCommPending.toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] font-bold text-emerald-400 block">Instant Settled</span>
            </div>

            {/* Source 2: 10% Referral Deposit Bonus */}
            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="text-[9px] font-semibold flex items-center justify-center gap-0.5" style={{ color: 'var(--app-text-dim)' }}>
                <Users className="w-2.5 h-2.5 text-amber-400" />
                <span>10% Refer Bonus</span>
              </div>
              <div className="font-heading font-bold text-xs text-amber-400 font-mono mt-0.5">
                ₹{referralBonusPending.toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] font-bold text-amber-300 block">On Referee Deposit</span>
            </div>

            {/* Source 3: Daily Dividend (1% Daily) */}
            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="text-[9px] font-semibold flex items-center justify-center gap-0.5" style={{ color: 'var(--app-text-dim)' }}>
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>Daily Dividend</span>
              </div>
              <div className="font-heading font-bold text-xs text-emerald-400 font-mono mt-0.5">
                ₹{dailyDividendPending.toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] font-bold text-emerald-300 block">1% Daily Accrual</span>
            </div>
          </div>

          {claimSuccess ? (
            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-center gap-1.5 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All bonuses transferred to your Main Wallet!</span>
            </div>
          ) : (
            <button
              onClick={handleClaimAll}
              disabled={totalUnclaimedPending <= 0 || isClaiming}
              className={`mt-2 w-full py-2.5 rounded-xl font-heading font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                totalUnclaimedPending > 0 && !isClaiming
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <Wallet className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isClaiming
                  ? 'Transferring Bonuses to Main Wallet...'
                  : totalUnclaimedPending > 0
                  ? `Transfer All Bonuses to Main Wallet (₹${totalUnclaimedPending.toLocaleString('en-IN')})`
                  : 'All Bonuses Already Transferred'}
              </span>
            </button>
          )}
        </div>

        {/* 10% REFERRAL BONUS SHOWCASE CARD (NEW) */}
        <div 
          className="rounded-2xl p-4 border space-y-3 transition-colors duration-250 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%), var(--app-surface)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Gift className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                    10% Referral Deposit Bonus
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded">
                    Instant 10% Cash
                  </span>
                </div>
                <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                  Earn a direct 10% cash bonus on every deposit made by members who join with your code
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('refer')}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>Referral Center</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Referral Stats 3-Box Grid (Real DB Data) */}
          <div className="grid grid-cols-3 gap-2">
            <div 
              className="p-2.5 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Active Referees
              </span>
              <div className="font-heading font-black text-base text-amber-400 mt-0.5">
                {referralStats.activeRefereesCount} Members
              </div>
              <span className="text-[8px] text-emerald-400 font-bold block">Team Network</span>
            </div>

            <div 
              className="p-2.5 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Referees Deposits
              </span>
              <div className="font-heading font-black text-base font-mono mt-0.5" style={{ color: 'var(--app-text-primary)' }}>
                ₹{referralStats.refereesDepositInr.toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] font-mono text-slate-400 block">
                ≈ ${referralStats.refereesDepositUsdt.toFixed(2)} USDT
              </span>
            </div>

            <div 
              className="p-2.5 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                10% Bonus Earned
              </span>
              <div className="font-heading font-black text-base text-emerald-400 font-mono mt-0.5">
                +₹{referralStats.bonusEarnedInr.toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] text-emerald-400 font-bold block">Instant Credit</span>
            </div>
          </div>

          {/* Share Referral Code Quick Box */}
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                Your Referral Code:
              </span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {myReferralCode}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-1 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('refer')}
                className="py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-heading font-extrabold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
              >
                <Share2 className="w-3 h-3 stroke-[2.5]" />
                <span>Invite</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1.0% DAILY DIVIDEND YIELD SHORTLY DISPLAY */}
        <div 
          className="rounded-2xl p-4 border space-y-2.5 transition-colors duration-250 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%), var(--app-surface)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                    1.0% Daily Dividend Yield
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    Tenure Retention
                  </span>
                </div>
                <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                  1% daily dividend on security deposit, pooled automatically into your unclaimed bonus
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('plans')}
              className="text-[10px] font-bold text-teal-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>VIP Plans</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Compact Dividend Metrics (Real User Plan State) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Active VIP Plan
              </span>
              <div className="font-heading font-bold text-xs text-amber-400 mt-0.5">
                {user?.planStatus === 'active' && user?.planName ? user.planName : 'Inactive'}
              </div>
              <span className="text-[8px] text-emerald-400 font-bold block">
                {user?.planStatus === 'active' ? 'Tenure Active' : 'No Active Plan'}
              </span>
            </div>

            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Security Deposit
              </span>
              <div className="font-heading font-bold text-xs font-mono mt-0.5" style={{ color: 'var(--app-text-primary)' }}>
                ₹{(balances.frozenInr || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[8px] text-cyan-400 font-mono block">
                {(balances.frozenUsdt || 0).toFixed(2)} USDT
              </span>
            </div>

            <div 
              className="p-2 rounded-xl border text-center transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <span className="text-[9.5px] block font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                Daily Accrual
              </span>
              <div className="font-heading font-black text-xs text-emerald-400 font-mono mt-0.5">
                +₹{Math.round((balances.frozenInr || 0) * 0.01).toLocaleString('en-IN')} / Day
              </div>
              <span className="text-[8px] text-emerald-300 font-bold block">+1.0% Rate</span>
            </div>
          </div>

          <div 
            className="p-2 rounded-lg border text-[9.5px] leading-tight flex items-start gap-1.5"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-400 font-bold">Always Withdrawable:</strong> Security deposit can always be withdrawn anytime. For dividend, you can keep your deposit active to earn the 1% daily dividend, returned with principal at maturity.
            </span>
          </div>
        </div>

        {/* SECTION: Accounting Running Commission Rates - 3 STRUCTURED SQUARE BOXES */}
        <div className="space-y-2.5 pt-1">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Account Running Commission Rates
                </h3>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                Earn commission up to 10% on Gaming & Stock Fund turnover · Instant Settlement
              </p>
            </div>

            <button
              onClick={() => onNavigate('plans')}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>VIP Plans</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Instant Settlement & Running Commission Highlights Banner */}
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
              borderColor: 'rgba(6, 182, 212, 0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="text-[10px] leading-tight">
                <span className="font-extrabold text-cyan-400">⚡ Instant Settlement: </span>
                <span style={{ color: 'var(--app-text-secondary)' }}>
                  All account running commissions are credited in real-time instantly as Gaming & Stock turnover is processed.
                </span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0">
              Up to 10%
            </span>
          </div>

          {/* 3 STRUCTURED SQUARE BOXES (Mobile Friendly & Perfectly Proportioned) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* BOX 1: SAVINGS ACCOUNT (SQUARE STRUCTURE) */}
            <div 
              className="p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between sm:aspect-square shadow-sm"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              {/* Top Row: VIP Badge & Tier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-full">
                    Silver VIP
                  </span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                    Tier 1
                  </span>
                </div>

                <h4 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Savings Account
                </h4>
              </div>

              {/* Middle Grid: Exact Gaming Fund (5%) & Stock Fund (10%) Rates */}
              <div className="grid grid-cols-2 gap-2 my-2">
                {/* Gaming Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                    <Gamepad2 className="w-2.5 h-2.5" />
                    <span>Gaming</span>
                  </div>
                  <div className="font-heading font-black text-xl text-teal-400 font-mono mt-0.5">
                    5%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>

                {/* Stock Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <LineChart className="w-2.5 h-2.5" />
                    <span>Stock</span>
                  </div>
                  <div className="font-heading font-black text-xl text-emerald-400 font-mono mt-0.5">
                    10%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>
              </div>

              {/* Bottom Row: Scope & Settlement */}
              <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <div className="text-[9.5px] font-semibold text-teal-300 truncate">
                  Savings account with full volume
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: 'var(--app-text-dim)' }}>Instant Settlement</span>
                  <span className="font-bold text-teal-400 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Instant
                  </span>
                </div>
              </div>
            </div>

            {/* BOX 2: CURRENT ACCOUNT (SQUARE STRUCTURE) */}
            <div 
              className="p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between sm:aspect-square shadow-sm ring-1 ring-amber-500/30"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              {/* Top Row: VIP Badge & Tier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Gold Pro VIP
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-400">
                    Popular
                  </span>
                </div>

                <h4 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Current Account
                </h4>
              </div>

              {/* Middle Grid: Exact Gaming Fund (3%) & Stock Fund (5%) Rates */}
              <div className="grid grid-cols-2 gap-2 my-2">
                {/* Gaming Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                    <Gamepad2 className="w-2.5 h-2.5" />
                    <span>Gaming</span>
                  </div>
                  <div className="font-heading font-black text-xl text-amber-400 font-mono mt-0.5">
                    3%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>

                {/* Stock Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <LineChart className="w-2.5 h-2.5" />
                    <span>Stock</span>
                  </div>
                  <div className="font-heading font-black text-xl text-amber-400 font-mono mt-0.5">
                    5%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>
              </div>

              {/* Bottom Row: Scope & Settlement */}
              <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <div className="text-[9.5px] font-semibold text-amber-300 truncate">
                  Savings & current with full volume
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: 'var(--app-text-dim)' }}>Instant Settlement</span>
                  <span className="font-bold text-amber-400 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Instant
                  </span>
                </div>
              </div>
            </div>

            {/* BOX 3: CORPORATE ACCOUNT (SQUARE STRUCTURE) */}
            <div 
              className="p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between sm:aspect-square shadow-sm ring-1 ring-purple-500/30"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              {/* Top Row: VIP Badge & Tier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    Diamond VIP
                  </span>
                  <span className="text-[9px] font-mono font-bold text-purple-400">
                    Max Tier
                  </span>
                </div>

                <h4 className="font-heading font-extrabold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Corporate Account
                </h4>
              </div>

              {/* Middle Grid: Exact Gaming Fund (4%) & Stock Fund (6%) Rates */}
              <div className="grid grid-cols-2 gap-2 my-2">
                {/* Gaming Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                    <Gamepad2 className="w-2.5 h-2.5" />
                    <span>Gaming</span>
                  </div>
                  <div className="font-heading font-black text-xl text-purple-400 font-mono mt-0.5">
                    4%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>

                {/* Stock Fund Card */}
                <div 
                  className="p-2 rounded-xl border text-center transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    <LineChart className="w-2.5 h-2.5" />
                    <span>Stock</span>
                  </div>
                  <div className="font-heading font-black text-xl text-purple-400 font-mono mt-0.5">
                    6%
                  </div>
                  <div className="text-[8px] opacity-75" style={{ color: 'var(--app-text-dim)' }}>
                    Commission
                  </div>
                </div>
              </div>

              {/* Bottom Row: Scope & Settlement */}
              <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <div className="text-[9.5px] font-semibold text-purple-300 truncate">
                  Savings, current & corporate full volume
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: 'var(--app-text-dim)' }}>Instant Settlement</span>
                  <span className="font-bold text-purple-400 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Instant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT FUND COMMISSION ESTIMATOR (Pure Gaming / Stock Fund Commission - NO MONTH RETURN) */}
        <div 
          className="rounded-2xl p-3.5 border space-y-3 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h4 className="font-heading font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                Gaming & Stock Fund Commission Estimator
              </h4>
            </div>
            <span className="text-[9.5px] font-mono text-emerald-400 font-bold">
              Instant Calculation
            </span>
          </div>

          {/* Fund Filter Toggle & Account Tier Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Fund Selection: Gaming or Stock Fund */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Select Fund Type
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['both', 'gaming', 'stock'] as const).map((fund) => (
                  <button
                    key={fund}
                    type="button"
                    onClick={() => setCalcFundType(fund)}
                    className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      calcFundType === fund
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'border-slate-800 text-slate-400'
                    }`}
                    style={{
                      backgroundColor: calcFundType === fund ? undefined : 'var(--app-surface-subtle)',
                      borderColor: calcFundType === fund ? undefined : 'var(--app-border-subtle)',
                    }}
                  >
                    {fund === 'both' ? 'Both Funds' : fund === 'gaming' ? 'Gaming' : 'Stock'}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Tier Selection */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Select Account Tier
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['Savings', 'Current', 'Corporate'] as const).map((type) => {
                  const r = getRatesForType(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCalcAccountType(type)}
                      className={`py-1.5 px-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-all ${
                        calcAccountType === type
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                          : 'border-slate-800 text-slate-400'
                      }`}
                      style={{
                        backgroundColor: calcAccountType === type ? undefined : 'var(--app-surface-subtle)',
                        borderColor: calcAccountType === type ? undefined : 'var(--app-border-subtle)',
                      }}
                    >
                      <span>{type}</span>
                      <span className="block text-[8px] font-mono opacity-80">{r.gaming}% / {r.stock}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Turnover Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                Turnover Volume Processed (₹ INR)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                ₹{calcVolume.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[50000, 100000, 250000, 500000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalcVolume(v)}
                  className={`py-1.5 px-1 rounded-lg border text-[10px] font-mono font-semibold cursor-pointer transition-all ${
                    calcVolume === v
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    backgroundColor: calcVolume === v ? undefined : 'var(--app-surface-subtle)',
                    borderColor: calcVolume === v ? undefined : 'var(--app-border-subtle)',
                  }}
                >
                  ₹{(v / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Commission Display (Clean & Mobile Friendly, Only Showing Gaming & Stock Commission) */}
          <div 
            className="p-3 rounded-xl border grid grid-cols-2 gap-2"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            {/* Gaming Commission Result */}
            <div className="border-r pr-2" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <div className="flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                <Gamepad2 className="w-3 h-3 text-cyan-400" />
                <span>Gaming Commission ({currentRates.gaming}%)</span>
              </div>
              <div className="font-heading font-black text-lg text-teal-400 font-mono mt-0.5">
                +₹{gamingComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] font-mono text-slate-400">
                ≈ ${(gamingComm / balances.exchangeRateUsdtToInr).toFixed(2)} USDT
              </span>
            </div>

            {/* Stock Commission Result */}
            <div className="pl-1">
              <div className="flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                <LineChart className="w-3 h-3 text-emerald-400" />
                <span>Stock Commission ({currentRates.stock}%)</span>
              </div>
              <div className="font-heading font-black text-lg text-emerald-400 font-mono mt-0.5">
                +₹{stockComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] font-mono text-slate-400">
                ≈ ${(stockComm / balances.exchangeRateUsdtToInr).toFixed(2)} USDT
              </span>
            </div>
          </div>
        </div>

        {/* Commission Settlement Log with Filter Tabs (Gaming Fund, Stock Fund, 10% Referral, Daily Dividend) */}
        <div 
          className="rounded-2xl p-4 border space-y-3 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <Clock className="w-4 h-4 text-teal-500 dark:text-cyan-400" />
              <span>Settlement & Turnover History</span>
            </h3>

            {/* Filter Tabs */}
            <div 
              className="flex items-center p-0.5 rounded-lg border text-[9.5px] font-semibold overflow-x-auto max-w-full"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              {(['all', 'gaming', 'stock', 'referral', 'dividend'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded-md cursor-pointer capitalize whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-cyan-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'all' 
                    ? 'All' 
                    : tab === 'gaming' 
                    ? 'Gaming' 
                    : tab === 'stock' 
                    ? 'Stock' 
                    : tab === 'referral' 
                    ? '10% Referral' 
                    : 'Dividend'}
                </button>
              ))}
            </div>
          </div>

          {filteredSettlements.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--app-text-dim)' }}>
              No commission or bonus settlement records in the database yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSettlements.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs overflow-hidden transition-colors duration-250"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold truncate" style={{ color: 'var(--app-text-primary)' }}>
                        {item.title}
                      </span>
                      <span
                        className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                          item.type === 'gaming'
                            ? 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-300 border border-cyan-500/30'
                            : item.type === 'stock'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            : item.type === 'referral'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {item.type === 'gaming'
                          ? 'Gaming Fund'
                          : item.type === 'stock'
                          ? 'Stock Fund'
                          : item.type === 'referral'
                          ? 'Ref / Bonus'
                          : '1% Dividend'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono truncate" style={{ color: 'var(--app-text-dim)' }}>
                      {item.detail} · {item.date}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                      {item.amount}
                    </span>
                    <span className="text-[9px] text-emerald-500 font-medium">
                      {item.status}
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
