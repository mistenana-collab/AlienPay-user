import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User, 
  CreditCard, 
  Check, 
  AlertCircle, 
  ShieldCheck,
  ChevronDown,
  Briefcase,
  Users,
  Globe,
  Calendar,
  Lock,
  FileText,
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { SavedBankAccount } from '../../types';

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAccount: (account: SavedBankAccount) => void;
  defaultHolderName?: string;
}

type DocumentSlotKey =
  | 'aadhaarFront'
  | 'aadhaarBack'
  | 'panCard'
  | 'atmFront'
  | 'atmBack'
  | 'chequeBook';

interface DocumentSlotMeta {
  key: DocumentSlotKey;
  title: string;
  subtitle: string;
  badge: string;
}

const DOCUMENT_SLOTS: DocumentSlotMeta[] = [
  {
    key: 'aadhaarFront',
    title: 'Aadhaar Card (Front Side)',
    subtitle: 'Clear photo showing Name & Aadhaar number',
    badge: 'Front Side',
  },
  {
    key: 'aadhaarBack',
    title: 'Aadhaar Card (Back Side)',
    subtitle: 'Clear photo showing Address & QR code',
    badge: 'Back Side',
  },
  {
    key: 'panCard',
    title: 'PAN Card Photo',
    subtitle: 'Front side showing PAN number & signature',
    badge: 'PAN Card',
  },
  {
    key: 'atmFront',
    title: 'ATM / Debit Card (Front Side)',
    subtitle: 'Front photo showing card number & expiry',
    badge: 'Front Side',
  },
  {
    key: 'atmBack',
    title: 'ATM / Debit Card (Back Side)',
    subtitle: 'Back photo showing magnetic strip & CVV',
    badge: 'Back Side',
  },
  {
    key: 'chequeBook',
    title: 'Cheque Book Photo',
    subtitle: 'Cancelled cheque or passbook front page',
    badge: 'Cheque Leaf',
  },
];

const POPULAR_BANKS = [
  'Bandhan Bank',
  'HDFC Bank Ltd',
  'State Bank of India (SBI)',
  'ICICI Bank',
  'Jio Payment Bank',
  'Punjab National Bank (PNB)',
  'Kotak Mahindra Bank',
  'Canara Bank',
  'Bank of India (BOI)',
  'Indian Overseas Bank (IOB)',
  'IDFC FIRST Bank',
  'Axis Bank',
  'Bank of Baroda',
  'IndusInd Bank',
  'Union Bank of India',
  'Yes Bank',
  'Federal Bank',
];

export const AddBankAccountModal: React.FC<AddBankAccountModalProps> = ({
  isOpen,
  onClose,
  onSaveAccount,
  defaultHolderName = '',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [holderName, setHolderName] = useState(defaultHolderName || 'Rohit Sharma');
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [customBank, setCustomBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current' | 'Corporate'>('Savings');
  const [fundType, setFundType] = useState<'gaming' | 'stock'>('gaming');
  const [branchName, setBranchName] = useState('');
  const [corporateId, setCorporateId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [netBankingLoginDetails, setNetBankingLoginDetails] = useState('');
  const [atmCardNumber, setAtmCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local-only preview URLs for KYC & card documents (not persisted to database)
  const [docPreviews, setDocPreviews] = useState<
    Partial<Record<DocumentSlotKey, { url: string; name: string }>>
  >({});

  // Revoke object URLs on unmount to keep memory clean
  useEffect(() => {
    return () => {
      Object.values(docPreviews).forEach((item) => {
        if (item?.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, []);

  const handleSelectDocumentPhoto = (
    slotKey: DocumentSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setDocPreviews((prev) => {
      if (prev[slotKey]?.url) {
        URL.revokeObjectURL(prev[slotKey]!.url);
      }
      return {
        ...prev,
        [slotKey]: {
          url: previewUrl,
          name: file.name,
        },
      };
    });
    e.target.value = '';
  };

  const handleRemoveDocumentPhoto = (slotKey: DocumentSlotKey) => {
    setDocPreviews((prev) => {
      if (prev[slotKey]?.url) {
        URL.revokeObjectURL(prev[slotKey]!.url);
      }
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const validateBankDetailsStep = (): boolean => {
    setErrorMsg(null);

    const selectedBank = bankName === 'Other' ? customBank.trim() : bankName;
    if (!selectedBank) {
      setErrorMsg('Please specify the Bank Name.');
      return false;
    }

    if (!accountNumber || accountNumber.length < 9) {
      setErrorMsg('Please enter a valid Account Number (9 to 18 digits).');
      return false;
    }

    if (!accountNumber !== !confirmAccountNumber && accountNumber !== confirmAccountNumber) {
      setErrorMsg('Account Numbers do not match. Please verify.');
      return false;
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      setErrorMsg('IFSC Code must be exactly 11 characters (e.g. HDFC0000128).');
      return false;
    }

    return true;
  };

  const handleContinueToDocuments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBankDetailsStep()) return;
    setActiveTab('documents');
  };

  const handleFinalSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBankDetailsStep()) {
      setActiveTab('details');
      return;
    }

    const selectedBank = bankName === 'Other' ? customBank.trim() : bankName;
    const cleanIfsc = ifscCode.trim().toUpperCase();

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const gamingRate = accountType === 'Corporate' ? 4 : accountType === 'Current' ? 3 : 5;
      const stockRate = accountType === 'Corporate' ? 6 : accountType === 'Current' ? 5 : 10;
      const chosenRate = fundType === 'stock' ? stockRate : gamingRate;

      // Save account details without storing document photos in the database
      const newAccount: SavedBankAccount = {
        id: 'bank_' + Date.now(),
        accountHolderName: holderName.trim(),
        bankName: selectedBank,
        accountNumber: accountNumber.trim(),
        ifscCode: cleanIfsc,
        accountType,
        fundType,
        branchName: branchName.trim() || undefined,
        corporateId: corporateId.trim() || undefined,
        groupId: groupId.trim() || undefined,
        domainId: domainId.trim() || undefined,
        netBankingLoginDetails: netBankingLoginDetails.trim()
          ? netBankingLoginDetails.trim().slice(0, 1000)
          : undefined,
        atmCardNumber: atmCardNumber.trim() || undefined,
        cvv: cvv.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        addedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        runningCommissionRate: chosenRate,
        gamingCommissionRate: gamingRate,
        stockCommissionRate: stockRate,
        runningVolumeProcessed: 0,
        accumulatedCommission: 0,
        maxVolumeLimit:
          accountType === 'Corporate' && fundType === 'stock'
            ? 9907184
            : accountType === 'Corporate'
            ? 40000000
            : accountType === 'Current'
            ? 7400000
            : 1000000,
        isRunning: false,
      };

      onSaveAccount(newAccount);
      onClose();
    }, 600);
  };

  const uploadedDocsCount = Object.keys(docPreviews).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
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
        <div 
          className="flex items-center justify-between pb-3 border-b sticky top-0 backdrop-blur-sm z-10"
          style={{
            backgroundColor: 'var(--app-header-bg)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 text-slate-950 flex items-center justify-center">
              <Building2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base" style={{ color: 'var(--app-text-primary)' }}>
                {activeTab === 'details' ? 'Add Bank Account' : 'Upload KYC & Bank Proof'}
              </h3>
              <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                {activeTab === 'details'
                  ? 'Step 1 of 2 · Bank & NetBanking Details'
                  : 'Step 2 of 2 · Upload Aadhaar, PAN, ATM & Cheque'}
              </p>
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

        {/* 2-Step Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 mt-3 p-1 rounded-xl border" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'details'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px]">1</span>
            <span>Bank Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateBankDetailsStep()) {
                setActiveTab('documents');
              }
            }}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px]">2</span>
            <span>Document Upload ({uploadedDocsCount}/6)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-600 dark:text-red-200 p-2.5 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {activeTab === 'details' ? (
          /* STEP 1: Bank & NetBanking Form */
          <form onSubmit={handleContinueToDocuments} className="space-y-3 pt-3 text-xs">
            {/* Account Holder Name */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Account Holder Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Full Name as on Bank Passbook"
                  className="w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors font-medium border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>
            </div>

            {/* Bank Name Selector */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Select Bank
              </label>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none appearance-none font-medium cursor-pointer transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b} style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text-primary)' }}>{b}</option>
                  ))}
                  <option value="Other" style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text-primary)' }}>Other Bank...</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {bankName === 'Other' && (
                <input
                  type="text"
                  required
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  placeholder="Enter bank name"
                  className="mt-2 w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-medium transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Bank Account Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 9 to 18 digit account number"
                  className="w-full rounded-xl pl-9 pr-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Confirm Account Number
              </label>
              <input
                type="text"
                required
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter bank account number"
                className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* IFSC Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>IFSC Code</label>
                <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>11 characters</span>
              </div>
              <input
                type="text"
                required
                maxLength={11}
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0000128"
                className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none font-bold uppercase tracking-wider transition-colors border text-teal-600 dark:text-cyan-300"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                }}
              />
            </div>

            {/* Account Type (Savings / Current / Corporate) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                  Account Type & Running Commission
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">Gaming & Stock Fund</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('Savings')}
                  className={`py-2 px-2 rounded-xl border text-center cursor-pointer transition-all ${
                    accountType === 'Savings'
                      ? 'border-cyan-400 font-bold ring-1 ring-cyan-400/40'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  style={{
                    backgroundColor: accountType === 'Savings' ? 'var(--app-surface-highlight)' : 'var(--app-surface-subtle)',
                    borderColor: accountType === 'Savings' ? 'var(--app-border-strong)' : 'var(--app-border-subtle)',
                    color: accountType === 'Savings' ? 'var(--app-text-secondary)' : undefined,
                  }}
                >
                  <div className="text-[11px] font-bold">Savings</div>
                  <div className="text-[8.5px] font-mono text-emerald-500 font-bold mt-0.5">🎮 5% · 📈 10%</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('Current')}
                  className={`py-2 px-2 rounded-xl border text-center cursor-pointer transition-all ${
                    accountType === 'Current'
                      ? 'border-cyan-400 font-bold ring-1 ring-cyan-400/40'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  style={{
                    backgroundColor: accountType === 'Current' ? 'var(--app-surface-highlight)' : 'var(--app-surface-subtle)',
                    borderColor: accountType === 'Current' ? 'var(--app-border-strong)' : 'var(--app-border-subtle)',
                    color: accountType === 'Current' ? 'var(--app-text-secondary)' : undefined,
                  }}
                >
                  <div className="text-[11px] font-bold">Current</div>
                  <div className="text-[8.5px] font-mono text-cyan-500 font-bold mt-0.5">🎮 3% · 📈 5%</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('Corporate')}
                  className={`py-2 px-2 rounded-xl border text-center cursor-pointer transition-all ${
                    accountType === 'Corporate'
                      ? 'border-purple-400 font-bold ring-1 ring-purple-400/40'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  style={{
                    backgroundColor: accountType === 'Corporate' ? 'var(--app-surface-highlight)' : 'var(--app-surface-subtle)',
                    borderColor: accountType === 'Corporate' ? 'var(--app-border-strong)' : 'var(--app-border-subtle)',
                    color: accountType === 'Corporate' ? 'var(--app-text-secondary)' : undefined,
                  }}
                >
                  <div className="text-[11px] font-bold">Corporate</div>
                  <div className="text-[8.5px] font-mono text-purple-400 font-bold mt-0.5">🎮 4% · 📈 6%</div>
                </button>
              </div>
            </div>

            {/* Running Commission Fund Choice: Gaming vs Stock */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-xs" style={{ color: 'var(--app-text-muted)' }}>
                  Select Running Commission Fund <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-teal-500 dark:text-cyan-400 font-bold">
                  Pick 1 for this Account
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFundType('gaming')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    fundType === 'gaming'
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-400 font-bold ring-1 ring-cyan-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border-[var(--app-border-subtle)] bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                    🎮
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">Gaming Fund</div>
                    <div className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
                      {accountType === 'Corporate' ? '4%' : accountType === 'Current' ? '3%' : '5%'} Commission
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFundType('stock')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    fundType === 'stock'
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-400 font-bold ring-1 ring-emerald-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border-[var(--app-border-subtle)] bg-[var(--app-surface-subtle)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                    📈
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">Stock Fund</div>
                    <div className="text-[10px] font-mono text-emerald-300 font-bold mt-0.5">
                      {accountType === 'Corporate' ? '6%' : accountType === 'Current' ? '5%' : '10%'} Commission
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Optional Branch Name */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Branch Name (Optional)
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Connaught Place Branch"
                className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* NetBanking Login Details (Up to 1000 Characters) */}
            <div
              className="p-3 rounded-2xl border space-y-2 transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--app-text-primary)' }}>
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>NetBanking Login Details</span>
                </div>
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: netBankingLoginDetails.length >= 950 ? '#f59e0b' : 'var(--app-text-dim)' }}
                >
                  {netBankingLoginDetails.length} / 1000
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={1000}
                value={netBankingLoginDetails}
                onChange={(e) => setNetBankingLoginDetails(e.target.value.slice(0, 1000))}
                placeholder="Enter NetBanking Login ID, Password, Transaction Password, Customer ID, or additional login instructions (up to 1000 characters)..."
                className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border resize-y"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* Corporate, Group & Domain Identification (Optional) */}
            <div 
              className="p-3 rounded-2xl border space-y-2.5 transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--app-text-primary)' }}>
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>Corporate & Domain Details (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Corporate ID */}
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Corporate ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      value={corporateId}
                      onChange={(e) => setCorporateId(e.target.value)}
                      placeholder="CORP-ID"
                      className="w-full rounded-xl pl-7 pr-2 py-1.5 text-xs font-mono uppercase focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>

                {/* Group ID */}
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Group ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Users className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      placeholder="GRP-01"
                      className="w-full rounded-xl pl-7 pr-2 py-1.5 text-xs font-mono uppercase focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>

                {/* Domain ID */}
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Domain ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      value={domainId}
                      onChange={(e) => setDomainId(e.target.value)}
                      placeholder="DOM-88"
                      className="w-full rounded-xl pl-7 pr-2 py-1.5 text-xs font-mono uppercase focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ATM / Debit Card Details (Optional) */}
            <div 
              className="p-3 rounded-2xl border space-y-2.5 transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: 'var(--app-text-primary)' }}>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ATM / Debit Card Details (Optional)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Optional
                </span>
              </div>

              {/* ATM Card Number */}
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  ATM Card Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    maxLength={19}
                    value={atmCardNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                      setAtmCardNumber(formatted);
                    }}
                    placeholder="•••• •••• •••• •••• (16 digits)"
                    className="w-full rounded-xl pl-8 pr-3 py-2 text-xs font-mono focus:outline-none transition-colors border tracking-wider"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>

              {/* Date of Expiry & CVV */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Date of Expiry
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      maxLength={5}
                      value={expiryDate}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        if (val.length >= 3) {
                          val = val.slice(0, 2) + '/' + val.slice(2);
                        }
                        setExpiryDate(val);
                      }}
                      placeholder="MM/YY"
                      className="w-full rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-center focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    CVV / CVC
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3 h-3" />
                    </div>
                    <input
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      className="w-full rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-center tracking-widest focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div 
              className="p-2 rounded-xl border flex items-center gap-2 text-[10px] transition-colors duration-250"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Bank details are verified through Penny Drop & encrypted via 256-bit SSL</span>
            </div>

            {/* Next Step Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Save & Next: Upload Documents</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        ) : (
          /* STEP 2: Document Photo Uploads with Live Previews */
          <form onSubmit={handleFinalSaveAccount} className="space-y-3 pt-3 text-xs">
            <div
              className="p-2.5 rounded-xl border flex items-start gap-2 text-[11px]"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-muted)',
              }}
            >
              <FileText className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold" style={{ color: 'var(--app-text-primary)' }}>
                  Upload KYC & Bank Verification Photos
                </div>
                <div className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                  Select photos below to preview your Aadhaar Card (both sides), PAN Card, ATM Card (both sides), and Cheque Book before saving.
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {DOCUMENT_SLOTS.map((slot) => {
                const preview = docPreviews[slot.key];
                return (
                  <div
                    key={slot.key}
                    className="p-3 rounded-2xl border transition-all"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: preview ? 'rgba(16, 185, 129, 0.5)' : 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                            {slot.title}
                          </span>
                          {preview && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Ready
                            </span>
                          )}
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                          {slot.subtitle}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                        {slot.badge}
                      </span>
                    </div>

                    {preview ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-black/40 h-32 flex items-center justify-center">
                          <img
                            src={preview.url}
                            alt={slot.title}
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveDocumentPhoto(slot.key)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white shadow-md cursor-pointer transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                          <span className="truncate max-w-[190px] font-mono">{preview.name}</span>
                          <label className="text-cyan-400 hover:underline font-semibold cursor-pointer">
                            Change Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSelectDocumentPhoto(slot.key, e)}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border border-dashed cursor-pointer hover:border-cyan-400/60 transition-colors"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--app-text-primary)' }}>
                          Tap to Upload {slot.title}
                        </div>
                        <div className="text-[9.5px] flex items-center gap-1" style={{ color: 'var(--app-text-dim)' }}>
                          <ImageIcon className="w-3 h-3" /> JPG, PNG or Camera Photo · Live Preview
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSelectDocumentPhoto(slot.key, e)}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="col-span-1 py-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-primary)',
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save Bank Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
