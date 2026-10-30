/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AndroidFrame, SmsHeadUpNotification } from './components/AndroidFrame';
import { TopBar } from './components/TopBar';
import { AnnouncementTicker } from './components/AnnouncementTicker';
import { WalletCard } from './components/WalletCard';
import { QuickActionBlocks } from './components/QuickActionBlocks';
import { DepositPlans } from './components/DepositPlans';
import { SlidingNavbar } from './components/SlidingNavbar';
import { BottomNavBar } from './components/BottomNavBar';
import { LoginScreen } from './components/screens/LoginScreen';
import { SignupScreen } from './components/screens/SignupScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { WelcomeLandingScreen } from './components/screens/WelcomeLandingScreen';
import { SplashScreen } from './components/SplashScreen';
import { FloatingSupportButton } from './components/FloatingSupportButton';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { WalletScreen } from './components/screens/WalletScreen';
import { ReferScreen } from './components/screens/ReferScreen';
import { CommissionScreen } from './components/screens/CommissionScreen';
import { SupportScreen } from './components/screens/SupportScreen';
import { DepositScreen } from './components/screens/DepositScreen';
import { WithdrawScreen } from './components/screens/WithdrawScreen';
import { AdminPanelScreen } from './components/screens/AdminPanelScreen';
import { AlienPayLandingPage } from './components/screens/AlienPayLandingPage';
import { DepositModal } from './components/modals/DepositModal';
import { WithdrawModal } from './components/modals/WithdrawModal';
import { PlanDetailModal } from './components/modals/PlanDetailModal';
import { BankAccountsSection } from './components/BankAccountsSection';
import { ReferralPromoCard } from './components/ReferralPromoCard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ApiService, DEFAULT_USER } from './services/apiService';
import { 
  UserProfile, 
  WalletBalances, 
  ActiveScreen, 
  Transaction, 
  DepositPlan, 
  AuthScreenMode,
  SavedBankAccount,
  ThemeMode 
} from './types';
import { DEPOSIT_PLANS } from './data/plans';

export default function App() {
  // Theme State using dynamic CSS variables (dark theme is current state)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('alienpay_theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'light'; // Default theme is light
  });

  useEffect(() => {
    const activeTheme: ThemeMode = theme === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem('alienpay_theme', activeTheme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');
  }, [theme]);

  const handleToggleTheme = (newTheme?: unknown) => {
    if (typeof newTheme === 'string' && (newTheme === 'dark' || newTheme === 'light')) {
      setTheme(newTheme);
    } else {
      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alienpay_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [authMode, setAuthMode] = useState<AuthScreenMode>('welcome');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile>(() => {
    return ApiService.getStoredUser() || DEFAULT_USER;
  });

  // Screen & Navigation State
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Financial Wallet Balances (Synced from Render PostgreSQL database)
  const [balances, setBalances] = useState<WalletBalances>(() => {
    let savedRunningComm = 0;
    try {
      const val = localStorage.getItem('alienpay_unclaimed_running_comm');
      if (val) savedRunningComm = Math.max(0, Number(val) || 0);
    } catch {}
    return {
      inrBalance: 0.00,
      usdtBalance: 0.00,
      frozenInr: 0,
      frozenUsdt: 0,
      totalCommissionEarned: 0,
      totalPlanEarnings: 0,
      todayEarnings: savedRunningComm,
      exchangeRateUsdtToInr: 100.00,
    };
  });

  // Global currency selector (USDT | INR) synchronized across Dashboard and Sidebar
  const [selectedCurrency, setSelectedCurrency] = useState<'USDT' | 'INR'>(() => {
    try {
      const saved = localStorage.getItem('alienpay_selected_currency');
      if (saved === 'INR' || saved === 'USDT') return saved;
    } catch {}
    return 'USDT';
  });

  const handleSelectCurrency = (cur: 'USDT' | 'INR') => {
    setSelectedCurrency(cur);
    try {
      localStorage.setItem('alienpay_selected_currency', cur);
    } catch {}
  };

  // Real Transactions Ledger (Populated from Render PostgreSQL database)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Clear legacy demo keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem('alienpay_transactions_v2');
      localStorage.removeItem('alienpay_balances');
      localStorage.removeItem('alienpay_saved_bank_accounts');
    } catch {}
  }, []);

  // Modals state
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [modalCurrency, setModalCurrency] = useState<'INR' | 'USDT'>('INR');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<DepositPlan | null>(null);

  // User-saved Bank Accounts state (starts empty, no demo accounts)
  const [bankAccounts, setBankAccounts] = useState<SavedBankAccount[]>(() => {
    const saved = localStorage.getItem('alienpay_user_bank_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: SavedBankAccount) => a.id !== 'bank_default_1');
        }
      } catch {}
    }
    return [];
  });

  const bankAccountsRef = React.useRef<SavedBankAccount[]>(bankAccounts);

  useEffect(() => {
    bankAccountsRef.current = bankAccounts;
    localStorage.setItem('alienpay_user_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  // Exact 9-step volume sequence for Corporate Account + Stock Fund (10-second interval):
  // Step 1: 16,87,184 INR
  // Step 2: +5,00,000 INR  (21,87,184)
  // Step 3: +50,000.00 INR (22,37,184)
  // Step 4: +2,00,000 INR  (24,37,184)
  // Step 5: +9,50,000 INR  (33,87,184)
  // Step 6: +5,50,000 INR  (39,37,184)
  // Step 7: +5,00,000 INR  (44,37,184)
  // Step 8: +4,70,000 INR  (49,07,184)
  // Step 9: +50,00,000 INR (99,07,184 -> 100% volume completion)
  const CORPORATE_STOCK_CUMULATIVE = [
    1687184,
    2187184,
    2237184,
    2437184,
    3387184,
    3937184,
    4437184,
    4907184,
    9907184,
  ];
  const CORPORATE_STOCK_TOTAL_LIMIT = 9907184;

  const isCorporateStockAccount = (acc: SavedBankAccount) =>
    acc.accountType === 'Corporate' && acc.fundType === 'stock';

  // Top-bar SMS heads-up notification state for Corporate account running credits
  const [smsNotification, setSmsNotification] = useState<SmsHeadUpNotification | null>(null);

  const triggerCorporateCreditSms = (
    acc: SavedBankAccount,
    creditedAmountInr: number,
    availableBalanceInr?: number
  ) => {
    if (
      (acc.accountType !== 'Corporate' &&
        acc.accountType !== 'Savings' &&
        acc.accountType !== 'Current') ||
      creditedAmountInr <= 0
    )
      return;
    const cleanDigits = (acc.accountNumber || '').replace(/\s+/g, '');
    const last4Digits = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : cleanDigits || '3324';
    const maskedAc = `XXXX${last4Digits}`;
    const formattedAmount = creditedAmountInr.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedAmountTruecaller = creditedAmountInr.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const todayDateStr = `${dd}-${mm}-${yy}`;

    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const timeFormatted = `${hours12}:${mins} ${ampm}`;

    const avlBalValue = availableBalanceInr ?? creditedAmountInr;
    const formattedAvlBal = avlBalValue.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const bankLower = (acc.bankName || '').toLowerCase().trim();
    const ifscUpper = (acc.ifscCode || '').toUpperCase().trim();
    const isBandhan =
      bankLower.includes('bandhan') ||
      ifscUpper.startsWith('BDBL');
    const isSbi =
      bankLower.includes('state bank of india') ||
      bankLower.includes('sbi') ||
      ifscUpper.startsWith('SBIN');
    const isJio =
      bankLower.includes('jio') ||
      ifscUpper.startsWith('JIOP');
    const isPnb =
      bankLower.includes('pnb') ||
      bankLower.includes('punjab national bank') ||
      ifscUpper.startsWith('PUNB');
    const isIob =
      bankLower.includes('indian overseas') ||
      bankLower.includes('indian overses') ||
      bankLower === 'iob' ||
      ifscUpper.startsWith('IOBA');
    const isIdfc =
      bankLower.includes('idfc') ||
      ifscUpper.startsWith('IDFB');
    const isKotak =
      bankLower.includes('kotak') ||
      ifscUpper.startsWith('KKBK');
    const isBoi =
      (bankLower.includes('bank of india') &&
        !bankLower.includes('state bank') &&
        !bankLower.includes('union bank') &&
        !bankLower.includes('central bank')) ||
      bankLower === 'boi' ||
      ifscUpper.startsWith('BKID');
    const isHdfc =
      bankLower.includes('hdfc') ||
      ifscUpper.startsWith('HDFC');
    const isCanara =
      bankLower.includes('canara') ||
      ifscUpper.startsWith('CNRB');

    const sender = isBandhan
      ? 'AD-BDNBNK-S'
      : isPnb
      ? 'AD-PNBSMS-T'
      : isJio
      ? 'JP-JIOPBK-T'
      : isSbi
      ? 'AX-CBSSBI-S'
      : isIob
      ? 'AD-IOBCHN-S'
      : isIdfc
      ? 'AD-IDFCFB-S'
      : isKotak
      ? 'VM-KOTAKB-S'
      : isBoi
      ? 'AX-BOIIND-S'
      : isHdfc
      ? 'AD-HDFCBK-S'
      : isCanara
      ? 'VM-CANBNK-S'
      : 'VM-ICICIB-T';
    const message = `Your ac no. ${maskedAc} is credited for Rs. ${formattedAmount} on ${todayDateStr}, available balance is Rs. ${formattedAvlBal}.`;

    setSmsNotification({
      id: `sms_${acc.id}_${Date.now()}`,
      sender,
      message,
      timestamp: Date.now(),
      truecallerPopup: isBandhan
        ? {
            bankName: 'Bandhan Bank',
            amountFormatted: `+ ₹${formattedAmountTruecaller}`,
            accountLast4: last4Digits,
            timeFormatted,
          }
        : undefined,
    });
  };

  const mergeServerBankAccounts = (
    prev: SavedBankAccount[],
    serverList: SavedBankAccount[]
  ): SavedBankAccount[] => {
    return serverList.map((dbAcc: SavedBankAccount) => {
      const localMatch = prev.find((p) => p.id === dbAcc.id);
      if (!localMatch) return dbAcc;
      const mergedVol = Math.max(
        localMatch.runningVolumeProcessed ?? 0,
        dbAcc.runningVolumeProcessed ?? 0
      );
      const effectiveMax = isCorporateStockAccount(dbAcc)
        ? CORPORATE_STOCK_TOTAL_LIMIT
        : dbAcc.maxVolumeLimit ||
          localMatch.maxVolumeLimit ||
          (dbAcc.accountType === 'Corporate'
            ? 40000000
            : dbAcc.accountType === 'Current'
            ? 7400000
            : 1000000);
      const completed = mergedVol >= effectiveMax;

      return {
        ...localMatch,
        ...dbAcc,
        maxVolumeLimit: effectiveMax,
        runningVolumeProcessed: mergedVol,
        accumulatedCommission:
          (localMatch.accumulatedCommission ?? 0) > 0
            ? localMatch.accumulatedCommission
            : dbAcc.accumulatedCommission ?? 0,
        lastProcessedDelta: localMatch.lastProcessedDelta || dbAcc.lastProcessedDelta,
        isRunning: completed ? false : Boolean(localMatch.isRunning ?? dbAcc.isRunning),
      };
    });
  };

  // 1) Corporate Account + Stock Fund: Strict 10-second interval stepping through the 9 exact increments up to 100% (₹99,07,184)
  useEffect(() => {
    const hasRunningCorpStock = bankAccounts.some(
      (a) => a.isRunning && isCorporateStockAccount(a)
    );
    if (!hasRunningCorpStock) return;

    let isCancelled = false;

    const intervalId = setInterval(() => {
      if (isCancelled) return;

      const currentAccounts = bankAccountsRef.current;
      let totalAccruedCommission = 0;
      let hasChanges = false;
      const nowTs = Date.now();
      const accountsToPersist: Array<{
        id: string;
        isRunning: boolean;
        runningVolumeProcessed: number;
        accumulatedCommission: number;
      }> = [];

      const nextAccounts = currentAccounts.map((acc) => {
        if (!acc.isRunning || !isCorporateStockAccount(acc)) return acc;

        const maxLimit = CORPORATE_STOCK_TOTAL_LIMIT;
        const currentVol = acc.runningVolumeProcessed ?? 0;

        if (currentVol >= maxLimit) {
          hasChanges = true;
          accountsToPersist.push({
            id: acc.id,
            isRunning: false,
            runningVolumeProcessed: maxLimit,
            accumulatedCommission: Number((acc.accumulatedCommission ?? 0).toFixed(2)),
          });
          return {
            ...acc,
            maxVolumeLimit: maxLimit,
            runningVolumeProcessed: maxLimit,
            isRunning: false,
          };
        }

        hasChanges = true;
        const nextMilestone =
          CORPORATE_STOCK_CUMULATIVE.find((m) => m > currentVol) ?? maxLimit;
        const addedVol = Math.max(0, nextMilestone - currentVol);
        const newVol = nextMilestone;

        const rate = acc.stockCommissionRate ?? 6;
        const addedComm = addedVol * (rate / 100);
        totalAccruedCommission += addedComm;
        const newComm = Number(((acc.accumulatedCommission ?? 0) + addedComm).toFixed(2));
        const stillRunning = newVol < maxLimit;

        accountsToPersist.push({
          id: acc.id,
          isRunning: stillRunning,
          runningVolumeProcessed: newVol,
          accumulatedCommission: newComm,
        });

        if (addedVol > 0) {
          triggerCorporateCreditSms(acc, addedVol, newVol);
        }

        return {
          ...acc,
          runningVolumeProcessed: newVol,
          accumulatedCommission: newComm,
          maxVolumeLimit: maxLimit,
          lastProcessedDelta: {
            volume: addedVol,
            commission: Number(addedComm.toFixed(2)),
            timestamp: nowTs,
          },
          isRunning: stillRunning,
        };
      });

      if (hasChanges) {
        bankAccountsRef.current = nextAccounts;
        setBankAccounts(nextAccounts);

        accountsToPersist.forEach((item) => {
          ApiService.updateBankAccount(item.id, {
            isRunning: item.isRunning,
            runningVolumeProcessed: item.runningVolumeProcessed,
            accumulatedCommission: item.accumulatedCommission,
          }).catch(() => {});
        });
      }

      if (totalAccruedCommission > 0) {
        setBalances((prev) => {
          const nextToday = Number((prev.todayEarnings + totalAccruedCommission).toFixed(2));
          try {
            localStorage.setItem('alienpay_unclaimed_running_comm', String(nextToday));
          } catch {}
          return {
            ...prev,
            totalCommissionEarned: Number(
              (prev.totalCommissionEarned + totalAccruedCommission).toFixed(2)
            ),
            todayEarnings: nextToday,
          };
        });
      }
    }, 10000); // Exact 10-second interval after tapping Run Work

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [
    bankAccounts
      .filter((a) => isCorporateStockAccount(a))
      .map((a) => a.id + (a.isRunning ? '1' : '0'))
      .join(','),
  ]);

  // 2) Savings Account Gaming Transaction & All Other Accounts:
  // Preserves randomized intervals (4s, 8s, 20s, up to 60s) and random volume chunks, and stores progress in DB + localStorage
  useEffect(() => {
    const hasRunningOther = bankAccounts.some(
      (a) => a.isRunning && !isCorporateStockAccount(a)
    );
    if (!hasRunningOther) return;

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const getRandomGapMs = () => {
      const gapBucketsMs = [
        4000,   // 4 sec
        8000,   // 8 sec
        20000,  // 20 sec
        4000,   // 4 sec
        6000,   // 6 sec
        8000,   // 8 sec
        12000,  // 12 sec
        16000,  // 16 sec
        20000,  // 20 sec
        25000,  // 25 sec
        32000,  // 32 sec
        45000,  // 45 sec
        55000,  // 55 sec (strictly <= 1 min)
      ];
      const base = gapBucketsMs[Math.floor(Math.random() * gapBucketsMs.length)];
      const jitter = Math.floor(Math.random() * 800);
      return Math.min(60000, base + jitter);
    };

    const runVolumeStep = () => {
      if (isCancelled) return;

      const chunks = [3000, 6000, 10000, 3000, 6000, 10000, 4500, 8000, 5000, 7500, 12000];
      const currentAccounts = bankAccountsRef.current;
      let totalAccruedCommission = 0;
      let hasChanges = false;
      const nowTs = Date.now();
      const accountsToPersist: Array<{
        id: string;
        isRunning: boolean;
        runningVolumeProcessed: number;
        accumulatedCommission: number;
      }> = [];

      const nextAccounts = currentAccounts.map((acc) => {
        if (!acc.isRunning || isCorporateStockAccount(acc)) return acc;

        // Determine max limit for this account type:
        // Savings: 10 Lakh (1,000,000), Current: 74 Lakhs (7,400,000), Corporate Gaming: 4 Crore (40,000,000)
        const maxLimit =
          acc.maxVolumeLimit ||
          (acc.accountType === 'Corporate'
            ? 40000000 // 4 Crore
            : acc.accountType === 'Current'
            ? 7400000 // 74 Lakhs
            : 1000000); // 10 Lakhs (Savings)

        const currentVol = acc.runningVolumeProcessed ?? 0;
        if (currentVol >= maxLimit) {
          hasChanges = true;
          accountsToPersist.push({
            id: acc.id,
            isRunning: false,
            runningVolumeProcessed: maxLimit,
            accumulatedCommission: Number((acc.accumulatedCommission ?? 0).toFixed(2)),
          });
          return { ...acc, isRunning: false };
        }

        hasChanges = true;
        const chunk = chunks[Math.floor(Math.random() * chunks.length)];
        const addedVol = Math.min(chunk, maxLimit - currentVol);
        const newVol = currentVol + addedVol;

        // Calculate commission rate based on fund and account type:
        // Savings: Gaming 5%, Stock 10%
        // Current: Gaming 3%, Stock 5%
        // Corporate: Gaming 4%, Stock 6%
        const isStock = acc.fundType === 'stock';
        const rate =
          acc.accountType === 'Corporate'
            ? isStock
              ? acc.stockCommissionRate ?? 6
              : acc.gamingCommissionRate ?? 4
            : acc.accountType === 'Current'
            ? isStock
              ? acc.stockCommissionRate ?? 5
              : acc.gamingCommissionRate ?? 3
            : isStock
            ? acc.stockCommissionRate ?? 10
            : acc.gamingCommissionRate ?? 5;

        const addedComm = addedVol * (rate / 100);
        totalAccruedCommission += addedComm;
        const newComm = Number(((acc.accumulatedCommission ?? 0) + addedComm).toFixed(2));
        const stillRunning = newVol < maxLimit;

        accountsToPersist.push({
          id: acc.id,
          isRunning: stillRunning,
          runningVolumeProcessed: newVol,
          accumulatedCommission: newComm,
        });

        if (
          (acc.accountType === 'Corporate' ||
            acc.accountType === 'Savings' ||
            acc.accountType === 'Current') &&
          addedVol > 0
        ) {
          triggerCorporateCreditSms(acc, addedVol, newVol);
        }

        return {
          ...acc,
          runningVolumeProcessed: newVol,
          accumulatedCommission: newComm,
          maxVolumeLimit: maxLimit,
          lastProcessedDelta: {
            volume: addedVol,
            commission: Number(addedComm.toFixed(2)),
            timestamp: nowTs,
          },
          isRunning: stillRunning,
        };
      });

      if (hasChanges) {
        bankAccountsRef.current = nextAccounts;
        setBankAccounts(nextAccounts);

        accountsToPersist.forEach((item) => {
          ApiService.updateBankAccount(item.id, {
            isRunning: item.isRunning,
            runningVolumeProcessed: item.runningVolumeProcessed,
            accumulatedCommission: item.accumulatedCommission,
          }).catch(() => {});
        });
      }

      if (totalAccruedCommission > 0) {
        setBalances((prev) => {
          const nextToday = Number((prev.todayEarnings + totalAccruedCommission).toFixed(2));
          try {
            localStorage.setItem('alienpay_unclaimed_running_comm', String(nextToday));
          } catch {}
          return {
            ...prev,
            totalCommissionEarned: Number(
              (prev.totalCommissionEarned + totalAccruedCommission).toFixed(2)
            ),
            todayEarnings: nextToday,
          };
        });
      }

      if (!isCancelled && nextAccounts.some((a) => a.isRunning && !isCorporateStockAccount(a))) {
        timeoutId = setTimeout(runVolumeStep, getRandomGapMs());
      }
    };

    timeoutId = setTimeout(runVolumeStep, getRandomGapMs());

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    bankAccounts
      .filter((a) => !isCorporateStockAccount(a))
      .map((a) => a.id + (a.isRunning ? '1' : '0'))
      .join(','),
  ]);

  const handleAddBankAccount = (newAcc: SavedBankAccount) => {
    setBankAccounts((prev) => [newAcc, ...prev]);
    ApiService.addBankAccount(newAcc)
      .then((res) => {
        if (Array.isArray(res?.bankAccounts)) {
          setBankAccounts((prev) => mergeServerBankAccounts(prev, res.bankAccounts));
        }
      })
      .catch(() => {});
  };

  const handleDeleteBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
    ApiService.deleteBankAccount(id)
      .then((res) => {
        if (Array.isArray(res?.bankAccounts)) {
          setBankAccounts((prev) => mergeServerBankAccounts(prev, res.bankAccounts));
        }
      })
      .catch(() => {});
  };

  const handleSetPrimaryBankAccount = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        isPrimary: a.id === id,
      }))
    );
    ApiService.updateBankAccount(id, { isPrimary: true })
      .then((res) => {
        if (Array.isArray(res?.bankAccounts)) {
          setBankAccounts((prev) => mergeServerBankAccounts(prev, res.bankAccounts));
        }
      })
      .catch(() => {});
  };

  const handleToggleRunBankAccount = (id: string) => {
    const targetAcc = bankAccounts.find((a) => a.id === id);
    const nextRunning = !targetAcc?.isRunning;
    setBankAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, isRunning: nextRunning };
        }
        return a;
      })
    );
    ApiService.updateBankAccount(id, { isRunning: nextRunning })
      .then((res) => {
        if (Array.isArray(res?.bankAccounts)) {
          setBankAccounts((prev) => mergeServerBankAccounts(prev, res.bankAccounts));
        }
      })
      .catch(() => {});
  };

  // Sync wallet balance, real transactions, bank accounts & unique BEP-20 HD address from Render PostgreSQL
  const syncWalletFromServer = (targetUser?: UserProfile) => {
    ApiService.fetchUserWallet(targetUser || user)
      .then((walletRes: any) => {
        if (walletRes?.user) {
          const sUser = walletRes.user;
          setUser((prev) => {
            const merged: UserProfile = {
              ...prev,
              ...sUser,
              avatarUrl: sUser.avatarUrl || sUser.profilePhoto || prev.avatarUrl,
              profilePhoto: sUser.profilePhoto || sUser.avatarUrl || prev.profilePhoto,
              bankDetails: {
                ...(prev.bankDetails || {}),
                ...(sUser.bankDetails || {}),
                upiId: (sUser.bankDetails?.upiId && sUser.bankDetails.upiId.trim() !== '') 
                  ? sUser.bankDetails.upiId 
                  : (prev.bankDetails?.upiId || ''),
              },
              cryptoDetails: {
                ...(prev.cryptoDetails || {}),
                ...(sUser.cryptoDetails || {}),
                bep20Address: (sUser.cryptoDetails?.bep20Address && sUser.cryptoDetails.bep20Address.trim() !== '') 
                  ? sUser.cryptoDetails.bep20Address 
                  : (prev.cryptoDetails?.bep20Address || ''),
              },
              depositWallet: walletRes.depositAddress || sUser.depositWallet || prev.depositWallet,
            };
            ApiService.saveUser(merged);
            return merged;
          });
        } else if (walletRes?.depositAddress?.address) {
          setUser((prev) => {
            const merged = {
              ...prev,
              depositWallet: walletRes.depositAddress,
            };
            ApiService.saveUser(merged);
            return merged;
          });
        }
        if (walletRes?.wallet) {
          const rate = 100;
          const usdtBal = Number(walletRes.wallet.balance || 0);
          const lockedUsdt = Number(walletRes.wallet.locked || 0);
          const totalEarnUsdt = Number(walletRes.wallet.totalEarnings || 0);
          const refEarnUsdt = Number(walletRes.wallet.referralEarnings || 0);

          setBalances((prev) => ({
            ...prev,
            usdtBalance: usdtBal,
            frozenUsdt: lockedUsdt,
            frozenInr: lockedUsdt * rate,
            totalCommissionEarned: refEarnUsdt * rate,
            totalPlanEarnings: totalEarnUsdt * rate,
          }));
        }
        if (Array.isArray(walletRes?.uiTransactions)) {
          setTransactions(walletRes.uiTransactions);
        }
        if (Array.isArray(walletRes?.bankAccounts)) {
          setBankAccounts((prev) => mergeServerBankAccounts(prev, walletRes.bankAccounts));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Immediately fetch fresh profile from Render PostgreSQL database on load/refresh
    ApiService.fetchUserProfile(user).then((fresh) => {
      if (fresh) {
        setUser((prev) => {
          const merged = { ...prev, ...fresh };
          ApiService.saveUser(merged);
          return merged;
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    syncWalletFromServer(user);
    const interval = setInterval(() => {
      syncWalletFromServer(user);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user.id]);

  // Auth callbacks
  const handleAuthSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('alienpay_logged_in', 'true');
    } catch {}
    setCurrentScreen('dashboard');
    if (typeof (loggedInUser as any).walletBalance === 'number') {
      setBalances((prev) => ({
        ...prev,
        usdtBalance: Number((loggedInUser as any).walletBalance),
        inrBalance: 0,
      }));
    }
    syncWalletFromServer(loggedInUser);
  };

  const handleLogout = () => {
    ApiService.removeUser();
    try {
      localStorage.removeItem('alienpay_logged_in');
      localStorage.removeItem('alienpay_unclaimed_running_comm');
    } catch {}
    setTransactions([]);
    setBankAccounts([]);
    setBalances({
      inrBalance: 0,
      usdtBalance: 0,
      frozenInr: 0,
      frozenUsdt: 0,
      totalCommissionEarned: 0,
      totalPlanEarnings: 0,
      todayEarnings: 0,
      exchangeRateUsdtToInr: 100,
    });
    setIsAuthenticated(false);
    setAuthMode('welcome');
    setCurrentScreen('dashboard');
  };

  // Financial callbacks (persisted to Render PostgreSQL database)
  const handleDepositSuccess = (tx: Transaction, newBals: { inrBalance: number; usdtBalance: number }) => {
    setBalances((prev) => ({
      ...prev,
      inrBalance: newBals.inrBalance,
      usdtBalance: newBals.usdtBalance,
    }));
    setTransactions((prev) => [tx, ...prev]);

    if (tx.currency === 'INR') {
      const rate = balances.exchangeRateUsdtToInr || 100;
      ApiService.submitInrDepositRequest({
        amountInr: tx.amount,
        amountUsdt: Number((tx.amount / rate).toFixed(2)),
        utrNumber: tx.referenceId || 'UTR-' + Date.now(),
        method: tx.method || 'UPI / IMPS Manual Transfer',
      })
        .then(() => syncWalletFromServer(user))
        .catch(() => {});
    } else {
      syncWalletFromServer(user);
    }
  };

  const handleWithdrawSuccess = (tx: Transaction, newBals: { inrBalance: number; usdtBalance: number }) => {
    setBalances((prev) => ({
      ...prev,
      inrBalance: newBals.inrBalance,
      usdtBalance: newBals.usdtBalance,
    }));
    setTransactions((prev) => [tx, ...prev]);

    const rate = balances.exchangeRateUsdtToInr || 100;
    const withdrawUsdt = tx.currency === 'USDT' ? tx.amount : Number((tx.amount / rate).toFixed(2));
    const dest = tx.destinationAddress || tx.note || 'User Payout Account';

    ApiService.requestWithdrawal({
      userId: user.id,
      email: user.email,
      amount: withdrawUsdt,
      address: dest,
    })
      .then((res) => {
        if (typeof res?.walletBalance === 'number') {
          setBalances((prev) => ({ ...prev, usdtBalance: res.walletBalance! }));
        }
        syncWalletFromServer(user);
      })
      .catch(() => {});
  };

  const handleActivatePlan = (planId: string) => {
    const plan = DEPOSIT_PLANS.find((p) => p.id === planId);
    if (!plan) return;

    const updatedUser: UserProfile = {
      ...user,
      activePlanId: plan.id,
      planName: plan.name,
      planStatus: 'active',
      vipTier: plan.name.split(' ')[0] as any,
      subscriptionDaysLeft: plan.validityDays,
      subscriptionStartDate: new Date().toISOString().split('T')[0],
    };

    setUser(updatedUser);
    ApiService.saveUser(updatedUser);

    ApiService.recordTransaction({
      userId: user.id,
      email: user.email,
      type: 'fd_investment',
      amountUsdt: plan.usdtAmount,
      status: 'completed',
      description: `${plan.name} Activation (${plan.usdtAmount} USDT)`,
      referenceId: 'PLAN' + Math.floor(100000 + Math.random() * 900000),
      planId: plan.id,
      planName: plan.name,
    })
      .then(() => syncWalletFromServer(updatedUser))
      .catch(() => {});
  };

  const handleClaimCommission = (amountInr: number) => {
    const rate = balances.exchangeRateUsdtToInr || 100;
    const amountUsdt = Number((amountInr / rate).toFixed(2));
    if (amountUsdt <= 0) return;

    try {
      localStorage.setItem('alienpay_unclaimed_running_comm', '0');
    } catch {}

    // Reset unclaimed running commission in Commission Center and reflect transferred balance in Main Wallet
    setBalances((prev) => ({
      ...prev,
      usdtBalance: Number((prev.usdtBalance + amountUsdt).toFixed(2)),
      todayEarnings: 0,
    }));

    setBankAccounts((prev) =>
      prev.map((acc) => {
        if ((acc.accumulatedCommission ?? 0) > 0) {
          ApiService.updateBankAccount(acc.id, {
            accumulatedCommission: 0,
            runningVolumeProcessed: acc.runningVolumeProcessed ?? 0,
          }).catch(() => {});
        }
        return {
          ...acc,
          accumulatedCommission: 0,
        };
      })
    );

    syncWalletFromServer(user);
  };

  // Centralized navigation handler
  const handleNavigate = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
  };

  // Keep latest navigation & modal states in a ref for system back button listeners
  const navStateRef = React.useRef({
    isAuthenticated,
    authMode,
    currentScreen,
    isDrawerOpen,
    depositModalOpen,
    withdrawModalOpen,
    selectedPlanForModal,
  });

  const isHandlingPopStateRef = React.useRef(false);

  useEffect(() => {
    navStateRef.current = {
      isAuthenticated,
      authMode,
      currentScreen,
      isDrawerOpen,
      depositModalOpen,
      withdrawModalOpen,
      selectedPlanForModal,
    };
  }, [
    isAuthenticated,
    authMode,
    currentScreen,
    isDrawerOpen,
    depositModalOpen,
    withdrawModalOpen,
    selectedPlanForModal,
  ]);

  // Push a browser history entry with a distinct hash whenever a sub-screen, drawer, modal, or auth step opens
  // so Android WebView (webView.canGoBack() / webView.goBack()) triggers popstate instead of closing the app
  useEffect(() => {
    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      return;
    }

    let activeHash = '';
    if (selectedPlanForModal !== null) {
      activeHash = '#plan-modal';
    } else if (depositModalOpen) {
      activeHash = '#deposit';
    } else if (withdrawModalOpen) {
      activeHash = '#withdraw';
    } else if (isDrawerOpen) {
      activeHash = '#menu';
    } else if (isAuthenticated && currentScreen !== 'dashboard') {
      activeHash = `#${currentScreen}`;
    } else if (!isAuthenticated && authMode !== 'welcome') {
      activeHash = `#${authMode}`;
    }

    if (activeHash && window.location.hash !== activeHash) {
      try {
        window.history.pushState({ alienPayApp: true, hash: activeHash }, '', activeHash);
      } catch {}
    }
  }, [
    isAuthenticated,
    authMode,
    currentScreen,
    isDrawerOpen,
    depositModalOpen,
    withdrawModalOpen,
    selectedPlanForModal,
  ]);

  // Android soft button & hardware/system back handler
  const handleAndroidBack = (): boolean => {
    const state = navStateRef.current;

    if (state.selectedPlanForModal !== null) {
      setSelectedPlanForModal(null);
      return true;
    }
    if (state.depositModalOpen) {
      setDepositModalOpen(false);
      return true;
    }
    if (state.withdrawModalOpen) {
      setWithdrawModalOpen(false);
      return true;
    }
    if (state.isDrawerOpen) {
      setIsDrawerOpen(false);
      return true;
    }
    if (state.isAuthenticated && state.currentScreen !== 'dashboard') {
      setCurrentScreen('dashboard');
      return true;
    }
    if (!state.isAuthenticated && state.authMode !== 'welcome') {
      setAuthMode('welcome');
      return true;
    }
    return false;
  };

  useEffect(() => {
    (window as any).__alienPayHandleBack = handleAndroidBack;

    const onPopState = () => {
      isHandlingPopStateRef.current = true;
      const handled = handleAndroidBack();

      // If after closing a modal/drawer we are still on a non-dashboard screen,
      // keep a history entry so the next Back press returns to Dashboard
      const s = navStateRef.current;
      const stillInSubScreen =
        handled &&
        (s.selectedPlanForModal !== null ||
          s.depositModalOpen ||
          s.withdrawModalOpen ||
          s.isDrawerOpen) &&
        s.isAuthenticated &&
        s.currentScreen !== 'dashboard';

      if (stillInSubScreen) {
        try {
          window.history.pushState(
            { alienPayApp: true, hash: `#${s.currentScreen}` },
            '',
            `#${s.currentScreen}`
          );
        } catch {}
      }
    };

    const onHardwareBackButton = (e: Event) => {
      e.preventDefault();
      handleAndroidBack();
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('backbutton', onHardwareBackButton, false);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('backbutton', onHardwareBackButton, false);
    };
  }, []);

  const handleAndroidHome = () => {
    setIsDrawerOpen(false);
    setCurrentScreen('dashboard');
  };

  const handleAndroidRecent = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const isStandaloneAdminPortal =
    (import.meta as any).env?.VITE_APP_MODE === 'admin' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') ||
        window.location.search.includes('mode=admin')));

  const [showLandingWebsite, setShowLandingWebsite] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const appMode = (import.meta as any).env?.VITE_APP_MODE;
    if (appMode === 'admin' || window.location.pathname.startsWith('/admin') || window.location.search.includes('mode=admin')) {
      return false;
    }
    const ua = navigator.userAgent || '';
    const isApkWebView =
      /;\s*wv\)/i.test(ua) ||
      /AlienPayAPK/i.test(ua) ||
      window.location.search.includes('apk=1') ||
      window.location.search.includes('native=1') ||
      window.location.search.includes('mode=app') ||
      window.location.pathname.startsWith('/app');
    if (isApkWebView) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (isStandaloneAdminPortal && typeof document !== 'undefined') {
      document.title = 'AlienPay Admin Control Panel';
      const manifestEl = document.getElementById('app-manifest') as HTMLLinkElement | null;
      if (manifestEl) {
        manifestEl.href = '/manifest-admin.json';
      }
    }
  }, [isStandaloneAdminPortal]);

  if (isStandaloneAdminPortal) {
    return (
      <AndroidFrame
        onBackPress={() => {}}
        onHomePress={() => {}}
        onRecentPress={() => {}}
        theme={theme}
        onToggleTheme={() => handleToggleTheme()}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="px-4 pt-2 flex justify-end">
            <PWAInstallButton label="Install Admin App" compact />
          </div>
          <AdminPanelScreen
            currentUser={user}
            onNavigate={() => {}}
            onUserUpdated={(updated) => {
              setUser(updated);
              ApiService.saveUser(updated);
              syncWalletFromServer(updated);
            }}
          />
        </div>
      </AndroidFrame>
    );
  }

  if (showLandingWebsite) {
    return (
      <AlienPayLandingPage
        apkDownloadUrl={(import.meta as any).env?.VITE_APK_DOWNLOAD_URL || '/AlienPay.apk'}
        liveAppUrl="https://alienpay-user.onrender.com"
        onOpenWebApp={(targetAuth) => {
          if (targetAuth && !isAuthenticated) {
            setAuthScreen(targetAuth);
          }
          setShowSplash(false);
          setShowLandingWebsite(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <AndroidFrame
      onBackPress={handleAndroidBack}
      onHomePress={handleAndroidHome}
      onRecentPress={handleAndroidRecent}
      theme={theme}
      onToggleTheme={() => handleToggleTheme()}
      onOpenWebsite={() => setShowLandingWebsite(true)}
      smsNotification={smsNotification}
      onDismissSmsNotification={() => setSmsNotification(null)}
    >
      {/* Splash Opening Screen with Centered Standard-Size AlienPay */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* Sliding Navbar Drawer (Always available when authenticated) */}
      {isAuthenticated && (
        <SlidingNavbar
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          user={user}
          balances={balances}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => handleToggleTheme()}
          selectedCurrency={selectedCurrency}
          onSelectCurrency={handleSelectCurrency}
        />
      )}

      {/* Main Body Routing */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex-1 shrink-0 flex flex-col">
            {authMode === 'welcome' ? (
              <WelcomeLandingScreen
                onGetStarted={() => setAuthMode('login')}
              />
            ) : authMode === 'login' ? (
              <LoginScreen
                onSuccess={handleAuthSuccess}
                onSwitchToSignup={() => setAuthMode('signup')}
                onForgotPassword={() => setAuthMode('forgot_password')}
                onBackToWelcome={() => setAuthMode('welcome')}
                onOpenApiConfig={() => {
                  setIsAuthenticated(true);
                  setCurrentScreen('settings');
                }}
              />
            ) : authMode === 'signup' ? (
              <SignupScreen
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={() => setAuthMode('login')}
                onBackToWelcome={() => setAuthMode('welcome')}
                onOpenApiConfig={() => {
                  setIsAuthenticated(true);
                  setCurrentScreen('settings');
                }}
              />
            ) : (
              <ForgotPasswordScreen
                onBackToLogin={() => setAuthMode('login')}
                onSuccess={() => setAuthMode('login')}
              />
            )}
          </div>
          <footer
            className="w-full py-3 px-4 text-center text-[10px] font-mono border-t shrink-0 select-none leading-relaxed"
            style={{
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-dim)',
              backgroundColor: 'var(--app-surface-subtle)',
            }}
          >
            <div>All Rights Reserved © 2026</div>
            <div>AlienPay Android v3.4.1</div>
          </footer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top Bar on Dashboard and Main Hub */}
          {currentScreen === 'dashboard' && (
            <TopBar
              user={user}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenProfile={() => setCurrentScreen('profile')}
              onOpenSettings={() => setCurrentScreen('settings')}
              theme={theme}
              onToggleTheme={() => handleToggleTheme()}
            />
          )}

          {/* Screen Content Render */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex-1 shrink-0 flex flex-col">
              {currentScreen === 'dashboard' && (
                <div className="flex-1 flex flex-col pb-4">
                  {/* Dual Balance Wallet Card (INR & USDT) */}
                  <WalletCard
                  balances={balances}
                  selectedCurrency={selectedCurrency}
                  onSelectCurrency={handleSelectCurrency}
                  onRefresh={() => {
                    // Sync rate or balances (1 USDT = 100 INR)
                    setBalances((b) => ({ ...b, exchangeRateUsdtToInr: 100.00 }));
                  }}
                  onDepositClick={(c) => {
                    setModalCurrency(c);
                    setDepositModalOpen(true);
                  }}
                  onWithdrawClick={(c) => {
                    setModalCurrency(c);
                    setWithdrawModalOpen(true);
                  }}
                />

                {/* 3. Quick Action Blocks (4 blocks in front as requested by user) */}
                <QuickActionBlocks
                  onNavigate={handleNavigate}
                  selectedCurrency={selectedCurrency}
                  onOpenDepositModal={(c) => {
                    setModalCurrency(c);
                    setDepositModalOpen(true);
                  }}
                  onOpenWithdrawModal={(c) => {
                    setModalCurrency(c);
                    setWithdrawModalOpen(true);
                  }}
                />

                {/* 4. Refer & Earn ₹10,000 INR Instantly Promo Card (Promote for Profit) */}
                <ReferralPromoCard
                  user={user}
                  onNavigate={handleNavigate}
                />

                {/* 5. Linked Bank Accounts Section with "+ Add Bank Account" Button (Requested by user) */}
                <BankAccountsSection
                  accounts={bankAccounts}
                  onAddAccount={handleAddBankAccount}
                  onDeleteAccount={handleDeleteBankAccount}
                  onSetPrimaryAccount={handleSetPrimaryBankAccount}
                  onToggleRunAccount={handleToggleRunBankAccount}
                  defaultHolderName={user.fullName}
                  onOpenPlans={() => setCurrentScreen('plans')}
                  onOpenCommission={() => setCurrentScreen('commission')}
                  hasActivePlan={user.planStatus === 'active' || !!user.activePlanId}
                />
              </div>
            )}

            {currentScreen === 'wallet' && (
              <WalletScreen
                balances={balances}
                transactions={transactions}
                onNavigate={handleNavigate}
                selectedCurrency={selectedCurrency}
                onOpenDeposit={(c) => {
                  setModalCurrency(c);
                  setDepositModalOpen(true);
                }}
                onOpenWithdraw={(c) => {
                  setModalCurrency(c);
                  setWithdrawModalOpen(true);
                }}
              />
            )}

            {currentScreen === 'plans' && (
              <div className="flex-1 flex flex-col pb-6 transition-colors duration-250">
                <div 
                  className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md transition-colors duration-250"
                  style={{
                    backgroundColor: 'var(--app-header-bg)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className="p-1.5 rounded-lg cursor-pointer text-xs font-semibold"
                    style={{ color: 'var(--app-text-secondary)' }}
                  >
                    ← Dashboard
                  </button>
                  <h1 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
                    VIP Subscription Plans
                  </h1>
                  <div className="w-8"></div>
                </div>
                <DepositPlans
                  activePlanId={user.activePlanId}
                  onSelectPlan={(plan) => setSelectedPlanForModal(plan)}
                  exchangeRate={balances.exchangeRateUsdtToInr}
                  onOpenCommission={() => handleNavigate('commission')}
                />
              </div>
            )}

            {currentScreen === 'refer' && (
              <ReferScreen
                user={user}
                balances={balances}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'commission' && (
              <CommissionScreen
                balances={balances}
                transactions={transactions}
                bankAccounts={bankAccounts}
                user={user}
                onNavigate={handleNavigate}
                onClaimCommission={handleClaimCommission}
              />
            )}

            {currentScreen === 'profile' && (
              <ProfileScreen
                user={user}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                onUpdateUser={(updated) => {
                  setUser(updated);
                  ApiService.saveUser(updated);
                }}
              />
            )}

            {currentScreen === 'settings' && (
              <SettingsScreen
                user={user}
                onUpdateUser={(updated) => {
                  setUser(updated);
                  ApiService.saveUser(updated);
                }}
                onNavigate={handleNavigate}
                onConfigUpdated={(cfg) => {
                  // ApiService updated
                }}
                theme={theme}
                onToggleTheme={(newTheme) => handleToggleTheme(newTheme)}
              />
            )}

            {currentScreen === 'support' && (
              <SupportScreen
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'deposit' && (
              <DepositScreen
                balances={balances}
                transactions={transactions}
                onNavigate={handleNavigate}
                onDepositSuccess={handleDepositSuccess}
                selectedCurrency={selectedCurrency}
              />
            )}

            {currentScreen === 'withdraw' && (
              <WithdrawScreen
                balances={balances}
                transactions={transactions}
                user={user}
                savedBankAccounts={bankAccounts}
                onNavigate={handleNavigate}
                onWithdrawSuccess={handleWithdrawSuccess}
                selectedCurrency={selectedCurrency}
              />
            )}

            {currentScreen === 'admin' && (
              <AdminPanelScreen
                currentUser={user}
                onNavigate={handleNavigate}
                onUserUpdated={(updated) => {
                  setUser(updated);
                  ApiService.saveUser(updated);
                  syncWalletFromServer(updated);
                }}
              />
            )}

              {currentScreen === 'landing' && (
                <WelcomeLandingScreen
                  onGetStarted={() => setCurrentScreen('dashboard')}
                />
              )}
            </div>

            {/* Global Copyright & Version Footer on All Pages */}
            <footer
              className="w-full py-3 px-4 mt-auto text-center text-[10px] font-mono border-t shrink-0 select-none leading-relaxed"
              style={{
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-dim)',
                backgroundColor: 'var(--app-surface-subtle)',
              }}
            >
              <div>All Rights Reserved © 2026</div>
              <div>AlienPay Android v3.4.1</div>
            </footer>
          </div>

          {/* Always Floating 24/7 Live Support Button (bottom-right) */}
          <FloatingSupportButton
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />

          {/* Bottom App Navigation Bar */}
          <BottomNavBar
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
        </div>
      )}

      {/* Floating Modals */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        defaultCurrency={modalCurrency}
        exchangeRate={balances.exchangeRateUsdtToInr}
        currentBalances={balances}
        onDepositSuccess={handleDepositSuccess}
        onNavigate={handleNavigate}
      />

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        defaultCurrency={modalCurrency}
        exchangeRate={balances.exchangeRateUsdtToInr}
        currentBalances={balances}
        user={user}
        savedBankAccounts={bankAccounts}
        onWithdrawSuccess={handleWithdrawSuccess}
        onNavigate={handleNavigate}
      />

      <PlanDetailModal
        plan={selectedPlanForModal}
        isOpen={!!selectedPlanForModal}
        onClose={() => setSelectedPlanForModal(null)}
        balances={balances}
        user={user}
        onActivateSuccess={handleActivatePlan}
        onOpenDeposit={(c) => {
          setModalCurrency(c);
          setDepositModalOpen(true);
        }}
        onOpenCommission={() => {
          setSelectedPlanForModal(null);
          handleNavigate('commission');
        }}
      />
    </AndroidFrame>
  );
}
