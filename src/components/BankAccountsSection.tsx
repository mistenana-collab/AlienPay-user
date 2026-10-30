import React, { useState } from 'react';
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
  CheckCircle2
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
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                  Gaming & Stock
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded">
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
            <div className="font-heading font-extrabold text-xs text-emerald-400 mt-0.5 font-mono">5% / 10%</div>
            <div className="text-[8px] font-medium text-emerald-400/90 mt-0.5">🎮 5% · 📈 10%</div>
          </div>

          <div 
            className="p-2 rounded-xl border text-center transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>Current</div>
            <div className="font-heading font-extrabold text-xs text-cyan-400 mt-0.5 font-mono">3% / 5%</div>
            <div className="text-[8px] font-medium text-cyan-400/90 mt-0.5">🎮 3% · 📈 5%</div>
          </div>

          <div 
            className="p-2 rounded-xl border text-center transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--app-text-dim)' }}>Corporate</div>
            <div className="font-heading font-extrabold text-xs text-purple-400 mt-0.5 font-mono">4% / 6%</div>
            <div className="text-[8px] font-medium text-purple-400/90 mt-0.5">🎮 4% · 📈 6%</div>
          </div>
        </div>

        <div className="text-[9.5px] flex items-center justify-between pt-1.5 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <span style={{ color: 'var(--app-text-dim)' }}>Gaming & Stock Fund Turnover</span>
          <span className="font-bold text-emerald-400 font-mono">⚡ Instant Settlement</span>
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

            return (
              <div
                key={acc.id}
                className={`rounded-2xl p-4 border shadow-xl relative overflow-hidden group transition-all ${
                  acc.isRunning ? 'ring-2 ring-emerald-500/50' : ''
                }`}
                style={{
                  background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface))',
                  borderColor: acc.isRunning ? 'rgba(16, 185, 129, 0.5)' : 'var(--app-border)',
                  color: 'var(--app-text-primary)',
                  boxShadow: '0 10px 25px -5px var(--app-shadow)',
                }}
              >
                {/* Bank Card Top Row: Bank Name + Badges */}
                <div 
                  className="flex items-start justify-between mb-3 pb-2.5 border-b"
                  style={{ borderColor: 'var(--app-border-subtle)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow"
                      style={{
                        backgroundColor: 'var(--app-surface-subtle)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text-secondary)',
                      }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-extrabold text-sm" style={{ color: 'var(--app-text-primary)' }}>
                        {acc.bankName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                          {acc.accountType} Account
                        </span>
                        {acc.branchName && (
                          <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>· {acc.branchName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Primary tag removed as requested */}
                    <span 
                      className="text-[9px] font-bold border px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{
                        backgroundColor: 'var(--app-surface-highlight)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text-secondary)',
                      }}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>Verified</span>
                    </span>

                    {/* ONLY keep gaming symbol or stock symbol that user choose during add bank account */}
                    {isStock ? (
                      <span className="text-[9px] font-bold border border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <span>📈 Stock Fund {stockRate}%</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <span>🎮 Gaming Fund {gamingRate}%</span>
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
                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--app-text-dim)' }}>
                      <span>Account Number</span>
                      <button
                        type="button"
                        onClick={() => toggleReveal(acc.id)}
                        className="cursor-pointer hover:opacity-100 opacity-70"
                        style={{ color: 'var(--app-text-secondary)' }}
                        title={isRevealed ? 'Hide account number' : 'Show full number'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="font-mono font-bold tracking-wide text-xs" style={{ color: 'var(--app-text-primary)' }}>
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
                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--app-text-dim)' }}>
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
                    <div className="font-mono font-bold tracking-wider text-xs" style={{ color: 'var(--app-text-secondary)' }}>
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
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono font-bold">
                        Corp ID: {acc.corporateId}
                      </span>
                    )}
                    {acc.groupId && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 font-mono font-bold">
                        Group: {acc.groupId}
                      </span>
                    )}
                    {acc.domainId && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                        Domain: {acc.domainId}
                      </span>
                    )}
                    {acc.atmCardNumber && (
                      <span className="px-2 py-0.5 rounded bg-black/30 text-slate-200 border border-slate-700 font-mono flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-cyan-400" />
                        <span>Card: •••• {acc.atmCardNumber.replace(/\s/g, '').slice(-4)}</span>
                        {acc.expiryDate && <span className="opacity-70">({acc.expiryDate})</span>}
                      </span>
                    )}
                  </div>
                )}

                {/* Accounting Running Commission Strip - Live Processed Volume & Commission */}
                <div 
                  className={`p-3 rounded-2xl border mb-3 text-xs transition-all ${
                    acc.isRunning ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: acc.isRunning ? 'rgba(16, 185, 129, 0.4)' : 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {/* Left: Commission Tab */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                        isStock 
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {isStock ? <TrendingUp className="w-4 h-4 stroke-[2.5]" /> : <Percent className="w-4 h-4 stroke-[2.5]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--app-text-dim)' }}>
                          <span className="truncate">{isStock ? 'Stock Commission' : 'Gaming Commission'}</span>
                          <span className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded border ${
                            isStock 
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {isStock ? `📈 ${stockRate}%` : `🎮 ${gamingRate}%`}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-xs sm:text-sm font-black font-mono tracking-tight ${isStock ? 'text-purple-400' : 'text-emerald-400'}`}>
                            ₹{commissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Processed Volume Tab */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-medium flex items-center justify-end gap-1" style={{ color: 'var(--app-text-dim)' }}>
                        {acc.isRunning && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                        <span>Processed Volume</span>
                      </div>
                      <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                        {acc.lastProcessedDelta && acc.lastProcessedDelta.volume > 0 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                            +₹{acc.lastProcessedDelta.volume.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-xs sm:text-sm font-black font-mono tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
                          ₹{runningVolume.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Volume Target Progress Bar */}
                  <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1" style={{ color: 'var(--app-text-dim)' }}>
                        <span>Limit:</span>
                        <strong className="font-semibold text-slate-200">
                          0 to {targetLabel} ({targetFormatted})
                        </strong>
                      </span>
                      <span className="font-mono font-black" style={{ color: acc.isRunning || progressPercent === 100 ? '#10b981' : 'var(--app-text-dim)' }}>
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800/40 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          acc.isRunning || progressPercent === 100
                            ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400' 
                            : 'bg-emerald-500/50'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
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
                    <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Beneficiary:</span>
                    <span className="font-bold truncate max-w-[130px] sm:max-w-[160px]" style={{ color: 'var(--app-text-primary)' }}>
                      {acc.accountHolderName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Run Button to start work on this bank account */}
                    <button
                      type="button"
                      onClick={() => handleToggleRun(acc.id)}
                      className={`px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 ${
                        acc.isRunning
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/10'
                          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                      title={acc.isRunning ? 'Pause work on this account' : 'Start work on this bank account'}
                    >
                      {acc.isRunning ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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

                {/* Live Active Work Banner when account is running */}
                {acc.isRunning && (
                  <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>OTP Work Active · Processing Transactions</span>
                    </span>
                    <span className="font-mono font-black text-emerald-400">
                      ⚡ Running
                    </span>
                  </div>
                )}
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
