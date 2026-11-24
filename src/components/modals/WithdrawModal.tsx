import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpFromLine, 
  CreditCard, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Lock,
  Clock,
  Building,
  Check,
  Zap,
  Fingerprint
} from 'lucide-react';
import { WalletBalances, Transaction, UserProfile, SavedBankAccount, ActiveScreen } from '../../types';
import { ApiService } from '../../services/apiService';
import { BiometricModal } from './BiometricModal';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: 'INR' | 'USDT';
  exchangeRate: number;
  currentBalances: WalletBalances;
  user: UserProfile;
  savedBankAccounts?: SavedBankAccount[];
  onWithdrawSuccess: (transaction: Transaction, newBalances: { inrBalance: number; usdtBalance: number }) => void;
  onNavigate?: (screen: ActiveScreen) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  defaultCurrency = 'INR',
  exchangeRate,
  currentBalances,
  user,
  savedBankAccounts = [],
  onWithdrawSuccess,
  onNavigate,
}) => {
  const primaryBank = savedBankAccounts.find(b => b.isPrimary) || savedBankAccounts[0];

  const [currency, setCurrency] = useState<'INR' | 'USDT'>(defaultCurrency);
  const [inrMethod, setInrMethod] = useState<'bank' | 'upi'>('bank');
  const [inrUpiId, setInrUpiId] = useState(
    user.bankDetails?.upiId || 'rohitdear@okhdfcbank'
  );
  const [amount, setAmount] = useState<string>('');
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
  const [success, setSuccess] = useState(false);

  // Sync state whenever the modal opens or defaultCurrency changes
  useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency);
      setInrMethod('bank');
      setInrUpiId(user.bankDetails?.upiId || 'rohitdear@okhdfcbank');
      setSuccess(false);
      setErrorMsg(null);
      setAmount('');
      setPin('');
      setBiometricVerified(false);
      setInrAccountNumber(primaryBank?.accountNumber || user.bankDetails?.accountNumber || '');
      setInrAccountHolderName(primaryBank?.accountHolderName || user.bankDetails?.accountHolder || user.fullName || '');
      setInrIfscCode(primaryBank?.ifscCode || user.bankDetails?.ifscCode || '');
      setInrBankName(primaryBank?.bankName || user.bankDetails?.bankName || '');
      setBep20Address(user.cryptoDetails?.bep20Address || '0x71C949A12B8F62a3449c4E750e5008542F6E3B95');
    }
  }, [isOpen, defaultCurrency]);

  if (!isOpen) return null;

  const totalInr = currentBalances.inrBalance + (currentBalances.usdtBalance * exchangeRate);
  const totalUsdt = currentBalances.usdtBalance + (currentBalances.inrBalance / exchangeRate);
  const availableBalance = currency === 'INR' ? totalInr : totalUsdt;
  const numAmount = parseFloat(amount) || 0;
  const feePercent = 0.01; // 1% processing fee
  const fee = numAmount * feePercent;
  const netPayout = Math.max(0, numAmount - fee);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(`Insufficient ${currency} balance. Available: ${currency === 'INR' ? `₹${availableBalance.toFixed(2)}` : `$${availableBalance.toFixed(2)}`}`);
      return;
    }

    if (currency === 'INR') {
      if (inrMethod === 'bank') {
        if (!inrAccountNumber.trim()) {
          setErrorMsg('Please enter your Bank Account Number.');
          return;
        }
        if (!inrAccountHolderName.trim()) {
          setErrorMsg('Please enter Account Holder Name.');
          return;
        }
        if (!inrIfscCode.trim()) {
          setErrorMsg('Please enter Bank IFSC Code.');
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
        setErrorMsg('Please enter a valid BEP-20 USDT wallet address (starts with 0x).');
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
        setErrorMsg('Incorrect Security PIN. Please enter your valid 4-digit transaction PIN.');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);

      let newInr = currentBalances.inrBalance;
      let newUsdt = currentBalances.usdtBalance;
      if (currency === 'INR') {
        if (numAmount <= currentBalances.inrBalance) {
          newInr = currentBalances.inrBalance - numAmount;
        } else {
          const remainingInr = numAmount - currentBalances.inrBalance;
          newInr = 0;
          newUsdt = Math.max(0, currentBalances.usdtBalance - (remainingInr / exchangeRate));
        }
      } else {
        if (numAmount <= currentBalances.usdtBalance) {
          newUsdt = currentBalances.usdtBalance - numAmount;
        } else {
          const remainingUsdt = numAmount - currentBalances.usdtBalance;
          newUsdt = 0;
          newInr = Math.max(0, currentBalances.inrBalance - (remainingUsdt * exchangeRate));
        }
      }

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
        id: 'tx_' + Date.now(),
        type: 'withdraw',
        currency,
        amount: numAmount,
        equivalentAmount: currency === 'INR' ? numAmount / exchangeRate : numAmount * exchangeRate,
        fee,
        status: 'pending',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: payoutMethod,
        referenceId: 'WD' + Math.floor(100000 + Math.random() * 900000),
        destinationAddress: finalDestination,
        recipientName: currency === 'INR' ? (inrAccountHolderName || (inrMethod === 'upi' ? inrUpiId : undefined)) : undefined,
        note: `Payout to ${finalDestination} (Pending Verification)`,
      };

      onWithdrawSuccess(tx, { inrBalance: newInr, usdtBalance: newUsdt });
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none overflow-y-auto">
      <div 
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto transition-colors duration-250"
        style={{
          background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface), var(--app-surface-subtle))',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
          boxShadow: '0 20px 40px -10px var(--app-shadow)',
        }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base" style={{ color: 'var(--app-text-primary)' }}>Withdraw Funds</h3>
              <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Fast settlement to your verified account</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg cursor-pointer hover:opacity-80"
            style={{ color: 'var(--app-text-dim)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Switcher */}
        <div 
          className="grid grid-cols-2 gap-2 my-3 p-1 rounded-xl border transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface-subtle)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setCurrency('INR');
              setErrorMsg(null);
            }}
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
            onClick={() => {
              setCurrency('USDT');
              setErrorMsg(null);
            }}
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
          <div className="mb-3 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-600 dark:text-red-200 p-2.5 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px] mb-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Status: Pending Verification
              </div>
              <h4 className="font-heading font-bold text-lg" style={{ color: 'var(--app-text-primary)' }}>
                Withdrawal Queued!
              </h4>
            </div>
            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
              Your payout request for <span className="font-semibold text-white">{currency === 'INR' ? `₹${numAmount}` : `$${numAmount} USDT`}</span> has been submitted. Net payout <span className="font-semibold text-teal-400">{currency === 'INR' ? `₹${netPayout.toFixed(2)}` : `$${netPayout.toFixed(2)} USDT`}</span> is pending settlement verification.
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('withdraw');
                }}
                className="mt-2 text-xs font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                View in Withdrawal History →
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {/* Available Balance Box */}
            <div 
              className="p-2.5 rounded-xl border transition-colors duration-250"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Available to Withdraw</span>
                  <span className="font-mono text-sm font-extrabold" style={{ color: 'var(--app-text-primary)' }}>
                    {currency === 'INR' ? `₹${totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${totalUsdt.toFixed(2)} USDT`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance.toFixed(2))}
                  className="text-[10px] font-bold border px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-highlight)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  Max All
                </button>
              </div>
              <div className="text-[10px] mt-1 pt-1 border-t flex items-center justify-between font-mono" style={{ borderColor: 'var(--app-border-subtle)', color: 'var(--app-text-dim)' }}>
                <span>
                  {currency === 'INR' ? `≈ $${totalUsdt.toFixed(2)} USDT` : `≈ ₹${totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR`}
                </span>
                <span className="opacity-80">1 USDT = ₹{exchangeRate.toFixed(0)}</span>
              </div>
            </div>

            {/* Payout Destination Fields */}
            {currency === 'INR' ? (
              <div className="space-y-2.5 rounded-2xl p-3 border" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
                {/* Method selector for INR: Bank Account vs UPI ID */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/25 border border-[var(--app-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => { setInrMethod('bank'); setErrorMsg(null); }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      inrMethod === 'bank'
                        ? 'bg-teal-500 text-slate-950 shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    <span>Bank Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setInrMethod('upi'); setErrorMsg(null); }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      inrMethod === 'upi'
                        ? 'bg-teal-500 text-slate-950 shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>UPI ID</span>
                  </button>
                </div>

                {inrMethod === 'bank' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-xs" style={{ color: 'var(--app-text-muted)' }}>
                        Bank Account Details
                      </label>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        Direct IMPS
                      </span>
                    </div>

                    {/* Quick Select from Saved Bank Accounts */}
                    {savedBankAccounts.length > 0 && (
                      <div>
                        <span className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-dim)' }}>
                          Quick Select from Saved Banks:
                        </span>
                        <div className="space-y-1">
                          {savedBankAccounts.map((b) => {
                            const isSelected = inrAccountNumber === b.accountNumber;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setInrBankName(b.bankName);
                                  setInrAccountNumber(b.accountNumber);
                                  setInrAccountHolderName(b.accountHolderName);
                                  setInrIfscCode(b.ifscCode);
                                }}
                                className={`w-full text-left p-1.5 rounded-lg border text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                                    : 'border-[var(--app-border-subtle)] bg-[var(--app-surface)] text-[var(--app-text-body)] hover:border-cyan-500/40'
                                }`}
                              >
                                <span className="truncate">
                                  {b.bankName} (•••• {b.accountNumber.slice(-4)}) · {b.accountHolderName}
                                </span>
                                <span className="text-[10px] font-mono shrink-0 ml-1">{b.ifscCode}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bank Account Number */}
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: 'var(--app-text-dim)' }}>
                        Bank Account Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrAccountNumber}
                        onChange={(e) => setInrAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter account number"
                        className="w-full rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: 'var(--app-text-dim)' }}>
                        Account Holder Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrAccountHolderName}
                        onChange={(e) => setInrAccountHolderName(e.target.value)}
                        placeholder="Account holder full name"
                        className="w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* IFSC Code */}
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: 'var(--app-text-dim)' }}>
                        Bank IFSC Code <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={inrIfscCode}
                        onChange={(e) => setInrIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0000128"
                        className="w-full rounded-xl px-3 py-1.5 font-mono text-xs uppercase focus:outline-none transition-colors border"
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
                      <label className="font-semibold text-xs" style={{ color: 'var(--app-text-muted)' }}>
                        UPI Payout Details
                      </label>
                      <span className="text-[9px] text-teal-400 font-bold bg-teal-500/10 border border-teal-500/30 px-1.5 py-0.2 rounded">
                        Instant UPI
                      </span>
                    </div>

                    {/* UPI ID Field */}
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: 'var(--app-text-dim)' }}>
                        UPI ID / VPA <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inrUpiId}
                        onChange={(e) => setInrUpiId(e.target.value.trim().toLowerCase())}
                        placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                        className="w-full rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    {/* Quick UPI Handle suggestions */}
                    <div>
                      <span className="text-[9px] block mb-1" style={{ color: 'var(--app-text-dim)' }}>
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
                              className="px-2 py-0.5 rounded-md border text-[9px] font-mono cursor-pointer transition-colors"
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

                    {/* Recipient Name */}
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: 'var(--app-text-dim)' }}>
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={inrAccountHolderName}
                        onChange={(e) => setInrAccountHolderName(e.target.value)}
                        placeholder="Full name as in UPI app"
                        className="w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[10px] text-teal-300 flex items-start gap-1.5">
                      <Zap className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                      <span>Instant payout to Google Pay, PhonePe, Paytm, BHIM, or any verified UPI ID.</span>
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
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    BEP-20
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={bep20Address}
                  onChange={(e) => setBep20Address(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Send strictly on <strong>BEP-20 (BNB Smart Chain)</strong> network. Fast, low-fee settlement.</span>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Withdraw Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === 'INR' ? 'e.g. 5000' : 'e.g. 100'}
                className="w-full rounded-xl px-3 py-2 font-mono text-sm focus:outline-none transition-colors border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* Fee & Net Breakdown */}
            <div 
              className="p-2.5 rounded-xl border space-y-1 text-[11px] transition-colors duration-250"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
              }}
            >
              <div className="flex justify-between">
                <span>Network Processing Fee (1%):</span>
                <span className="font-mono" style={{ color: 'var(--app-text-primary)' }}>
                  {currency === 'INR' ? `₹${fee.toFixed(2)}` : `$${fee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <span style={{ color: 'var(--app-text-primary)' }}>Net Credited Amount:</span>
                <span className="font-mono text-teal-600 dark:text-cyan-300 font-bold">
                  {currency === 'INR' ? `₹${netPayout.toFixed(2)}` : `$${netPayout.toFixed(2)} USDT`}
                </span>
              </div>
            </div>

            {/* Security PIN & Biometric Verification */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold flex items-center gap-1" style={{ color: 'var(--app-text-muted)' }}>
                  <Lock className="w-3 h-3 text-teal-500 dark:text-cyan-400" />
                  <span>4-Digit Security PIN</span>
                </label>
                {user.biometricEnabled !== false && (
                  <button
                    type="button"
                    onClick={() => setShowBiometricModal(true)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                      biometricVerified
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                        : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                    }`}
                  >
                    <Fingerprint className="w-3 h-3" />
                    <span>{biometricVerified ? 'Biometric Verified' : 'Use Biometrics'}</span>
                  </button>
                )}
              </div>

              {biometricVerified ? (
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Verified via Biometric Sensor</span>
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
              title="Verify Immediate Payout"
              subtitle="Scan fingerprint or Face ID to authorize withdrawal"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Confirm Immediate Payout</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
