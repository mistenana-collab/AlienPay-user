import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Smartphone,
  ArrowRight,
  Calculator,
  Copy,
  Check,
  X,
} from 'lucide-react';

interface AlienPayLandingPageProps {
  onOpenWebApp?: (initialScreen?: 'login' | 'signup') => void;
  apkDownloadUrl?: string;
  liveAppUrl?: string;
}

type AccountCategory = 'Savings' | 'Current' | 'Corporate';

interface AccountRateSpec {
  type: AccountCategory;
  index: string;
  title: string;
  gamingRate: number;
  stockRate: number;
  volumeLimitLabel: string;
  maxVolumeInr: number;
  defaultCalcVolume: number;
  vipTier: string;
  vipDeposit: string;
  description: string;
}

const ACCOUNT_SPECS: Record<AccountCategory, AccountRateSpec> = {
  Savings: {
    type: 'Savings',
    index: '01',
    title: 'Savings Bank Account',
    gamingRate: 5,
    stockRate: 10,
    volumeLimitLabel: 'Up to ₹10,00,000 Volume',
    maxVolumeInr: 1000000,
    defaultCalcVolume: 200000,
    vipTier: 'Silver VIP',
    vipDeposit: '400 USDT / ₹40,000',
    description:
      'Supports all Indian individual Savings bank accounts for automated OTP work with full volume access on Gaming Fund (5%) and Stock Fund (10%).',
  },
  Current: {
    type: 'Current',
    index: '02',
    title: 'Current Bank Account',
    gamingRate: 3,
    stockRate: 5,
    volumeLimitLabel: 'Up to ₹50,00,000 Volume',
    maxVolumeInr: 5000000,
    defaultCalcVolume: 1000000,
    vipTier: 'Gold Pro VIP',
    vipDeposit: '800 USDT / ₹80,000',
    description:
      'Supports all commercial and proprietorship Current accounts for high-limit OTP work and instant settlement across Gaming Fund (3%) and Stock Fund (5%).',
  },
  Corporate: {
    type: 'Corporate',
    index: '03',
    title: 'Corporate Bank Account',
    gamingRate: 4,
    stockRate: 6,
    volumeLimitLabel: 'Up to ₹5,00,00,000 (5 Crore) Volume',
    maxVolumeInr: 50000000,
    defaultCalcVolume: 5000000,
    vipTier: 'Diamond Elite VIP',
    vipDeposit: '1,800 USDT / ₹1,80,000',
    description:
      'Designed for enterprise and corporate M2M accounts handling high-volume RTGS/IMPS OTP work with 4% Gaming Fund and 6% Stock Fund instant commission.',
  },
};

const EXCHANGE_RATE = 100; // 1 USDT = ₹100

export const AlienPayLandingPage: React.FC<AlienPayLandingPageProps> = ({
  apkDownloadUrl = '/AlienPay.apk',
  liveAppUrl = 'https://www.alienpay.in',
}) => {
  const [calcAccountType, setCalcAccountType] = useState<AccountCategory>('Savings');
  const [calcVolume, setCalcVolume] = useState<number>(200000);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedRefCode, setCopiedRefCode] = useState<boolean>(false);
  const [invitedReferralCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('code');
    if (ref && ref.trim()) {
      const cleanRef = ref.trim();
      try {
        localStorage.setItem('alienpay_invited_referral_code', cleanRef);
      } catch {
        // ignore
      }
      return cleanRef;
    }
    return null;
  });

  const resolvedDownloadUrl = apkDownloadUrl.startsWith('http')
    ? apkDownloadUrl
    : `${typeof window !== 'undefined' ? window.location.origin : liveAppUrl}${apkDownloadUrl}`;

  useEffect(() => {
    QRCode.toDataURL(resolvedDownloadUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [resolvedDownloadUrl]);

  const activeSpec = ACCOUNT_SPECS[calcAccountType];
  const gamingCommissionInr = Math.round((calcVolume * activeSpec.gamingRate) / 100);
  const stockCommissionInr = Math.round((calcVolume * activeSpec.stockRate) / 100);

  const handleSelectAccountType = (type: AccountCategory) => {
    setCalcAccountType(type);
    setCalcVolume(ACCOUNT_SPECS[type].defaultCalcVolume);
  };

  const handleCopyRefCode = () => {
    if (!invitedReferralCode) return;
    navigator.clipboard.writeText(invitedReferralCode).then(() => {
      setCopiedRefCode(true);
      setTimeout(() => setCopiedRefCode(false), 2000);
    });
  };

  const handleDownloadApk = () => {
    if (invitedReferralCode) {
      navigator.clipboard.writeText(invitedReferralCode).catch(() => {});
    }
    setIsApkModalOpen(true);
    const link = document.createElement('a');
    link.href = apkDownloadUrl;
    link.setAttribute('download', 'AlienPay.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDownloadLink = () => {
    navigator.clipboard.writeText(resolvedDownloadUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const formatInr = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-sky-600 selection:text-white">
      {/* =====================================================================
          TOP BAR CONTRACT (3 Zones: Brand Wordmark — 4 Nav Links — 1 Primary Action)
      ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-xl font-bold tracking-tight text-slate-900 font-['Outfit',sans-serif] whitespace-nowrap shrink-0"
          >
            AlienPay
          </a>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#features"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              APK Features
            </a>
            <a
              href="#accounts"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Bank Accounts
            </a>
            <a
              href="#calculator"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Commission Calculator
            </a>
            <a
              href="#vip-plans"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              VIP Plans
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadApk}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Android APK</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="max-w-[1200px] mx-auto px-6">
        {/* =====================================================================
            HERO SECTION
        ===================================================================== */}
        <section className="pt-12 pb-16 md:pt-20 md:pb-20 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Core AlienPay Proposition */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-5">
                  <span className="text-sky-700 font-semibold">www.alienpay.in Official Android Application</span>
                  <span aria-hidden="true">·</span>
                  <span>Savings, Current & Corporate OTP Work</span>
                </div>

                <h1
                  className="font-['Outfit',sans-serif] font-bold tracking-tight text-slate-900 leading-[1.12] mb-6"
                  style={{
                    fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)',
                    textWrap: 'balance',
                  }}
                >
                  Run Your Bank Account for OTP Work & Earn Up to 10% Instant Commission
                </h1>

                <p className="text-base text-slate-600 leading-relaxed max-w-[64ch] mb-8">
                  AlienPay accepts all Indian <strong className="text-slate-900 font-semibold">Savings, Current, and Corporate bank accounts</strong> for automated OTP work. Choose between <strong className="text-slate-900 font-semibold">Gaming Fund</strong> and <strong className="text-slate-900 font-semibold">Stock Fund</strong> volume routing, earn up to <strong className="text-slate-900 font-semibold">10% account running commission</strong> plus a <strong className="text-slate-900 font-semibold">10% direct referral bonus</strong>, with instant settlement in INR or USDT.
                </p>

                {invitedReferralCode && (
                  <div className="mb-7 p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-4 shadow-xs max-w-md">
                    <div>
                      <p className="text-xs text-slate-500">Invited Referral Code</p>
                      <p className="text-base font-bold font-mono tracking-wider text-slate-900 mt-0.5">
                        {invitedReferralCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyRefCode}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {copiedRefCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <button
                    type="button"
                    onClick={handleDownloadApk}
                    className="px-6 py-3.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download AlienPay APK</span>
                  </button>

                  <a
                    href="#calculator"
                    className="px-5 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    <Calculator className="w-4 h-4 text-sky-700" />
                    <span>Check Commission Rates</span>
                  </a>
                </div>

                <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                  <span>Instant OTP Settlement</span>
                  <span aria-hidden="true">·</span>
                  <span>Gaming Fund & Stock Fund</span>
                  <span aria-hidden="true">·</span>
                  <span>10% Direct Referral Commission</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Commission & APK Download Card */}
            <div className="lg:col-span-5 flex">
              <div className="w-full lg:h-full rounded-2xl bg-white border border-slate-200 p-6 sm:p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Gaming & Stock Fund Rates</p>
                      <h2 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mt-0.5">
                        Account Running Commission
                      </h2>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-sky-700">
                      1 USDT = ₹{EXCHANGE_RATE}
                    </span>
                  </div>

                  {/* Exact App Rates Table */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Savings Account</p>
                        <p className="text-xs text-slate-500">OTP Work · Up to ₹10 Lakh Volume</p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="text-xs text-sky-700">Gaming: <strong className="text-sm">5%</strong></p>
                        <p className="text-xs text-emerald-700">Stock: <strong className="text-sm">10%</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Current Account</p>
                        <p className="text-xs text-slate-500">OTP Work · Up to ₹50 Lakh Volume</p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="text-xs text-sky-700">Gaming: <strong className="text-sm">3%</strong></p>
                        <p className="text-xs text-emerald-700">Stock: <strong className="text-sm">5%</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Corporate Account</p>
                        <p className="text-xs text-slate-500">OTP Work · Up to ₹5 Crore Volume</p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="text-xs text-sky-700">Gaming: <strong className="text-sm">4%</strong></p>
                        <p className="text-xs text-emerald-700">Stock: <strong className="text-sm">6%</strong></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scan or Download APK */}
                <div className="pt-5 border-t border-slate-100 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 p-1.5 shrink-0 flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR code to download AlienPay Android APK"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Smartphone className="w-8 h-8 text-slate-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 mb-1">
                      Install Official AlienPay Android APK
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2.5">
                      Scan with your phone camera or click below to download <span className="text-slate-800 font-mono font-medium">AlienPay.apk</span>.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadApk}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 underline underline-offset-4 cursor-pointer whitespace-nowrap"
                    >
                      Download AlienPay.apk Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Key Metric Strip */}
          <div className="mt-12 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                Up to 10%
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Running commission on Savings, Current & Corporate OTP work
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                10% Referral
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Direct referral deposit commission with instant settlement
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                Gaming & Stock
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Dedicated volume routing for both Gaming Fund and Stock Fund
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
                Instant Payout
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Withdraw commission & security deposit anytime in INR or USDT
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 01: CORE ANDROID APK FEATURES (#features)
        ===================================================================== */}
        <section id="features" className="py-16 md:py-20 border-b border-slate-200">
          <div className="max-w-2xl mb-12">
            <p className="text-xs text-sky-700 font-semibold mb-2">
              01. Core Android APK Features
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit',sans-serif] tracking-tight mb-3"
              style={{ textWrap: 'balance' }}
            >
              Built for Fast OTP Work & Instant Commission Settlement
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Manage your linked bank accounts, monitor live volume increments, and withdraw earnings directly from the AlienPay Android app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-7 shadow-xs">
              <p className="text-xs font-mono font-semibold text-sky-700 mb-2">01. All Bank Accounts Supported</p>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-2">
                Savings, Current & Corporate Accounts for OTP Work
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect any Indian bank account (SBI, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda & more). Run automated OTP settlement volume directly inside the APK and earn up to 10% commission.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-7 shadow-xs">
              <p className="text-xs font-mono font-semibold text-emerald-700 mb-2">02. Dual Fund Selection</p>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-2">
                Gaming Fund & Stock Fund Volume Routing
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select between <strong className="text-slate-900">Gaming Fund</strong> (3% to 5% commission) and{' '}
                <strong className="text-slate-900">Stock Fund</strong> (5% to 10% commission) when activating your linked bank account in the app.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-7 shadow-xs">
              <p className="text-xs font-mono font-semibold text-amber-700 mb-2">03. Refer & Earn 10%</p>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-2">
                10% Direct Referral Deposit Commission
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Share your unique AlienPay referral code with your network. Earn an instant{' '}
                <strong className="text-slate-900">10% Direct Referral Bonus</strong> on every security deposit activated by your referred members.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-7 shadow-xs">
              <p className="text-xs font-mono font-semibold text-sky-700 mb-2">04. Instant Settlement</p>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-2">
                Instant Commission Claim & Anytime Withdrawal
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Accrued running commissions and referral rewards settle instantly to your unified wallet. Withdraw 24/7 via <strong className="text-slate-900">USDT (BEP-20)</strong> or{' '}
                <strong className="text-slate-900">INR Bank / UPI</strong>. Your security deposit can also be withdrawn anytime.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 02: BANK ACCOUNT COMMISSION BREAKDOWN (#accounts)
        ===================================================================== */}
        <section id="accounts" className="py-16 md:py-20 border-b border-slate-200">
          <div className="max-w-2xl mb-12">
            <p className="text-xs text-sky-700 font-semibold mb-2">
              02. Account Categories & Commission Rates
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit',sans-serif] tracking-tight mb-3"
              style={{ textWrap: 'balance' }}
            >
              We Accept All Savings, Current & Corporate Accounts
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every linked account earns instant settlement commission based on your chosen fund type.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.values(ACCOUNT_SPECS).map((spec) => (
              <div
                key={spec.type}
                className="rounded-2xl bg-white border border-slate-200 p-7 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-4 mb-5 border-b border-slate-100">
                    <span>{spec.index}. {spec.vipTier}</span>
                    <span className="font-mono tabular-nums font-medium text-sky-700">{spec.volumeLimitLabel}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif] mb-4">
                    {spec.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-5 font-mono tabular-nums">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[11px] font-sans text-slate-500">Gaming Fund</p>
                      <p className="text-xl font-bold text-sky-700 mt-0.5">{spec.gamingRate}%</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[11px] font-sans text-slate-500">Stock Fund</p>
                      <p className="text-xl font-bold text-emerald-700 mt-0.5">{spec.stockRate}%</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {spec.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Instant OTP Settlement
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectAccountType(spec.type);
                      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer flex items-center gap-1"
                  >
                    <span>Calculate Commission</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 03: GAMING FUND & STOCK FUND CALCULATOR (#calculator)
        ===================================================================== */}
        <section id="calculator" className="py-16 md:py-20 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <p className="text-xs text-sky-700 font-semibold mb-2">
                03. Instant Running Commission Calculator
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit',sans-serif] tracking-tight mb-3"
                style={{ textWrap: 'balance' }}
              >
                Compare Gaming Fund vs. Stock Fund Commission
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
                Select your account category and running volume to see your exact instant settlement payout on Gaming Fund and Stock Fund.
              </p>

              {/* Account Selector */}
              <div className="mb-7">
                <label className="block text-xs font-medium text-slate-600 mb-2.5">
                  Select Bank Account Category
                </label>
                <div className="grid grid-cols-3 gap-2.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl">
                  {(['Savings', 'Current', 'Corporate'] as AccountCategory[]).map((type) => {
                    const spec = ACCOUNT_SPECS[type];
                    const isActive = calcAccountType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleSelectAccountType(type)}
                        className={`px-3 py-2.5 rounded-lg text-center transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        <div className="text-xs whitespace-nowrap">{type} Account</div>
                        <div className="text-[11px] font-mono tabular-nums opacity-80">
                          {spec.gamingRate}% / {spec.stockRate}%
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume Slider */}
              <div className="mb-6">
                <div className="flex items-baseline justify-between mb-3">
                  <label htmlFor="otp-volume-slider" className="text-xs font-medium text-slate-600">
                    Account Running Volume (INR)
                  </label>
                  <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    {formatInr(calcVolume)}
                  </span>
                </div>

                <input
                  id="otp-volume-slider"
                  type="range"
                  min={50000}
                  max={activeSpec.maxVolumeInr}
                  step={50000}
                  value={Math.min(calcVolume, activeSpec.maxVolumeInr)}
                  onChange={(e) => setCalcVolume(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500 mt-2">
                  <span>₹50,000</span>
                  <span>Max Limit: {formatInr(activeSpec.maxVolumeInr)}</span>
                </div>
              </div>

              {/* Quick Volume Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {[100000, 500000, 1000000, 2500000, 5000000, 10000000]
                  .filter((v) => v <= activeSpec.maxVolumeInr)
                  .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcVolume(preset)}
                      className={`px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        calcVolume === preset
                          ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {formatInr(preset)}
                    </button>
                  ))}
              </div>
            </div>

            {/* Right Card: Output */}
            <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-sky-700" />
                  <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                    Instant Settlement Payout
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">{activeSpec.title}</span>
              </div>

              <div className="space-y-4 font-mono tabular-nums">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-sans text-slate-500 mb-1">
                    <span>Gaming Fund Commission ({activeSpec.gamingRate}%)</span>
                    <span className="font-mono font-semibold text-sky-700">
                      {(gamingCommissionInr / EXCHANGE_RATE).toFixed(2)} USDT
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-sky-700">
                    {formatInr(gamingCommissionInr)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-sans text-slate-500 mb-1">
                    <span>Stock Fund Commission ({activeSpec.stockRate}%)</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {(stockCommissionInr / EXCHANGE_RATE).toFixed(2)} USDT
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatInr(stockCommissionInr)}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  className="w-full py-3.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download AlienPay APK</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 04: VIP SECURITY DEPOSIT PLANS (#vip-plans)
        ===================================================================== */}
        <section id="vip-plans" className="py-16 md:py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs text-sky-700 font-semibold mb-2">
              04. VIP Security Deposit Tiers
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Outfit',sans-serif] tracking-tight mb-3"
              style={{ textWrap: 'balance' }}
            >
              Security Deposit Can Always Be Withdrawn Anytime
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Activate a VIP plan inside the AlienPay Android app to unlock full volume access. Keep your deposit active to earn{' '}
              <strong className="text-slate-900">1.0% Daily Dividend</strong>, plus instant{' '}
              <strong className="text-slate-900">10% Direct Referral Bonus</strong> and up to{' '}
              <strong className="text-slate-900">10% Commission</strong> on Gaming & Stock Funds.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Silver VIP */}
            <div className="rounded-2xl bg-white border border-slate-200 p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 pb-4 mb-5 border-b border-slate-100">
                  <span>01. Tier 1 Entry</span>
                  <span className="font-mono tabular-nums font-medium text-teal-700">30 Days · 1% Daily Dividend</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-1">
                  Silver VIP
                </h3>
                <div className="flex items-baseline gap-2.5 my-4 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-900">400 USDT</span>
                  <span className="text-sm text-slate-500">/ ₹40,000</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 my-6">
                  <li>Savings account with full volume access</li>
                  <li>Earn up to 10% on Gaming (5%) & Stock (10%) Funds</li>
                  <li>10% Direct Referral Deposit Bonus (Instant Settlement)</li>
                  <li>Security deposit can always be withdrawn anytime</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleDownloadApk}
                className="w-full py-3 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download APK for Silver VIP</span>
              </button>
            </div>

            {/* Gold Pro VIP */}
            <div className="rounded-2xl bg-white border-2 border-slate-900 p-7 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-sky-700 font-semibold pb-4 mb-5 border-b border-slate-100">
                  <span>02. Most Popular</span>
                  <span className="font-mono tabular-nums">60 Days · 1% Daily Dividend</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-1">
                  Gold Pro VIP
                </h3>
                <div className="flex items-baseline gap-2.5 my-4 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-900">800 USDT</span>
                  <span className="text-sm text-slate-500">/ ₹80,000</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 my-6">
                  <li>Savings & Current account with full volume access</li>
                  <li>Earn up to 10% on Gaming & Stock Funds</li>
                  <li>10% Direct Referral Deposit Bonus (Instant Settlement)</li>
                  <li>Security deposit can always be withdrawn anytime</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleDownloadApk}
                className="w-full py-3 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download APK for Gold Pro VIP</span>
              </button>
            </div>

            {/* Diamond Elite VIP */}
            <div className="rounded-2xl bg-white border border-slate-200 p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 pb-4 mb-5 border-b border-slate-100">
                  <span>03. Corporate Tier</span>
                  <span className="font-mono tabular-nums font-medium text-sky-700">90 Days · 1% Daily Dividend</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif] mb-1">
                  Diamond Elite VIP
                </h3>
                <div className="flex items-baseline gap-2.5 my-4 font-mono tabular-nums">
                  <span className="text-3xl font-bold text-slate-900">1,800 USDT</span>
                  <span className="text-sm text-slate-500">/ ₹1,80,000</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 my-6">
                  <li>Savings, Current & Corporate account full volume access</li>
                  <li>Earn up to 10% on Gaming & Stock Funds</li>
                  <li>10% Direct Referral Deposit Bonus (Instant Settlement)</li>
                  <li>Security deposit can always be withdrawn anytime</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleDownloadApk}
                className="w-full py-3 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download APK for Diamond VIP</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          QUIET FOOTER
      ===================================================================== */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
              AlienPay · alienpay.in
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Savings, Current & Corporate OTP Work · Gaming & Stock Fund · Up to 10% Instant Commission
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              APK Features
            </a>
            <a href="#accounts" className="hover:text-slate-900 transition-colors">
              Bank Accounts
            </a>
            <a href="#calculator" className="hover:text-slate-900 transition-colors">
              Calculator
            </a>
            <button
              type="button"
              onClick={handleDownloadApk}
              className="text-slate-900 hover:text-sky-700 font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Android APK</span>
            </button>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          APK DOWNLOAD MODAL (LIGHT THEME)
      ===================================================================== */}
      {isApkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                  Download AlienPay Android APK
                </h3>
                <p className="text-xs text-slate-500">
                  Official Android Release · Instant OTP Work & Commission
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsApkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
              {qrDataUrl && (
                <div className="w-24 h-24 rounded-lg bg-white border border-slate-200 p-1.5 shrink-0">
                  <img
                    src={qrDataUrl}
                    alt="AlienPay APK QR Code"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="text-xs space-y-1.5">
                <p className="font-semibold text-slate-900">Install in 3 Steps:</p>
                <p className="text-slate-600">
                  1. Download <span className="font-mono font-semibold text-slate-900">AlienPay.apk</span>.
                </p>
                <p className="text-slate-600">2. Open the file and allow browser installation.</p>
                <p className="text-slate-600">3. Add your bank account and start OTP work.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={apkDownloadUrl}
                download="AlienPay.apk"
                className="w-full py-3.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download AlienPay.apk Directly</span>
              </a>

              <button
                type="button"
                onClick={handleCopyDownloadLink}
                className="w-full py-2.5 px-4 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Copied APK Download Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Direct APK Download Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
