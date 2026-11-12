import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Check, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  Play,
  Pause,
  Percent,
  TrendingUp,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Activity
} from 'lucide-react';
import { SavedBankAccount } from '../types';
import { AddBankAccountModal } from './modals/AddBankAccountModal';
import { SubscriptionRequiredModal } from './modals/SubscriptionRequiredModal';

interface BankAccountsSectionProps {
  accounts: SavedBankAccount[];
  onAddAccount: (account: SavedBankAccount) => void;
  onDeleteAccount: (id: string) => void;
  onSetPrimaryAccount?: (id: string) => void;
  onToggleRunAccount?: (id: string) => void;
  defaultHolderName?: string;
  onOpenPlans?: () => void;
  onOpenCommission?: () => void;
  hasActivePlan?: boolean;
}

export const BankAccountsSection: React.FC<BankAccountsSectionProps> = ({
  accounts,
  onAddAccount,
  onDeleteAccount,
  onSetPrimaryAccount,
  onToggleRunAccount,
  defaultHolderName = '',
  onOpenPlans,
  onOpenCommission,
  hasActivePlan = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [subRequiredModalOpen, setSubRequiredModalOpen] = useState(false);
  const [targetBankName, setTargetBankName] = useState('Bank Account');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedIfsc, setCopiedIfsc] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const hasActiveOrRecent = accounts.some(
      (a) => a.isRunning || (a.lastProcessedDelta && Date.now() - a.lastProcessedDelta.timestamp < 8000)
    );
    if (!hasActiveOrRecent) return;
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [accounts]);

  const handleToggleRun = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    const willRun = !acc?.isRunning;

    // Check if user has an active subscription plan before starting work
    if (willRun && !hasActivePlan) {
      setTargetBankName(acc?.bankName || 'bank account');
      setSubRequiredModalOpen(true);
      return;
    }

    if (willRun) {
      setActionNotice(`▶ Work started on ${acc?.bankName || 'bank account'}! Running transactions are now active.`);
    } else {
      setActionNotice(`⏸ Work paused on ${acc?.bankName || 'bank account'}.`);
    }
    setTimeout(() => setActionNotice(null), 3500);
    onToggleRunAccount?.(id);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyIfsc = (ifsc: string, id: string) => {
    navigator.clipboard.writeText(ifsc);
    setCopiedIfsc(id);
    setTimeout(() => setCopiedIfsc(null), 2000);
  };

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    const lastFour = num.slice(-4);
    const masked = '•'.repeat(Math.max(4, num.length - 4));
    return `${masked.slice(0, 4)} ${masked.slice(4, 8) || '••••'} ${lastFour}`;
  };

  // Renders official Truecaller bank logo (Bandhan, IndusInd, Airtel, Kotak) or crisp vector emblem for other Indian banks
  const renderOfficialBankLogo = (acc: SavedBankAccount, sizeClass = 'w-10 h-10', isDebitState = false) => {
    const bankLower = (acc.bankName || '').toLowerCase().trim();
    const ifscUpper = (acc.ifscCode || '').toUpperCase().trim();

    const isBandhan = bankLower.includes('bandhan') || ifscUpper.startsWith('BDBL');
    const isIndusInd = bankLower.includes('indusind') || bankLower.includes('indus ind') || ifscUpper.startsWith('INDB');
    const isAirtel = bankLower.includes('airtel') || ifscUpper.startsWith('AIRP');
    const isKotak = bankLower.includes('kotak') || ifscUpper.startsWith('KKBK');
    const isSbi = bankLower.includes('state bank') || bankLower.includes('sbi') || ifscUpper.startsWith('SBIN');
    const isHdfc = bankLower.includes('hdfc') || ifscUpper.startsWith('HDFC');
    const isIcici = bankLower.includes('icici') || ifscUpper.startsWith('ICIC');
    const isPnb = bankLower.includes('pnb') || bankLower.includes('punjab national') || ifscUpper.startsWith('PUNB');
    const isAxis = bankLower.includes('axis') || ifscUpper.startsWith('UTIB');

    if (isBandhan) {
      return (
        <img
          src="/assets/aistudio/logo_bandhan.png"
          alt="Bandhan Bank"
          className={`${sizeClass} rounded-full object-cover bg-white shrink-0 shadow-md ring-2 ring-white/20`}
        />
      );
    }
    if (isIndusInd) {
      return (
        <img
          src="/assets/aistudio/logo_indusind.png"
          alt="IndusInd Bank"
          className={`${sizeClass} rounded-full object-cover bg-white shrink-0 shadow-md ring-2 ring-white/20`}
        />
      );
    }
    if (isAirtel) {
      return (
        <img
          src="/assets/aistudio/logo_airtel.png"
          alt="Airtel Payments Bank"
          className={`${sizeClass} rounded-full object-cover bg-white shrink-0 shadow-md ring-2 ring-white/20`}
        />
      );
    }
    if (isKotak) {
      return (
        <img
          src={isDebitState ? '/assets/aistudio/logo_kotak.png' : '/assets/aistudio/logo_kotak_red.png'}
          alt="Kotak Mahindra Bank"
          className={`${sizeClass} rounded-full object-cover bg-white shrink-0 shadow-md ring-2 ring-white/20`}
        />
      );
    }
    if (isSbi) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#005C97] flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/20`}>
          <svg viewBox="0 0 36 36" className="w-6 h-6">
            <circle cx="18" cy="18" r="14" fill="#00A9E0" />
            <circle cx="18" cy="15" r="4.5" fill="#005C97" />
            <rect x="16.2" y="16" width="3.6" height="13" fill="#005C97" />
          </svg>
        </div>
      );
    }
    if (isHdfc) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#ED232A] flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/20`}>
          <svg viewBox="0 0 36 36" className="w-6 h-6">
            <rect x="6" y="6" width="24" height="24" fill="#FFFFFF" rx="2" />
            <rect x="10" y="10" width="16" height="16" fill="#ED232A" />
            <rect x="14" y="14" width="8" height="8" fill="#004C8F" />
          </svg>
        </div>
      );
    }
    if (isIcici) {
      return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-[#F37021] to-[#97144D] flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/20 text-white font-black text-xs`}>
          ICICI
        </div>
      );
    }
    if (isPnb) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#A20A3A] flex items-center justify-center shrink-0 shadow-md ring-2 ring-[#FBBF24]/50 text-[#FBBF24] font-black text-xs`}>
          PNB
        </div>
      );
    }
    if (isAxis) {
      return (
        <div className={`${sizeClass} rounded-full bg-[#97144D] flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/20 text-white font-black text-xs`}>
          AXIS
        </div>
      );
    }

    const initials = (acc.bankName || 'BK')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-cyan-600 to-teal-800 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md ring-2 ring-cyan-400/30`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="w-full px-4 pt-1 pb-6 space-y-3.5 transition-colors duration-250">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="pr-2">
          <h3 className="font-heading font-extrabold text-base tracking-tight flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Bank Accounts</span>
          </h3>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
            add your savings ,current or corporate account to run your account , please take a{' '}
            {onOpenPlans ? (
              <button 
                type="button" 
                onClick={onOpenPlans} 
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer inline"
              >
                VIPsubcription  plan
              </button>
            ) : (
              <span className="text-amber-400 font-semibold">VIPsubcription  plan</span>
            )}{' '}
            and activate your panel. Check commision rate on{' '}
            {onOpenCommission ? (
              <button 
                type="button" 
                onClick={onOpenCommission} 
                className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 cursor-pointer inline"
              >
                commision section
              </button>
            ) : (
              <span className="text-cyan-400 font-bold">commision section</span>
            )}.
          </p>
        </div>

        {accounts.length > 0 && (
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono"
            style={{
              backgroundColor: 'var(--app-surface-highlight)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-secondary)',
            }}
          >
            {accounts.length} Linked
          </span>
        )}
      </div>

      {/* Toast Notice when starting or pausing account work */}
      {actionNotice && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="flex-1">{actionNotice}</span>
        </div>
      )}

      {/* Accounting Running Commission Overview Card (Placed above Add Bank Account button as requested) */}
      <div
        className="rounded-2xl p-3.5 border relative overflow-hidden transition-all shadow-md"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%), var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-teal-600 dark:text-cyan-300 shrink-0">
              <Percent className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-heading font-extrabold text-xs tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                  Account Running Commission
                </h4>
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                  Gaming & Stock
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded">
                  ⚡ Instant Settlement
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                Earn commission up to 10% based on Gaming & Stock Fund turnover
              </p>
            </div>
          </div>
        </div>

        {/* Commission Tiers Grid - 3 Clean Boxes */}
        <div className="grid grid-cols-3 gap-2 my-2">
          <div 
            className="p-2 rounded-xl border text-center transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>Savings</div>
            <div className="font-heading font-extrabold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">5% / 10%</div>
            <div className="text-[8px] font-medium text-emerald-600 dark:text-emerald-400/90 mt-0.5">🎮 5% · 📈 10%</div>
          </div>

          <div 
            className="p-2 rounded-xl border text-center transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>Current</div>
            <div className="font-heading font-extrabold text-xs text-cyan-600 dark:text-cyan-400 mt-0.5 font-mono">3% / 5%</div>
            <div className="text-[8px] font-medium text-cyan-600 dark:text-cyan-400/90 mt-0.5">🎮 3% · 📈 5%</div>
          </div>

          <div 
            className="p-2 rounded-xl border text-center transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>Corporate</div>
            <div className="font-heading font-extrabold text-xs text-purple-600 dark:text-purple-400 mt-0.5 font-mono">4% / 6%</div>
            <div className="text-[8px] font-medium text-purple-600 dark:text-purple-400/90 mt-0.5">🎮 4% · 📈 6%</div>
          </div>
        </div>

        <div className="text-[9.5px] flex items-center justify-between pt-1.5 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <span style={{ color: 'var(--app-text-dim)' }}>Gaming & Stock Fund Turnover</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">⚡ Instant Settlement</span>
        </div>
      </div>

      {/* Prominent "+ Add Bank Account" Button Sign */}
      <button
        onClick={() => setModalOpen(true)}
        type="button"
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm tracking-wide shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
      >
        <div className="w-6 h-6 rounded-lg bg-slate-950 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>
        <span>+ Add Bank Account</span>
      </button>

      {/* Saved Bank Account Details List Displayed Below the Button */}
      <div className="space-y-3 pt-1">
        {accounts.length === 0 ? (
          /* Empty state */
          <div 
            className="p-6 border rounded-2xl text-center space-y-2 transition-colors duration-250"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-2xl border flex items-center justify-center mx-auto"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
              No Bank Account Added Yet
            </h4>
            <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--app-text-dim)' }}>
              Click the <strong className="text-cyan-500 dark:text-cyan-300">+ Add Bank Account</strong> button above to connect your account for running.
            </p>
          </div>
        ) : (
          /* List of added accounts */
          accounts.map((acc) => {
            const isRevealed = revealedIds[acc.id];
            const isCopied = copiedIfsc === acc.id;
            const isStock = acc.fundType === 'stock';
            const gamingRate = acc.gamingCommissionRate ?? (acc.accountType === 'Corporate' ? 4 : acc.accountType === 'Current' ? 3 : 5);
            const stockRate = acc.stockCommissionRate ?? (acc.accountType === 'Corporate' ? 6 : acc.accountType === 'Current' ? 5 : 10);
            const chosenRate = isStock ? stockRate : gamingRate;
            const isCorporateStock = acc.accountType === 'Corporate' && isStock;
            const maxLimit = isCorporateStock
              ? 9907184
              : acc.maxVolumeLimit || (acc.accountType === 'Corporate' ? 40000000 : acc.accountType === 'Current' ? 7400000 : 1000000);
            const runningVolume = acc.runningVolumeProcessed ?? 0;
            const commissionEarned = acc.accumulatedCommission ?? (runningVolume * (chosenRate / 100));
            const progressPercent = Math.min(100, Math.round((runningVolume / maxLimit) * 100));
            const targetLabel = isCorporateStock
              ? '99.07 Lakhs'
              : acc.accountType === 'Corporate'
              ? '4 Crore'
              : acc.accountType === 'Current'
              ? '74 Lakhs'
              : '10 Lakhs';
            const targetFormatted = isCorporateStock
              ? '₹99,07,184'
              : acc.accountType === 'Corporate'
              ? '₹4,00,00,000'
              : acc.accountType === 'Current'
              ? '₹74,00,000'
              : '₹10,00,000';

            const delta = acc.lastProcessedDelta;
            const deltaTxType = delta?.txType || 'credit';
            const isRecentBurst = Boolean(delta && nowTick - delta.timestamp < 6000);
            const last4Ac = (acc.accountNumber || '').replace(/\s+/g, '').slice(-4) || '3324';

            const bankLower = (acc.bankName || '').toLowerCase().trim();
            const ifscUpper = (acc.ifscCode || '').toUpperCase().trim();
            const isKotakBank = bankLower.includes('kotak') || ifscUpper.startsWith('KKBK');
            const isAirtelBank = bankLower.includes('airtel') || ifscUpper.startsWith('AIRP');

            // Determine transfer method & counterparty name clearly (Debit after OTP is ALWAYS IMPS Transfer)
            const transferMethodLabel =
              deltaTxType === 'debit'
                ? 'IMPS TRANSFER'
                : deltaTxType === 'otp'
                ? 'IMPS OTP CHECK'
                : isAirtelBank
                ? 'IMPS TRANSFER'
                : (delta?.method || 'UPI TRANSFER').toUpperCase();

            const counterpartyDisplayName =
              deltaTxType === 'debit'
                ? delta?.counterparty || 'Vikram Sharma'
                : deltaTxType === 'otp'
                ? delta?.counterparty || 'Authorized Beneficiary'
                : isAirtelBank
                ? 'Airtel Payments'
                : isKotakBank && delta?.method === 'IMPS transfer'
                ? `IMPS to A/C ${last4Ac}`
                : delta?.counterparty || 'Direct Bank Remitter';

            const activeRingClass = !acc.isRunning
              ? ''
              : isRecentBurst && deltaTxType === 'debit'
              ? 'ring-2 ring-rose-500 shadow-lg shadow-rose-500/25'
              : isRecentBurst && deltaTxType === 'otp'
              ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/25'
              : 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/25';

            const activeBorderColor = !acc.isRunning
              ? 'var(--app-border)'
              : isRecentBurst && deltaTxType === 'debit'
              ? '#F43F5E'
              : isRecentBurst && deltaTxType === 'otp'
              ? '#F59E0B'
              : '#10B981';

            const otpDigits = (delta?.otpCode || '482910').padEnd(6, '0').slice(0, 6).split('');
            const exactAmountValue = delta && delta.volume > 0 ? delta.volume : 0;
            const exactLiveAmountStr =
              exactAmountValue > 0
                ? `₹${exactAmountValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}`
                : '₹0';
            const signedExactAmountStr =
              exactAmountValue > 0
                ? `${deltaTxType === 'debit' ? '-' : '+'}${exactLiveAmountStr}`
                : 'LIVE';

            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-4 border shadow-xl relative overflow-hidden group transition-all duration-300 ${activeRingClass}`}
                style={{
                  background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface))',
                  borderColor: activeBorderColor,
                  color: 'var(--app-text-primary)',
                  boxShadow: '0 10px 25px -5px var(--app-shadow)',
                }}
              >
                {/* Top Live Animated Bar when Running */}
                {acc.isRunning && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden">
                    <div
                      className={`h-full w-full ${
                        deltaTxType === 'debit'
                          ? 'bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600'
                          : deltaTxType === 'otp'
                          ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
                          : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
                      }`}
                    />
                  </div>
                )}

                {/* Bank Card Top Row: Official Truecaller Bank Logo + Bank Name + Badges */}
                <div 
                  className="flex items-start justify-between mb-3 pb-2.5 border-b"
                  style={{ borderColor: 'var(--app-border-subtle)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      {renderOfficialBankLogo(acc, 'w-10 h-10', deltaTxType === 'debit')}
                      {acc.isRunning && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 p-0.5">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              deltaTxType === 'debit'
                                ? 'bg-rose-400'
                                : deltaTxType === 'otp'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              deltaTxType === 'debit'
                                ? 'bg-rose-500'
                                : deltaTxType === 'otp'
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-heading font-extrabold text-sm sm:text-base" style={{ color: 'var(--app-text-primary)' }}>
                        {acc.bankName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold" style={{ color: 'var(--app-text-secondary)' }}>
                          {acc.accountType} Account
                        </span>
                        {acc.branchName && (
                          <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>· {acc.branchName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span 
                      className="text-[9.5px] font-bold border px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: 'var(--app-surface-highlight)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text-secondary)',
                      }}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified</span>
                    </span>

                    {isStock ? (
                      <span className="text-[9.5px] font-extrabold border border-purple-500/50 bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-mono shadow-sm">
                        <span>📈 Stock {stockRate}%</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-extrabold border border-emerald-500/50 bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-mono shadow-sm">
                        <span>🎮 Gaming {gamingRate}%</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Details Middle Area */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  {/* Account Number */}
                  <div 
                    className="p-2.5 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1 font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                      <span>Account Number</span>
                      <button
                        type="button"
                        onClick={() => toggleReveal(acc.id)}
                        className="cursor-pointer hover:opacity-100 opacity-80"
                        style={{ color: 'var(--app-text-secondary)' }}
                        title={isRevealed ? 'Hide account number' : 'Show full number'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="font-mono font-extrabold tracking-wide text-xs sm:text-sm" style={{ color: 'var(--app-text-primary)' }}>
                      {isRevealed ? acc.accountNumber : maskAccountNumber(acc.accountNumber)}
                    </div>
                  </div>

                  {/* IFSC Code */}
                  <div 
                    className="p-2.5 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1 font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                      <span>IFSC Code</span>
                      <button
                        type="button"
                        onClick={() => copyIfsc(acc.ifscCode, acc.id)}
                        className="cursor-pointer hover:opacity-100 opacity-80"
                        style={{ color: 'var(--app-text-secondary)' }}
                        title="Copy IFSC code"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="font-mono font-extrabold tracking-wider text-xs sm:text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      {acc.ifscCode}
                    </div>
                  </div>
                </div>

                {/* Optional Corporate, Group, Domain & Card Details Badge Strip */}
                {(acc.corporateId || acc.groupId || acc.domainId || acc.atmCardNumber) && (
                  <div 
                    className="p-2 rounded-xl border mb-3 flex flex-wrap items-center gap-1.5 text-[10px]"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    {acc.corporateId && (
                      <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-mono font-bold">
                        Corp ID: {acc.corporateId}
                      </span>
                    )}
                    {acc.groupId && (
                      <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono font-bold">
                        Group: {acc.groupId}
                      </span>
                    )}
                    {acc.domainId && (
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
                        Domain: {acc.domainId}
                      </span>
                    )}
                    {acc.atmCardNumber && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white border border-slate-700 font-mono flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-cyan-400" />
                        <span>Card: •••• {acc.atmCardNumber.replace(/\s/g, '').slice(-4)}</span>
                        {acc.expiryDate && <span className="opacity-80">({acc.expiryDate})</span>}
                      </span>
                    )}
                  </div>
                )}

                {/* =========================================================================================
                    HIGH-CONTRAST REALISTIC CARTOON CASH FLOW STAGE (Credit / Pre-Debit OTP / Debit)
                   ========================================================================================= */}
                {(acc.isRunning || (delta && delta.volume > 0)) && (
                  <div
                    key={`live_stage_${acc.id}_${delta?.timestamp || 0}_${deltaTxType}`}
                    className={`mb-3.5 rounded-2xl p-3.5 border-2 relative overflow-hidden shadow-xl transition-all duration-300 ${
                      deltaTxType === 'debit'
                        ? 'bg-[#1A0B12] border-rose-500 shadow-rose-950/50'
                        : deltaTxType === 'otp'
                        ? 'bg-[#191206] border-amber-400 shadow-amber-950/50'
                        : 'bg-[#071917] border-emerald-500 shadow-emerald-950/50'
                    }`}
                  >
                    {/* Header Row: Solid Status Pill + Transfer Method Pill + Account Tag */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/15">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                            deltaTxType === 'debit'
                              ? 'bg-rose-600 text-white'
                              : deltaTxType === 'otp'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-emerald-500 text-slate-950'
                          }`}
                        >
                          {deltaTxType === 'debit' ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                              <span>CASH DEBITED</span>
                            </>
                          ) : deltaTxType === 'otp' ? (
                            <>
                              <Lock className="w-3.5 h-3.5 stroke-[2.8]" />
                              <span>PRE-DEBIT OTP</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[3]" />
                              <span>CASH CREDITED</span>
                            </>
                          )}
                        </span>

                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-extrabold bg-slate-800 text-white border border-slate-600">
                          {transferMethodLabel}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/10 text-white border border-white/20 shrink-0">
                        A/C ••{last4Ac}
                      </span>
                    </div>

                    {/* MIDDLE 3D CARTOON SCENE & SLOW NON-OVERLAPPING EXACT AMOUNT STREAM */}
                    <div className="my-3 py-2.5 px-2 rounded-2xl bg-gradient-to-b from-slate-950/95 to-black/90 border border-white/15 flex items-center justify-between gap-1.5 relative overflow-hidden">
                      {/* LEFT NODE: Remitter Person (Credit) OR Bank Account Logo (OTP/Debit) */}
                      <div className="flex flex-col items-center text-center w-[62px] shrink-0 z-20">
                        {deltaTxType === 'credit' ? (
                          /* 3D Cartoon Sender Character holding Smartphone sending UPI/IMPS */
                          <div className="relative animate-float-bob">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-cyan-400 via-teal-500 to-emerald-700 p-0.5 shadow-lg">
                              <div className="w-full h-full rounded-[14px] bg-[#0B192C] flex items-center justify-center overflow-hidden">
                                <svg viewBox="0 0 64 64" className="w-10 h-10">
                                  <circle cx="32" cy="30" r="26" fill="#10B981" opacity="0.18" />
                                  <path d="M12 58C12 44 20 39 32 39C44 39 52 44 52 58" fill="#059669" />
                                  <path d="M25 39L32 50L39 39" fill="#ECFDF5" />
                                  <rect x="28" y="32" width="8" height="8" rx="3" fill="#FDBA74" />
                                  <circle cx="32" cy="23" r="11" fill="#FDBA74" />
                                  <path d="M20 20C20 12 25 9 32 9C39 9 44 12 44 20C41 16 36 15 32 15C27 15 23 16 20 20Z" fill="#0F172A" />
                                  <circle cx="28" cy="23" r="1.6" fill="#0F172A" />
                                  <circle cx="36" cy="23" r="1.6" fill="#0F172A" />
                                  <circle cx="28.5" cy="22.5" r="0.6" fill="#FFFFFF" />
                                  <circle cx="36.5" cy="22.5" r="0.6" fill="#FFFFFF" />
                                  <path d="M28 27.5Q32 30.5 36 27.5" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
                                  <rect x="43" y="33" width="11" height="17" rx="2.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.2" />
                                  <text x="48.5" y="44" textAnchor="middle" fill="#0F172A" fontSize="7" fontWeight="900">₹</text>
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Unobstructed Official Bank Logo Container on Left (for OTP & Debit) */
                          <div className="relative animate-float-bob">
                            <div
                              className={`w-11 h-11 rounded-2xl bg-slate-900 border-2 flex items-center justify-center shadow-lg ${
                                deltaTxType === 'debit' ? 'border-rose-400/80' : 'border-amber-400/80'
                              }`}
                            >
                              {renderOfficialBankLogo(acc, 'w-8 h-8', deltaTxType === 'debit')}
                            </div>
                          </div>
                        )}
                        <div className="mt-1 text-[10.5px] font-black text-white leading-tight truncate w-full">
                          {deltaTxType === 'credit'
                            ? counterpartyDisplayName.split(' ')[0]
                            : acc.bankName.split(' ')[0]}
                        </div>
                        <div className="text-[9px] font-mono font-bold text-cyan-300 truncate w-full">
                          {deltaTxType === 'credit' ? 'Sender' : `A/C ••${last4Ac}`}
                        </div>
                      </div>

                      {/* DEDICATED NON-OVERLAPPING TRANSFER CORRIDOR (Starts right at Left Node ---> ends right before Right Node) */}
                      <div className="flex-1 min-w-0 flex flex-col items-center justify-center relative min-h-[72px] mx-1 overflow-hidden z-10">
                        {deltaTxType === 'otp' ? (
                          /* Pre-Debit IMPS OTP Verification Stage */
                          <div className="flex flex-col items-center justify-center w-full z-10">
                            <div className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/60 text-[9.5px] font-mono font-black text-amber-300 mb-1">
                              IMPS OTP • -{exactLiveAmountStr}
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              {otpDigits.map((digit, idx) => (
                                <span
                                  key={idx}
                                  className="w-5 h-6 rounded-md bg-amber-400 text-slate-950 font-mono font-black text-xs flex items-center justify-center shadow-md"
                                >
                                  {digit}
                                </span>
                              ))}
                            </div>
                            <div className="mt-1 text-[9px] font-extrabold text-amber-200 uppercase tracking-wide">
                              Verifying IMPS Outflow
                            </div>
                          </div>
                        ) : (
                          /* Slow, Smooth Single Cash Note Gliding strictly Left Node ---> Right Node without overlapping logos */
                          <div className="w-full flex flex-col justify-center">
                            {/* Track Zone where the Cash Capsule glides slowly Left ---> Right */}
                            <div className="w-full relative h-11 flex items-center overflow-hidden">
                              {/* Subtle Directional Guide Rail & Animated Dots */}
                              <div
                                className={`w-full h-1.5 rounded-full relative flex items-center ${
                                  deltaTxType === 'debit'
                                    ? 'bg-rose-950/90 border border-rose-500/40'
                                    : 'bg-emerald-950/90 border border-emerald-500/40'
                                }`}
                              >
                                <div
                                  className={`w-full h-2 animate-flow-dots ${
                                    deltaTxType === 'debit' ? 'text-rose-400/75' : 'text-emerald-400/75'
                                  }`}
                                />
                              </div>

                              {/* Single High-Contrast Cash Note Capsule (Slow 3.8s glide Left ---> Right, zero logo overlap) */}
                              <div className="absolute top-1/2 animate-cash-flow-slow pointer-events-none z-20">
                                <div
                                  className={`px-2 py-0.5 rounded-lg border-2 shadow-xl flex items-center gap-1 font-mono font-black text-[11px] whitespace-nowrap ${
                                    deltaTxType === 'debit'
                                      ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 border-rose-200 text-white shadow-rose-950/80'
                                      : 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 border-emerald-200 text-white shadow-emerald-950/80'
                                  }`}
                                >
                                  {/* Crisp Rupee Banknote Icon */}
                                  <svg viewBox="0 0 28 20" className="w-4 h-3 shrink-0">
                                    <rect x="1" y="3" width="24" height="14" rx="2.5" fill="#FEF08A" stroke="#0F172A" strokeWidth="1.3" />
                                    <rect
                                      x="3"
                                      y="1"
                                      width="24"
                                      height="14"
                                      rx="2.5"
                                      fill={deltaTxType === 'debit' ? '#FB7185' : '#4ADE80'}
                                      stroke="#FFFFFF"
                                      strokeWidth="1.3"
                                    />
                                    <circle cx="15" cy="8" r="4.2" fill="#FFFFFF" />
                                    <text x="15" y="10.8" textAnchor="middle" fill="#0F172A" fontSize="8.5" fontWeight="900">
                                      ₹
                                    </text>
                                  </svg>
                                  <span className="tracking-tight drop-shadow-sm">{signedExactAmountStr}</span>
                                </div>
                              </div>
                            </div>

                            {/* Clear Static Sub-Caption Below Track so direction & amount are always 100% readable */}
                            <div className="text-center mt-0.5">
                              <span
                                className={`text-[9.5px] font-mono font-extrabold tracking-wide ${
                                  deltaTxType === 'debit' ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {deltaTxType === 'debit'
                                  ? `A/C ••${last4Ac} → ${counterpartyDisplayName.split(' ')[0]}`
                                  : `${counterpartyDisplayName.split(' ')[0]} → A/C ••${last4Ac}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT NODE: Unobstructed Official Bank Logo (Credit) OR Recipient Person (Debit) */}
                      <div className="flex flex-col items-center text-center w-[62px] shrink-0 z-20">
                        {deltaTxType === 'credit' ? (
                          /* Clean Unobstructed Official Truecaller Bank Logo receiving Cash */
                          <div className="relative animate-float-bob">
                            <div className="w-11 h-11 rounded-2xl bg-slate-900 border-2 border-emerald-400/90 flex items-center justify-center shadow-lg">
                              {renderOfficialBankLogo(acc, 'w-8 h-8', false)}
                            </div>
                          </div>
                        ) : deltaTxType === 'otp' ? (
                          /* Security Shield for OTP Stage */
                          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex flex-col items-center justify-center shadow-lg relative">
                            <span className="absolute inset-0 rounded-2xl border-2 border-amber-400 animate-otp-wave" />
                            <Lock className="w-4 h-4 text-amber-300" />
                            <span className="text-[7.5px] font-black text-amber-200 mt-0.5">VERIFY</span>
                          </div>
                        ) : (
                          /* 3D Cartoon Recipient Character receiving the exact IMPS Debit Transfer */
                          <div className="relative animate-float-bob">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-rose-500 via-orange-500 to-amber-600 p-0.5 shadow-lg">
                              <div className="w-full h-full rounded-[14px] bg-[#1F0B14] flex items-center justify-center overflow-hidden">
                                <svg viewBox="0 0 64 64" className="w-10 h-10">
                                  <circle cx="32" cy="30" r="26" fill="#F43F5E" opacity="0.2" />
                                  <path d="M12 58C12 44 20 39 32 39C44 39 52 44 52 58" fill="#E11D48" />
                                  <path d="M25 39L32 50L39 39" fill="#FFE4E6" />
                                  <rect x="28" y="32" width="8" height="8" rx="3" fill="#FDBA74" />
                                  <circle cx="32" cy="23" r="11" fill="#FDBA74" />
                                  <path d="M20 20C20 12 25 9 32 9C39 9 44 12 44 20C41 16 36 15 32 15C27 15 23 16 20 20Z" fill="#1E293B" />
                                  <circle cx="28" cy="23" r="1.6" fill="#0F172A" />
                                  <circle cx="36" cy="23" r="1.6" fill="#0F172A" />
                                  <path d="M28 27.5Q32 30.5 36 27.5" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
                                  <rect x="41" y="35" width="14" height="10" rx="2" fill="#4ADE80" stroke="#FFFFFF" strokeWidth="1.2" />
                                  <text x="48" y="42.5" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontWeight="900">₹</text>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-1 text-[10.5px] font-black text-white leading-tight truncate w-full">
                          {deltaTxType === 'credit'
                            ? acc.bankName.split(' ')[0]
                            : counterpartyDisplayName.split(' ')[0]}
                        </div>
                        <div className="text-[9px] font-mono font-bold text-cyan-300 truncate w-full">
                          {deltaTxType === 'credit'
                            ? `A/C ••${last4Ac}`
                            : deltaTxType === 'otp'
                            ? 'OTP Check'
                            : 'Receiver'}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM CRYSTAL-CLEAR TRANSACTION DETAILS GRID (Name, Exact Amount, Commission/Status) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {/* Left Box: Full Counterparty Name & Transfer Info */}
                      <div className="p-2.5 rounded-xl bg-slate-900/95 border border-white/15 flex flex-col justify-center">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                          {deltaTxType === 'debit'
                            ? 'Transferred To (Name)'
                            : deltaTxType === 'otp'
                            ? 'Pending Beneficiary'
                            : 'Received From / Mode'}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">
                          {counterpartyDisplayName}
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-cyan-300 mt-0.5 truncate">
                          {acc.bankName} · A/C {last4Ac}
                        </div>
                      </div>

                      {/* Right Box: Bold High-Contrast Exact Amount & Commission */}
                      <div
                        className={`p-2.5 rounded-xl border flex flex-col justify-center text-right ${
                          deltaTxType === 'debit'
                            ? 'bg-rose-950/90 border-rose-400/60'
                            : deltaTxType === 'otp'
                            ? 'bg-amber-950/90 border-amber-400/60'
                            : 'bg-emerald-950/90 border-emerald-400/60'
                        }`}
                      >
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                          {deltaTxType === 'debit'
                            ? 'Debit Amount'
                            : deltaTxType === 'otp'
                            ? 'OTP Txn Amount'
                            : 'Credited Amount'}
                        </div>
                        <div
                          className={`text-sm sm:text-base font-mono font-black tracking-tight mt-0.5 ${
                            deltaTxType === 'debit'
                              ? 'text-rose-300'
                              : deltaTxType === 'otp'
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {delta && delta.volume > 0 ? (
                            <>
                              {deltaTxType === 'debit' ? '- ' : deltaTxType === 'otp' ? '⏳ ' : '+ '}
                              {exactLiveAmountStr}
                            </>
                          ) : (
                            '₹0'
                          )}
                        </div>
                        <div className="text-[10px] font-mono font-extrabold text-white mt-0.5">
                          {deltaTxType === 'debit' ? (
                            <span className="text-rose-200">Volume Unchanged</span>
                          ) : deltaTxType === 'otp' ? (
                            <span className="text-amber-200">OTP: {delta?.otpCode || '482910'}</span>
                          ) : (
                            <span className="text-emerald-200">
                              +₹{(delta?.commission || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Comm Added
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================================================
                    PROFESSIONAL COMMISSION & VOLUME LEDGER + SLOW ONE-TIME DOWNWARD CREDIT FLOAT
                   ========================================================================================= */}
                <div className="relative mb-3">
                  {/* ONE-TIME SLOW DOWNWARD FLOATING CAPSULES (Starts from the animated credited amount above and falls slowly into Commission & Volume) */}
                  {delta && delta.volume > 0 && deltaTxType === 'credit' && (
                    <div
                      key={`credit_drop_${acc.id}_${delta.timestamp}`}
                      className="pointer-events-none absolute top-0 left-0 right-0 z-40 grid grid-cols-2 gap-2.5 px-2"
                    >
                      {/* Left Floating Drop -> Starts at Animated Credited Amount & flows slowly down into Commission Card */}
                      <div className="flex justify-center">
                        <div
                          className={`animate-drop-left-comm-once px-2.5 py-1 rounded-xl border-2 shadow-2xl flex items-center gap-1 font-mono font-black text-[11px] whitespace-nowrap ${
                            isStock
                              ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 border-purple-200 text-white shadow-purple-950/90'
                              : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 border-yellow-200 text-white shadow-emerald-950/90'
                          }`}
                        >
                          <span>
                            +₹
                            {(delta.commission || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{' '}
                            Comm
                          </span>
                          <span className="text-yellow-200 text-xs leading-none">↓</span>
                        </div>
                      </div>

                      {/* Right Floating Drop -> Starts at Animated Credited Amount & flows slowly down into Volume Card */}
                      <div className="flex justify-center">
                        <div className="animate-drop-right-vol-once px-2.5 py-1 rounded-xl border-2 border-cyan-200 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-2xl shadow-cyan-950/90 flex items-center gap-1 font-mono font-black text-[11px] whitespace-nowrap">
                          <span>
                            +₹
                            {delta.volume.toLocaleString('en-IN', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{' '}
                            Vol
                          </span>
                          <span className="text-cyan-100 text-xs leading-none">↓</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Redesigned High-Contrast Professional Commission & Volume Ledger */}
                  <div
                    className={`rounded-2xl p-3 border-2 transition-all duration-300 shadow-lg ${
                      acc.isRunning
                        ? 'bg-[#091520] border-emerald-500/60 shadow-emerald-950/30'
                        : 'bg-[#0B1622] border-slate-700/80'
                    }`}
                  >
                    {/* 2-Column Split Cards: Left = Commission, Right = Volume */}
                    <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                      {/* LEFT CARD: COMMISSION */}
                      <div
                        className={`p-2.5 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
                          isStock
                            ? 'bg-gradient-to-br from-purple-950/85 via-slate-900/95 to-slate-950 border-purple-500/50'
                            : 'bg-gradient-to-br from-emerald-950/85 via-slate-900/95 to-slate-950 border-emerald-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                                isStock
                                  ? 'bg-purple-600 border-purple-400 text-white'
                                  : 'bg-emerald-600 border-emerald-400 text-white'
                              }`}
                            >
                              {isStock ? (
                                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <Percent className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </div>
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-white whitespace-nowrap">
                              Commission
                            </span>
                          </div>
                          <span
                            className={`text-[9.5px] font-black font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                              isStock
                                ? 'bg-purple-500/30 border border-purple-400/60 text-purple-200'
                                : 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-200'
                            }`}
                          >
                            {isStock ? `${stockRate}%` : `${gamingRate}%`}
                          </span>
                        </div>

                        <div
                          key={`comm_val_${acc.id}_${deltaTxType === 'credit' ? delta?.timestamp || 0 : 0}`}
                          className={`mt-2 origin-left ${
                            delta && delta.volume > 0 && deltaTxType === 'credit'
                              ? 'animate-ledger-pop-once'
                              : ''
                          }`}
                        >
                          <div
                            className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                              isStock ? 'text-purple-300' : 'text-emerald-300'
                            }`}
                          >
                            ₹
                            {commissionEarned.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-1 text-[9.5px] font-mono font-bold">
                            {delta && delta.volume > 0 && deltaTxType === 'credit' ? (
                              <span className={isStock ? 'text-purple-200' : 'text-emerald-200'}>
                                +₹
                                {(delta.commission || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                added
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                {isStock ? 'Stock Yield' : 'Gaming Yield'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT CARD: VOLUME (Total Credit Amount Only) */}
                      <div className="p-2.5 rounded-xl border border-cyan-500/50 bg-gradient-to-br from-cyan-950/85 via-slate-900/95 to-slate-950 relative overflow-hidden flex flex-col justify-between text-right">
                        <div className="flex items-center justify-between gap-1.5">
                          {acc.isRunning ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-mono font-black text-emerald-300 shrink-0">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                              </span>
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0">TOTAL</span>
                          )}
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-white whitespace-nowrap">
                            Volume
                          </span>
                        </div>

                        <div
                          key={`vol_val_${acc.id}_${deltaTxType === 'credit' ? delta?.timestamp || 0 : 0}`}
                          className={`mt-2 origin-right ${
                            delta && delta.volume > 0 && deltaTxType === 'credit'
                              ? 'animate-ledger-pop-once'
                              : ''
                          }`}
                        >
                          <div className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
                            ₹{runningVolume.toLocaleString('en-IN')}
                          </div>
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-[9.5px] font-mono font-bold">
                            {delta && delta.volume > 0 ? (
                              deltaTxType === 'credit' ? (
                                <span className="text-cyan-300">
                                  +₹
                                  {delta.volume.toLocaleString('en-IN', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  added
                                </span>
                              ) : deltaTxType === 'otp' ? (
                                <span className="text-amber-300">IMPS OTP Check</span>
                              ) : (
                                <span className="text-rose-300">Vol Unchanged</span>
                              )
                            ) : (
                              <span className="text-slate-400">Total Credit</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Volume Target Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="flex items-center gap-1 text-slate-300">
                          <span className="font-semibold text-slate-400">Target Limit:</span>
                          <strong className="font-mono font-extrabold text-white">
                            0 to {targetLabel} ({targetFormatted})
                          </strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/50 font-mono font-black text-emerald-300 text-[10px]">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-slate-950 border border-white/10 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            acc.isRunning || progressPercent === 100
                              ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400'
                              : 'bg-emerald-500/70'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Beneficiary & Run Work Actions Bottom Row */}
                <div 
                  className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
                  style={{
                    borderColor: 'var(--app-border-subtle)',
                    color: 'var(--app-text-muted)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>Beneficiary:</span>
                    <span className="font-extrabold truncate max-w-[130px] sm:max-w-[160px]" style={{ color: 'var(--app-text-primary)' }}>
                      {acc.accountHolderName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Run Button to start work on this bank account */}
                    <button
                      type="button"
                      onClick={() => handleToggleRun(acc.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-heading font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 ${
                        acc.isRunning
                          ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-600/25'
                          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                      title={acc.isRunning ? 'Pause work on this account' : 'Start work on this bank account'}
                    >
                      {acc.isRunning ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Running</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Work</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors border border-transparent hover:border-red-500/30"
                      title="Remove this bank account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Bank Account Modal Form */}
      <AddBankAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaveAccount={onAddAccount}
        defaultHolderName={defaultHolderName}
      />

      {/* Subscription Required Modal when user has no active plan and taps Run Work */}
      <SubscriptionRequiredModal
        isOpen={subRequiredModalOpen}
        onClose={() => setSubRequiredModalOpen(false)}
        onOpenPlans={() => {
          setSubRequiredModalOpen(false);
          onOpenPlans?.();
        }}
        bankName={targetBankName}
      />
    </div>
  );
};
