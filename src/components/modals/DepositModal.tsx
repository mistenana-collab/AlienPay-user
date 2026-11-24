import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  CreditCard, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  Upload,
  Clock,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { WalletBalances, Transaction, ActiveScreen, InrDepositConfig } from '../../types';
import { ApiService, DEFAULT_USER } from '../../services/apiService';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: 'INR' | 'USDT';
  exchangeRate: number;
  onDepositSuccess: (transaction: Transaction, newBalances: { inrBalance: number; usdtBalance: number }) => void;
  currentBalances: WalletBalances;
  onNavigate?: (screen: ActiveScreen) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  defaultCurrency = 'INR',
  exchangeRate,
  onDepositSuccess,
  currentBalances,
  onNavigate,
}) => {
  const [currency, setCurrency] = useState<'INR' | 'USDT'>(defaultCurrency);
  const [amount, setAmount] = useState<string>(defaultCurrency === 'INR' ? '40000' : '400');
  const [utrOrTxHash, setUtrOrTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [inrConfig, setInrConfig] = useState<InrDepositConfig>({
    upiId: 'alienpay.business@icici',
    accountHolder: 'AlienPay Corporate Ltd',
    accountNumber: '50200084920192',
    ifscCode: 'ICIC0000104',
    bankName: 'ICICI Bank Ltd',
    branch: 'Bandra Kurla Complex, Mumbai',
  });

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

  const loadUniqueHdWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const data = await ApiService.fetchUserWallet();
      if (data?.depositAddress) {
        setUsdtAddress(data.depositAddress.address);
        setDerivationPath(data.depositAddress.derivationPath || `m/44'/60'/0'/0/${data.depositAddress.derivationIndex}`);
        setQrCodeDataUrl(data.depositAddress.qrCode);
      }
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency);
      setAmount(defaultCurrency === 'INR' ? '40000' : '400');
      setSuccess(false);
      setUtrOrTxHash('');
      loadUniqueHdWallet();
      ApiService.getInrDepositConfig().then((cfg) => {
        if (cfg) setInrConfig(cfg);
      }).catch(() => {});
    }
  }, [isOpen, defaultCurrency]);

  if (!isOpen) return null;

  const inrUpiId = inrConfig.upiId;

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (currency === 'USDT') {
        const res = await ApiService.processDepositAndSweep({ amount: numAmount });
        const refId = res.transaction?.txHash || res.sweepTask?.txHash || ('0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
        const newUsdt = res.walletBalance !== undefined ? res.walletBalance : currentBalances.usdtBalance + numAmount;

        const tx: Transaction = {
          id: res.transaction?.id || ('tx_' + Date.now()),
          type: 'deposit',
          currency: 'USDT',
          amount: numAmount,
          equivalentAmount: numAmount * exchangeRate,
          fee: 0,
          status: 'completed',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: 'BEP-20 Auto-Detect & Hot Wallet Sweep',
          referenceId: refId,
          note: 'Credited + 0.0001 BNB Gas Sent + Swept to Hot Wallet',
        };

        setSuccess(true);
        onDepositSuccess(tx, { inrBalance: currentBalances.inrBalance, usdtBalance: newUsdt });
      } else {
        const refId = utrOrTxHash.trim() || 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
        const tx: Transaction = {
          id: 'tx_' + Date.now(),
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
        setSuccess(true);
        onDepositSuccess(tx, { inrBalance: currentBalances.inrBalance, usdtBalance: currentBalances.usdtBalance });
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Deposit error:', err);
    } finally {
      setIsSubmitting(false);
    }
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
              <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base" style={{ color: 'var(--app-text-primary)' }}>Deposit Funds</h3>
              <p className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Instant credit to AlienPay Wallet</p>
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

        {/* Currency Selector */}
        <div 
          className="grid grid-cols-2 gap-2 my-3.5 p-1 rounded-xl border transition-colors duration-250"
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

        {success ? (
          <div className="py-6 text-center space-y-3">
            {currency === 'INR' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px] mb-2 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Status: Pending UTR Verification
                  </div>
                  <h4 className="font-heading font-bold text-lg" style={{ color: 'var(--app-text-primary)' }}>
                    INR Deposit Submitted!
                  </h4>
                </div>
                <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
                  Your deposit of <span className="font-semibold text-white">₹{parseFloat(amount).toLocaleString('en-IN')}</span> has been recorded. It is currently <span className="font-semibold text-amber-400">PENDING</span> UTR verification and will be credited once verified.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto animate-bounce" />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] mb-2 uppercase tracking-wider">
                    Status: Auto-Detected & Credited
                  </div>
                  <h4 className="font-heading font-bold text-lg" style={{ color: 'var(--app-text-primary)' }}>
                    USDT Deposit Completed!
                  </h4>
                </div>
                <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
                  +${parseFloat(amount).toFixed(2)} USDT has been automatically credited to your wallet balance.
                </p>
              </>
            )}

            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('deposit');
                }}
                className="mt-2 text-xs font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                View in Deposit History →
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {currency === 'USDT' ? (
              <>
                {/* Network: BEP-20 (BNB Smart Chain) Only */}
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
                          Fast confirmation & low gas fees
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Zap className="w-2.5 h-2.5" /> Auto-Detect
                    </span>
                  </div>
                </div>

                {/* QR Code and Unique HD Wallet BEP-20 Address */}
                <div 
                  className="p-3 rounded-xl border border-emerald-500/50 text-center transition-colors duration-250"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                  }}
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
                      <QrCode className="w-28 h-28 text-slate-950" />
                    )}
                  </div>
                  <span className="text-[10px] block mb-1 font-semibold text-emerald-500">
                    Your Unique BEP-20 USDT Deposit Address:
                  </span>
                  <div 
                    className="font-mono text-[11px] p-2.5 rounded-xl break-all select-all border bg-emerald-500/10 text-emerald-500 border-emerald-500 font-bold shadow-sm"
                  >
                    {usdtAddress}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(usdtAddress)}
                    className="mt-2 text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer text-emerald-500 hover:text-emerald-400"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Address' : 'Copy Unique BEP-20 Address'}</span>
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

              </>
            ) : (
              <>
                {/* INR Deposit via UPI & Bank Transfer */}
                <div 
                  className="p-3 rounded-xl border transition-colors duration-250 space-y-2"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  {inrConfig.qrCodeUrl ? (
                    <div className="w-28 h-28 mx-auto bg-white p-1 rounded-xl shadow-md border border-cyan-500/30 flex items-center justify-center">
                      <img
                        src={inrConfig.qrCodeUrl}
                        alt="Official Deposit QR Code"
                        className="w-24 h-24 object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto bg-white p-2 rounded-xl shadow-md flex items-center justify-center">
                      <QrCode className="w-20 h-20 text-slate-950" />
                    </div>
                  )}
                  <span className="text-[10px] block text-center" style={{ color: 'var(--app-text-dim)' }}>Official UPI ID:</span>
                  <div 
                    className="font-mono text-xs font-bold p-2 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500 text-center shadow-sm"
                  >
                    {inrUpiId}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(inrUpiId)}
                    className="text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer text-emerald-400 hover:text-emerald-300"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied UPI ID' : 'Copy UPI ID'}</span>
                  </button>

                  {/* Bank Transfer Details */}
                  <div className="text-[10px] space-y-1 pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)', color: 'var(--app-text-dim)' }}>
                    <div className="flex justify-between">
                      <span>Account Name:</span>
                      <span className="font-semibold" style={{ color: 'var(--app-text-primary)' }}>{inrConfig.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>A/C No:</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--app-text-primary)' }}>{inrConfig.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IFSC Code:</span>
                      <span className="font-mono font-bold text-teal-400">{inrConfig.ifscCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank:</span>
                      <span>{inrConfig.bankName}</span>
                    </div>
                    {inrConfig.branch && (
                      <div className="flex justify-between">
                        <span>Branch:</span>
                        <span>{inrConfig.branch}</span>
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
                    className="w-full rounded-xl px-3 py-2 font-mono text-sm focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-1.5">
                  {['10000', '40000', '80000', '180000'].map((val) => (
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

                {/* UTR / Reference */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>12-Digit UTR / Bank Reference No.</label>
                  <input
                    type="text"
                    required
                    value={utrOrTxHash}
                    onChange={(e) => setUtrOrTxHash(e.target.value)}
                    placeholder="e.g. 408291048291"
                    className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
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
        )}
      </div>
    </div>
  );
};
