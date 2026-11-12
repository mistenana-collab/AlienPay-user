import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowUpFromLine, 
  CreditCard, 
  Coins, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  Building,
  Plus,
  Zap,
  Fingerprint
} from 'lucide-react';
import { WalletBalances, Transaction, UserProfile, SavedBankAccount, ActiveScreen } from '../../types';
import { ApiService } from '../../services/apiService';
import { BiometricModal } from '../modals/BiometricModal';

interface WithdrawScreenProps {
  balances: WalletBalances;
  transactions: Transaction[];
  user: UserProfile;
  savedBankAccounts?: SavedBankAccount[];
  onNavigate: (screen: ActiveScreen) => void;
  onWithdrawSuccess: (tx: Transaction, newBals: { inrBalance: number; usdtBalance: number }) => void;
  selectedCurrency?: 'INR' | 'USDT';
}

export const WithdrawScreen: React.FC<WithdrawScreenProps> = ({
  balances,
  transactions,
  user,
  savedBankAccounts = [],
  onNavigate,
  onWithdrawSuccess,
  selectedCurrency = 'INR',
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USDT'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return selectedCurrency || 'INR';
  });
  const [amount, setAmount] = useState<string>(currency === 'INR' ? '5000' : '50');
  const primaryBank = savedBankAccounts && savedBankAccounts.length > 0
    ? (savedBankAccounts.find(a => a.isPrimary) || savedBankAccounts[0])
    : null;

  const [inrMethod, setInrMethod] = useState<'bank' | 'upi'>('bank');
  const [inrUpiId, setInrUpiId] = useState(
    user.bankDetails?.upiId || 'rohitdear@okhdfcbank'
  );

  const [inrAccountNumber, setInrAccountNumber] = useState(
    primaryBank?.accountNumber || user.bankDetails?.accountNumber || ''
  );
  const [inrAccountHolderName, setInrAccountHolderName] = useState(
    primaryBank?.accountHolderName || user.bankDetails?.accountHolder || user.fullName || ''
  );
  const [inrIfscCode, setInrIfscCode] = useState(
    primaryBank?.ifscCode || user.bankDetails?.ifscCode || ''
  );
  const [inrBankName, setInrBankName] = useState(
    primaryBank?.bankName || user.bankDetails?.bankName || ''
  );

  const [bep20Address, setBep20Address] = useState(
    user.cryptoDetails?.bep20Address || '0x71C949A12B8F62a3449c4E750e5008542F6E3B95'
  );

  const [pin, setPin] = useState('');
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'INR' | 'USDT'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const exchangeRate = balances.exchangeRateUsdtToInr || 100;
  const totalInr = balances.inrBalance + (balances.usdtBalance * exchangeRate);
  const totalUsdt = balances.usdtBalance + (balances.inrBalance / exchangeRate);
  const availableBalance = currency === 'INR' ? totalInr : totalUsdt;

  const handleCurrencyChange = (newCur: 'INR' | 'USDT') => {
    setCurrency(newCur);
    if (newCur === 'INR') {
      setAmount('5000');
    } else {
      setAmount('50');
    }
    setErrorMsg(null);
    try {
      localStorage.setItem('alienpay_selected_currency', newCur);
    } catch {}
  };

  const numAmount = parseFloat(amount) || 0;
  const feeRate = 0.05; // 5% fee
  const fee = numAmount * feeRate;
  const netPayout = Math.max(0, numAmount - fee);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(`Insufficient ${currency} balance. Available: ${currency === 'INR' ? `₹${availableBalance.toFixed(2)}` : `$${availableBalance.toFixed(2)} USDT`}`);
      return;
    }

    if (currency === 'INR') {
      if (inrMethod === 'bank') {
        if (!inrAccountNumber.trim()) {
          setErrorMsg('Please enter your Bank Account Number.');
          return;
        }
        if (!inrAccountHolderName.trim()) {
          setErrorMsg('Please enter the Account Holder Name.');
          return;
        }
        if (!inrIfscCode.trim()) {
          setErrorMsg('Please enter the Bank IFSC Code.');
          return;
        }
      } else {
        if (!inrUpiId.trim() || !inrUpiId.includes('@')) {
          setErrorMsg('Please enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@upi).');
          return;
        }
      }
    } else {
      if (!bep20Address.trim() || !bep20Address.startsWith('0x')) {
        setErrorMsg('Please enter a valid BEP-20 USDT wallet address starting with 0x.');
        return;
      }
    }

    if (!biometricVerified) {
      const configuredPin = (user.securityPin || ApiService.getStoredUser()?.securityPin || '').trim();
      if (!configuredPin) {
        setErrorMsg('Please set your custom 4-digit Security PIN in Settings before withdrawing, or use Biometric authentication.');
        return;
      }
      if (!pin || pin.trim().length < 4) {
        setErrorMsg('Please enter your 4-digit transaction security PIN.');
        return;
      }
      const isPinValid = pin.trim() === configuredPin || ApiService.verifySecurityPin(pin, user);
      if (!isPinValid) {
        setErrorMsg('Incorrect Security PIN. Please enter your valid 4-digit PIN.');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      // Deduct balance as it enters pending payout (supports unified pool across INR & USDT @ 1 USDT = 100 INR)
      let newInr = balances.inrBalance;
      let newUsdt = balances.usdtBalance;
      if (currency === 'INR') {
        if (numAmount <= balances.inrBalance) {
          newInr = balances.inrBalance - numAmount;
        } else {
          const remainingInr = numAmount - balances.inrBalance;
          newInr = 0;
          newUsdt = Math.max(0, balances.usdtBalance - (remainingInr / exchangeRate));
        }
      } else {
        if (numAmount <= balances.usdtBalance) {
          newUsdt = balances.usdtBalance - numAmount;
        } else {
          const remainingUsdt = numAmount - balances.usdtBalance;
          newUsdt = 0;
          newInr = Math.max(0, balances.inrBalance - (remainingUsdt * exchangeRate));
        }
      }

      const refId = 'WD' + Math.floor(100000 + Math.random() * 900000);
      const finalDestination = currency === 'INR'
        ? (inrMethod === 'bank'
            ? `${inrBankName ? inrBankName + ' · ' : ''}A/C: ${inrAccountNumber} | Name: ${inrAccountHolderName} | IFSC: ${inrIfscCode}`
            : `UPI ID: ${inrUpiId.trim()}${inrAccountHolderName ? ` (${inrAccountHolderName})` : ''}`
          )
        : bep20Address;

      const payoutMethod = currency === 'INR'
        ? (inrMethod === 'bank' ? 'Bank Account Payout (IMPS)' : 'UPI Instant Payout')
        : 'BEP-20 Crypto Payout';

      const tx: Transaction = {
        id: 'tx_wd_' + Date.now(),
        type: 'withdraw',
        currency,
        amount: numAmount,
        equivalentAmount: currency === 'INR' ? numAmount / exchangeRate : numAmount * exchangeRate,
        fee,
        status: 'pending', // Pending status as requested by user!
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: payoutMethod,
        referenceId: refId,
        destinationAddress: finalDestination,
        recipientName: currency === 'INR' ? (inrAccountHolderName || (inrMethod === 'upi' ? inrUpiId : undefined)) : undefined,
        note: `Payout to ${finalDestination} (Pending Verification)`,
      };

      onWithdrawSuccess(tx, { inrBalance: newInr, usdtBalance: newUsdt });
      setPin('');
      setActionNotice(`Withdrawal request of ${currency === 'INR' ? `₹${numAmount.toLocaleString('en-IN')}` : `$${numAmount} USDT`} submitted! Status: PENDING verification.`);
      setTimeout(() => setActionNotice(null), 6000);
    }, 800);
  };

  // Filter withdrawal transactions
  const withdrawTransactions = transactions.filter((t) => t.type === 'withdraw');
  const filteredWithdrawals = withdrawTransactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
    return true;
  });

  const pendingCount = withdrawTransactions.filter((t) => t.status === 'pending').length;
  const completedCount = withdrawTransactions.filter((t) => t.status === 'completed').length;

  return (
    <div className="flex-1 flex flex-col pb-16 transition-colors duration-250">
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

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Withdraw Payout & History
          </h1>
        </div>

        <div className="w-16" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{actionNotice}</div>
          </div>
        )}

        {/* Unified Available Balance Card (Single Box with Currency Switcher: INR | USDT) */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface))',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-primary)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>Available for Withdrawal</span>
            
            {/* 2 Options Currency Switcher */}
            <div 
              className="flex items-center p-0.5 rounded-lg border text-[11px]"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => handleCurrencyChange('INR')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  currency === 'INR'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: currency === 'INR' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                INR
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('USDT')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  currency === 'USDT'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: currency === 'USDT' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                USDT
              </button>
            </div>
          </div>

          {/* Single Box Unified Available Balance */}
          <div 
            className="p-3.5 rounded-xl border transition-all"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-heading font-black text-2xl tracking-tight tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {currency === 'INR' ? (
                  <>₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                ) : (
                  <>${totalUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</>
                )}
              </div>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase"
                style={{
                  backgroundColor: 'var(--app-surface-highlight)',
                  color: 'var(--app-text-secondary)',
                }}
              >
                {currency} Payout
              </span>
            </div>

            {/* Live Equivalent & Fixed Rate (1 USDT = 100 INR) */}
            <div 
              className="flex items-center justify-between text-[11px] pt-2 mt-1 border-t font-mono"
              style={{
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
              }}
            >
              <span>
                {currency === 'INR' ? (
                  <>≈ ${totalUsdt.toFixed(2)} USDT</>
                ) : (
                  <>≈ ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</>
                )}
              </span>
              <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                1 USDT = ₹{exchangeRate.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Withdrawal Form Card */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <h2 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
              Request Payout
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">
              Fast Settlement
            </span>
          </div>

          {/* Currency Switcher */}
          <div 
            className="grid grid-cols-2 gap-2 mb-3.5 p-1 rounded-xl border transition-colors duration-250"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleCurrencyChange('INR')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                currency === 'INR'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>INR (Bank Account)</span>
            </button>

            <button
              type="button"
              onClick={() => handleCurrencyChange('USDT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                currency === 'USDT'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>USDT (BEP-20)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-3 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-400 p-2.5 rounded-xl flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmitWithdraw} className="space-y-3.5 text-xs">
            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                  Withdrawal Amount ({currency})
                </label>
                <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                  Max: {currency === 'INR' ? `₹${availableBalance.toFixed(2)}` : `$${availableBalance.toFixed(2)}`}
                </span>
              </div>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl px-3 py-2.5 font-mono text-sm focus:outline-none transition-colors border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
              {/* Shortcut buttons */}
              <div className="flex gap-1.5 mt-2">
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const val = Math.floor(availableBalance * ratio);
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className="flex-1 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--app-surface-subtle)',
                        borderColor: 'var(--app-border-subtle)',
                        color: 'var(--app-text-secondary)',
                      }}
                    >
                      {ratio === 1 ? 'MAX' : `${ratio * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payout Destination Fields */}
            {currency === 'INR' ? (
              <div className="space-y-3 rounded-2xl p-3 border" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
                {/* Method selector for INR: Bank Account vs UPI ID */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/25 border border-[var(--app-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => { setInrMethod('bank'); setErrorMsg(null); }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      inrMethod === 'bank'
                        ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Bank Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setInrMethod('upi'); setErrorMsg(null); }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      inrMethod === 'upi'
                        ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>UPI ID</span>
                  </button>
                </div>

                {inrMethod === 'bank' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                        Bank Payout Details
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Direct IMPS Transfer
                      </span>
                    </div>

                    {/* Quick select from saved bank accounts if available */}
                    {savedBankAccounts.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-dim)' }}>
                          Quick Select from Saved Bank Accounts:
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {savedBankAccounts.map((acc) => {
                            const isSelected = inrAccountNumber === acc.accountNumber;
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                  setInrBankName(acc.bankName);
                                  setInrAccountNumber(acc.accountNumber);
                                  setInrAccountHolderName(acc.accountHolderName);
                                  setInrIfscCode(acc.ifscCode);
                                }}
                                className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between text-xs ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                                    : 'border-[var(--app-border-subtle)] bg-[var(--app-surface)] text-[var(--app-text-body)] hover:border-cyan-500/40'
                                }`}
                              >
                                <div className="truncate">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>{acc.bankName}</span>
                                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded font-mono">
                                      {acc.fundType === 'stock' ? '📈 Stock' : '🎮 Gaming'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono opacity-80 mt-0.5">
                                    A/C: •••• {acc.accountNumber.slice(-4)} · {acc.accountHolderName} · IFSC: {acc.ifscCode}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bank Account Number */}
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Bank Account Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrAccountNumber}
                        onChange={(e) => setInrAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter bank account number"
                        className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Account Holder Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrAccountHolderName}
                        onChange={(e) => setInrAccountHolderName(e.target.value)}
                        placeholder="Full name as in bank passbook / app"
                        className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Bank IFSC Code <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={inrIfscCode}
                        onChange={(e) => setInrIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0000128"
                        className="w-full rounded-xl px-3 py-2 font-mono text-xs uppercase focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                        UPI Payout Details
                      </span>
                      <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full">
                        Instant UPI Transfer
                      </span>
                    </div>

                    {/* UPI ID Field */}
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        UPI ID / VPA <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrUpiId}
                        onChange={(e) => setInrUpiId(e.target.value.trim().toLowerCase())}
                        placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                        className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* Quick UPI Handle suggestions */}
                    <div>
                      <span className="text-[10px] block mb-1" style={{ color: 'var(--app-text-dim)' }}>
                        Common Handles:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {['@okhdfcbank', '@okaxis', '@oksbi', '@paytm', '@ybl', '@ibl'].map((handle) => {
                          const base = inrUpiId.includes('@') ? inrUpiId.split('@')[0] : inrUpiId;
                          return (
                            <button
                              key={handle}
                              type="button"
                              onClick={() => setInrUpiId((base || 'user') + handle)}
                              className="px-2 py-0.5 rounded-md border text-[10px] font-mono cursor-pointer transition-colors"
                              style={{
                                backgroundColor: 'var(--app-surface)',
                                borderColor: 'var(--app-border-subtle)',
                                color: 'var(--app-text-secondary)',
                              }}
                            >
                              {handle}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Account Holder Name */}
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={inrAccountHolderName}
                        onChange={(e) => setInrAccountHolderName(e.target.value)}
                        placeholder="Full name as in UPI app"
                        className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[10px] text-teal-300 flex items-start gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>Instant payout to Google Pay, PhonePe, Paytm, BHIM, or any verified UPI VPA.</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl p-3 border" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                    USDT (BEP-20) Payout Address <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    BNB Smart Chain (BEP-20)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={bep20Address}
                  onChange={(e) => setBep20Address(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl px-3 py-2.5 font-mono text-xs focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Only send to your verified <strong>BEP-20 (BNB Smart Chain)</strong> address for automated processing.</span>
                </div>
              </div>
            )}

            {/* Fee Breakdown Box */}
            <div 
              className="p-3 rounded-xl border text-[11px] space-y-1.5"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex justify-between" style={{ color: 'var(--app-text-dim)' }}>
                <span>Requested Amount:</span>
                <span className="font-semibold" style={{ color: 'var(--app-text-primary)' }}>
                  {currency === 'INR' ? `₹${numAmount.toLocaleString('en-IN')}` : `$${numAmount.toFixed(2)} USDT`}
                </span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Platform Processing Fee (5%):</span>
                <span>-{currency === 'INR' ? `₹${fee.toFixed(2)}` : `$${fee.toFixed(2)} USDT`}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t text-xs" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <span style={{ color: 'var(--app-text-primary)' }}>Net Payout Dispatched:</span>
                <span className="text-emerald-400 font-heading font-extrabold text-sm">
                  {currency === 'INR' ? `₹${netPayout.toFixed(2)}` : `$${netPayout.toFixed(2)} USDT`}
                </span>
              </div>
            </div>

            {/* Security PIN & Biometric Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold flex items-center gap-1" style={{ color: 'var(--app-text-muted)' }}>
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>4-Digit Security PIN</span>
                </label>
                {user.biometricEnabled !== false && (
                  <button
                    type="button"
                    onClick={() => setShowBiometricModal(true)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                      biometricVerified
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                        : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>{biometricVerified ? 'Biometric Verified' : 'Use Biometrics'}</span>
                  </button>
                )}
              </div>

              {biometricVerified ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Authenticated via Biometric Sensor</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBiometricVerified(false)}
                    className="text-[10px] underline opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Use PIN
                  </button>
                </div>
              ) : (
                <input
                  type="password"
                  maxLength={4}
                  required={!biometricVerified}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your 4-digit PIN"
                  className="w-full rounded-xl px-3 py-2 font-mono text-center tracking-widest text-sm focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              )}
            </div>

            <BiometricModal
              isOpen={showBiometricModal}
              onClose={() => setShowBiometricModal(false)}
              onSuccess={() => {
                setShowBiometricModal(false);
                setBiometricVerified(true);
                setErrorMsg(null);
              }}
              onFallbackToPin={() => {
                setShowBiometricModal(false);
                setBiometricVerified(false);
              }}
              title="Verify Withdrawal"
              subtitle="Scan fingerprint or Face ID to authorize payout"
            />

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Pending Settlement Policy:</strong> All withdrawals (INR & USDT) enter <span className="underline font-bold">Pending status</span> immediately and are processed upon settlement verification.
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Submit Withdrawal Request (Pending Approval)</span>
              )}
            </button>
          </form>
        </div>

        {/* Withdrawal Transaction History Section */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
                Withdrawal Transaction History
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {withdrawTransactions.length}
              </span>
            </div>

            {pendingCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {pendingCount} Pending Review
              </span>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            {/* Status pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['all', 'pending', 'completed', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-black/20 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Currency toggle */}
            <div className="flex items-center gap-1 text-[11px]">
              {(['all', 'INR', 'USDT'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrencyFilter(curr)}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${
                    currencyFilter === curr
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-black/20 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          {filteredWithdrawals.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--app-text-dim)' }}>
              <ArrowUpFromLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No withdrawal transactions found</p>
              <p className="text-[10px] mt-1">Submit a withdrawal above to view payout records here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredWithdrawals.map((tx) => {
                const isPending = tx.status === 'pending';
                const isCompleted = tx.status === 'completed';
                const isRejected = tx.status === 'rejected';

                const gross = tx.amount;
                const net = Math.max(0, gross - (tx.fee || gross * 0.05));

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border transition-all hover:border-cyan-500/40 relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    {/* Top row: Amount & Status Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-heading font-extrabold text-sm text-amber-400">
                              -{tx.currency === 'INR' ? `₹${tx.amount.toLocaleString('en-IN')}` : `$${tx.amount.toFixed(2)} USDT`}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              Net: {tx.currency === 'INR' ? `₹${net.toFixed(2)}` : `$${net.toFixed(2)}`}
                            </span>
                          </div>
                          <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>
                            {tx.method}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isPending && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          <Clock className="w-3 h-3 animate-spin text-amber-400" />
                          <span>Pending Payout</span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected (Refunded)</span>
                        </div>
                      )}
                    </div>

                    {/* Details row: Destination & Reference */}
                    <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-1 text-[11px]" style={{ borderColor: 'var(--app-border-subtle)' }}>
                      <div className="text-[11px] font-mono text-slate-300 truncate max-w-[200px]">
                        To: <span className="text-cyan-300">{tx.destinationAddress || tx.note || 'User account'}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                        <span>Ref: {tx.referenceId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tx.referenceId, tx.id)}
                          className="opacity-70 hover:opacity-100 cursor-pointer ml-0.5"
                        >
                          {copied === tx.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Timestamp & remark */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{tx.timestamp}</span>
                      {tx.adminRemark && (
                        <span className="text-amber-300 italic">{tx.adminRemark}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
