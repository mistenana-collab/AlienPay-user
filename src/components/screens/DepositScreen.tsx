import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowDownToLine, 
  CreditCard, 
  Coins, 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ExternalLink,
  Filter,
  AlertCircle,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { WalletBalances, Transaction, ActiveScreen, InrDepositConfig } from '../../types';
import { ApiService, DEFAULT_USER } from '../../services/apiService';

interface DepositScreenProps {
  balances: WalletBalances;
  transactions: Transaction[];
  onNavigate: (screen: ActiveScreen) => void;
  onDepositSuccess: (tx: Transaction, newBals: { inrBalance: number; usdtBalance: number }) => void;
  selectedCurrency?: 'INR' | 'USDT';
}

export const DepositScreen: React.FC<DepositScreenProps> = ({
  balances,
  transactions,
  onNavigate,
  onDepositSuccess,
  selectedCurrency = 'INR',
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USDT'>(selectedCurrency);
  const [balanceCurrency, setBalanceCurrency] = useState<'INR' | 'USDT'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return selectedCurrency || 'INR';
  });
  const [amount, setAmount] = useState<string>(currency === 'INR' ? '40000' : '400');
  const [utrOrTxHash, setUtrOrTxHash] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'INR' | 'USDT'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const exchangeRate = balances.exchangeRateUsdtToInr || 100;
  const totalInr = balances.inrBalance + (balances.usdtBalance * exchangeRate);
  const totalUsdt = balances.usdtBalance + (balances.inrBalance / exchangeRate);

  const handleBalanceCurrencyChange = (cur: 'INR' | 'USDT') => {
    setBalanceCurrency(cur);
    try {
      localStorage.setItem('alienpay_selected_currency', cur);
    } catch {}
  };

  // Strictly BEP-20 (BNB Smart Chain) Unique HD Wallet Address per User (m/44'/60'/0'/0/index)
  const storedUser = ApiService.getStoredUser() || DEFAULT_USER;
  const [usdtAddress, setUsdtAddress] = useState<string>(
    storedUser.depositWallet?.address || storedUser.cryptoDetails?.bep20Address || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
  );
  const [derivationPath, setDerivationPath] = useState<string>(
    storedUser.depositWallet?.derivationPath || "m/44'/60'/0'/0/0"
  );
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(
    storedUser.depositWallet?.qrCode || null
  );
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [lastSweepTask, setLastSweepTask] = useState<any | null>(null);

  const loadUniqueHdWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const data: any = await ApiService.fetchUserWallet();
      if (data?.depositAddress) {
        setUsdtAddress(data.depositAddress.address);
        setDerivationPath(data.depositAddress.derivationPath || `m/44'/60'/0'/0/${data.depositAddress.derivationIndex}`);
        setQrCodeDataUrl(data.depositAddress.qrCode);
      }
      if (data?.sweepTasks && data.sweepTasks.length > 0) {
        setLastSweepTask(data.sweepTasks[0]);
      }
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Official INR Deposit Configuration controlled by Admin
  const [inrConfig, setInrConfig] = useState<InrDepositConfig>({
    upiId: 'alienpay.business@icici',
    accountHolder: 'AlienPay Corporate Ltd',
    accountNumber: '50200084920192',
    ifscCode: 'ICIC0000104',
    bankName: 'ICICI Bank Ltd',
    branch: 'Bandra Kurla Complex, Mumbai',
  });

  useEffect(() => {
    loadUniqueHdWallet();
    ApiService.getInrDepositConfig().then((cfg) => {
      if (cfg) setInrConfig(cfg);
    }).catch(() => {});
  }, []);
  
  const inrUpiId = inrConfig.upiId;
  const inrBankDetails = {
    accountHolder: inrConfig.accountHolder,
    accountNumber: inrConfig.accountNumber,
    ifscCode: inrConfig.ifscCode,
    bankName: inrConfig.bankName,
    branch: inrConfig.branch || '',
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (currency === 'USDT') {
        const res = await ApiService.processDepositAndSweep({ amount: numAmount });
        const refId = res.transaction?.txHash || res.sweepTask?.txHash || ('0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
        const newUsdt = res.walletBalance !== undefined ? res.walletBalance : balances.usdtBalance + numAmount;

        if (res.sweepTask) {
          setLastSweepTask(res.sweepTask);
        }

        const tx: Transaction = {
          id: res.transaction?.id || ('tx_dep_' + Date.now()),
          type: 'deposit',
          currency: 'USDT',
          amount: numAmount,
          equivalentAmount: numAmount * exchangeRate,
          fee: 0,
          status: 'completed',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'BEP-20 Auto-Detect & Hot Wallet Sweep',
          referenceId: refId,
          note: `Credited + 0.0001 BNB Gas Sent + Swept to Hot Wallet (${res.sweepTask?.sweepTxHash?.slice(0, 10) || 'Done'}...)`,
        };

        onDepositSuccess(tx, { inrBalance: balances.inrBalance, usdtBalance: newUsdt });
        setActionNotice(
          `USDT Deposit of $${numAmount.toFixed(2)} USDT credited to PostgreSQL! 0.0001 BNB gas sent & funds swept from ${usdtAddress.slice(0, 8)}... to Hot Wallet.`
        );
      } else {
        const refId = utrOrTxHash.trim() || 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
        const tx: Transaction = {
          id: 'tx_dep_' + Date.now(),
          type: 'deposit',
          currency: 'INR',
          amount: numAmount,
          equivalentAmount: numAmount / exchangeRate,
          fee: 0,
          status: 'pending',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'UPI / IMPS Manual Transfer',
          referenceId: refId,
          note: 'Pending UTR verification',
        };
        onDepositSuccess(tx, { inrBalance: balances.inrBalance, usdtBalance: balances.usdtBalance });
        setUtrOrTxHash('');
        setActionNotice(`INR Deposit of ₹${numAmount.toLocaleString('en-IN')} submitted! Status: PENDING UTR verification.`);
      }
      setTimeout(() => setActionNotice(null), 7000);
    } catch (err: any) {
      setActionNotice(err.message || 'Deposit processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter deposit transactions
  const depositTransactions = transactions.filter((t) => t.type === 'deposit');
  const filteredDeposits = depositTransactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
    return true;
  });

  const pendingCount = depositTransactions.filter((t) => t.status === 'pending').length;
  const completedCount = depositTransactions.filter((t) => t.status === 'completed').length;

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
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Deposit Funds & History
          </h1>
        </div>

        <div className="w-16" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{actionNotice}</div>
          </div>
        )}

        {/* Unified Balance Overview Card (Single Box with Currency Switcher: INR | USDT) */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            background: 'linear-gradient(to bottom, var(--app-surface-elevated), var(--app-surface))',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-primary)',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>Wallet Balance</span>
            
            {/* 2 Currency Options Switcher */}
            <div 
              className="flex items-center p-0.5 rounded-lg border text-[11px]"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => handleBalanceCurrencyChange('INR')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  balanceCurrency === 'INR'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: balanceCurrency === 'INR' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                INR
              </button>
              <button
                type="button"
                onClick={() => handleBalanceCurrencyChange('USDT')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  balanceCurrency === 'USDT'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  color: balanceCurrency === 'USDT' ? '#021312' : 'var(--app-text-muted)',
                }}
              >
                USDT
              </button>
            </div>
          </div>

          {/* Single Box Unified Balance Display */}
          <div 
            className="p-3.5 rounded-xl border transition-all"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-heading font-black text-2xl tracking-tight tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {balanceCurrency === 'INR' ? (
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
                {balanceCurrency}
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
                {balanceCurrency === 'INR' ? (
                  <>≈ ${totalUsdt.toFixed(2)} USDT</>
                ) : (
                  <>≈ ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</>
                )}
              </span>
              <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                1 USDT = ₹{exchangeRate.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Deposit Form Card */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <h2 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
              Make a Deposit
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold">
              Instant Queue
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
              onClick={() => { setCurrency('INR'); setAmount('40000'); }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                currency === 'INR'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>INR (UPI / Bank)</span>
            </button>

            <button
              type="button"
              onClick={() => { setCurrency('USDT'); setAmount('400'); }}
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

          <form onSubmit={handleSubmitDeposit} className="space-y-3.5 text-xs">
            {currency === 'INR' ? (
              <>
                {/* INR Info Box */}
                <div 
                  className="p-3 rounded-xl border transition-colors duration-250 space-y-2.5"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  {/* Official QR Code if uploaded by admin */}
                  {inrConfig.qrCodeUrl ? (
                    <div className="text-center space-y-1 pb-1">
                      <div className="w-32 h-32 mx-auto bg-white p-1.5 rounded-2xl shadow-md border border-cyan-500/40 flex items-center justify-center">
                        <img
                          src={inrConfig.qrCodeUrl}
                          alt="Official UPI QR Code"
                          className="w-28 h-28 object-contain rounded-xl"
                        />
                      </div>
                      <span className="text-[9.5px] font-semibold text-cyan-400 block">
                        Scan with GPay, PhonePe, Paytm, or any UPI App
                      </span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1 pb-1">
                      <div className="w-24 h-24 mx-auto bg-white p-2 rounded-xl shadow-md flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-slate-950" />
                      </div>
                      <span className="text-[9.5px] font-semibold text-emerald-400 block">
                        Scan to Pay via UPI
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--app-text-primary)' }}>Official UPI ID</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inrUpiId, 'upi')}
                      className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      {copied === 'upi' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied === 'upi' ? 'Copied' : 'Copy UPI ID'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold p-2.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500 shadow-sm">
                    {inrUpiId}
                  </div>

                  {/* Bank Transfer Details toggle/view */}
                  <div className="text-[10px] space-y-1 pt-1 border-t" style={{ borderColor: 'var(--app-border-subtle)', color: 'var(--app-text-dim)' }}>
                    <div className="flex justify-between">
                      <span>Account Name:</span>
                      <span className="font-semibold" style={{ color: 'var(--app-text-primary)' }}>{inrBankDetails.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>A/C No:</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--app-text-primary)' }}>{inrBankDetails.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IFSC Code:</span>
                      <span className="font-mono font-bold text-teal-400">{inrBankDetails.ifscCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank:</span>
                      <span>{inrBankDetails.bankName}</span>
                    </div>
                    {inrBankDetails.branch && (
                      <div className="flex justify-between">
                        <span>Branch:</span>
                        <span>{inrBankDetails.branch}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>Deposit Amount (₹ INR)</label>
                    <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Min: ₹500</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 40000"
                    className="w-full rounded-xl px-3 py-2.5 font-mono text-sm focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                  {/* Quick amount chips */}
                  <div className="flex gap-1.5 mt-2">
                    {['10000', '40000', '80000', '180000', '500000'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className="flex-1 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors"
                        style={{
                          backgroundColor: 'var(--app-surface-subtle)',
                          borderColor: 'var(--app-border-subtle)',
                          color: 'var(--app-text-secondary)',
                        }}
                      >
                        ₹{parseInt(val) >= 100000 ? `${parseInt(val)/100000}L` : `${parseInt(val)/1000}k`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UTR / Reference */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    12-Digit UTR / Bank Reference Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={utrOrTxHash}
                    onChange={(e) => setUtrOrTxHash(e.target.value)}
                    placeholder="e.g. 408291048291"
                    className="w-full rounded-xl px-3 py-2.5 font-mono text-xs focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Verification Notice:</strong> INR Deposits enter <span className="underline font-bold">Pending status</span> upon submission while your 12-digit UTR reference is verified.
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* USDT form */}
                {/* Accepted Blockchain Network: BEP-20 Only */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>Accepted Blockchain Network</label>
                  <div 
                    className="p-2.5 rounded-xl border border-emerald-500 bg-emerald-500/10 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <div>
                        <span className="font-heading font-extrabold text-xs block text-emerald-400">
                          BEP-20 (BNB Smart Chain)
                        </span>
                        <span className="text-[9.5px]" style={{ color: 'var(--app-text-dim)' }}>
                          Ultra-fast block confirmations & low network fees
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Zap className="w-2.5 h-2.5" /> Auto-Detect
                    </span>
                  </div>
                </div>

                {/* USDT QR & Unique HD Wallet BEP-20 Address */}
                <div 
                  className="p-3 rounded-xl border border-emerald-500/50 text-center transition-colors duration-250"
                  style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                >
                  <div className="flex items-center justify-end mb-2">
                    <button
                      type="button"
                      onClick={loadUniqueHdWallet}
                      disabled={isLoadingWallet}
                      className="text-[10px] font-semibold flex items-center gap-1 text-emerald-500 hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingWallet ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl shadow-md mb-2 flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Unique BEP-20 Deposit QR Code"
                        className="w-28 h-28 object-contain rounded"
                      />
                    ) : (
                      <QrCode className="w-24 h-24 text-slate-950" />
                    )}
                  </div>
                  <span className="text-[10px] block mb-1 font-semibold text-emerald-500">
                    Your Unique BEP-20 USDT Deposit Address:
                  </span>
                  <div className="font-mono text-[11px] p-2.5 rounded-xl break-all select-all border bg-emerald-500/10 text-emerald-500 border-emerald-500 font-bold shadow-sm">
                    {usdtAddress}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(usdtAddress, 'usdt')}
                    className="mt-2 text-xs font-bold flex items-center justify-center gap-1 mx-auto text-emerald-500 cursor-pointer hover:underline"
                  >
                    {copied === 'usdt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'usdt' ? 'Address Copied' : 'Copy Unique BEP-20 Address'}</span>
                  </button>
                </div>

                {/* Auto-Detect Blockchain Instant Credit Instruction */}
                <div 
                  className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[11px] leading-relaxed flex items-start gap-2.5"
                  style={{ color: 'var(--app-text-secondary)' }}
                >
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-400 block font-bold text-xs">
                      Auto-Detect Blockchain · Instant Credit
                    </strong>
                    <span>
                      Simply transfer USDT (BEP-20) to your unique deposit address above. The blockchain scanner automatically detects incoming transfers and credits your wallet balance instantly.
                    </span>
                  </div>
                </div>

                {lastSweepTask && (
                  <div
                    className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-[10px] space-y-1.5"
                    style={{ color: 'var(--app-text-secondary)' }}
                  >
                    <div className="flex items-center justify-between font-bold text-cyan-400">
                      <span>Latest BEP-20 Sweep Pipeline</span>
                      <span className="uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">
                        {lastSweepTask.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span>Amount Swept:</span>
                      <span className="font-bold">${Number(lastSweepTask.amount).toFixed(2)} USDT</span>
                    </div>
                    {lastSweepTask.gasTxHash && (
                      <div className="flex items-center justify-between font-mono">
                        <span>BNB Gas TX (0.0001 BNB):</span>
                        <span className="text-emerald-400">{lastSweepTask.gasTxHash.slice(0, 10)}...{lastSweepTask.gasTxHash.slice(-6)}</span>
                      </div>
                    )}
                    {lastSweepTask.sweepTxHash && (
                      <div className="flex items-center justify-between font-mono">
                        <span>Hot Wallet Sweep TX:</span>
                        <span className="text-cyan-400">{lastSweepTask.sweepTxHash.slice(0, 10)}...{lastSweepTask.sweepTxHash.slice(-6)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {currency === 'INR' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Submit INR Deposit (Pending Review)</span>
                )}
              </button>
            )}
          </form>
        </div>

        {/* Deposit Transaction History Header & Section */}
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
                Deposit Transaction History
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {depositTransactions.length}
              </span>
            </div>

            {pendingCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {pendingCount} Pending
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
          {filteredDeposits.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--app-text-dim)' }}>
              <ArrowDownToLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No deposit transactions found</p>
              <p className="text-[10px] mt-1">Submit a deposit above to view records here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDeposits.map((tx) => {
                const isPending = tx.status === 'pending';
                const isCompleted = tx.status === 'completed';
                const isRejected = tx.status === 'rejected';

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border transition-all hover:border-cyan-500/40 relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-xs'
                            : isPending
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                            : 'bg-red-500/15 border border-red-500/40 text-red-400'
                        }`}>
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`font-heading font-extrabold text-sm ${isCompleted ? 'text-emerald-400' : 'text-slate-100'}`}>
                            +{tx.currency === 'INR' ? `₹${tx.amount.toLocaleString('en-IN')}` : `$${tx.amount.toFixed(2)} USDT`}
                          </span>
                          <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>
                            {tx.method}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isPending && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          <Clock className="w-3 h-3 animate-spin text-amber-400" />
                          <span>Pending Approval</span>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-[10px] font-bold shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Completed</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </div>
                      )}
                    </div>

                    {/* Details row */}
                    <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-1 text-[11px]" style={{ borderColor: 'var(--app-border-subtle)' }}>
                      <div className="flex items-center gap-1 text-slate-400 font-mono">
                        <span className="text-[10px] opacity-70">Ref:</span>
                        <span className="text-cyan-300 font-bold">{tx.referenceId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tx.referenceId, tx.id)}
                          className="opacity-70 hover:opacity-100 cursor-pointer ml-1"
                        >
                          {copied === tx.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400">{tx.timestamp}</span>
                    </div>

                    {/* Remark or note */}
                    {(tx.note || tx.adminRemark) && (
                      <div className="mt-1.5 text-[10px] px-2 py-1 rounded bg-black/20 text-slate-400 flex items-center justify-between">
                        <span>{tx.adminRemark || tx.note}</span>
                      </div>
                    )}
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
