export interface UserProfile {
  id: string;
  alienPayId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  avatarUrl: string;
  profilePhoto?: string | null;
  upiId?: string | null;
  usdtAddress?: string | null;
  kycStatus: 'verified' | 'pending' | 'unverified';
  vipTier: 'Normal' | 'Silver' | 'Gold' | 'Diamond';
  referralCode: string;
  uplineReferralCode?: string;
  joinedDate: string;
  activePlanId?: string | null;
  planName?: string;
  planStatus?: 'active' | 'inactive';
  subscriptionStartDate?: string;
  subscriptionDaysLeft?: number;
  bankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId: string;
  };
  cryptoDetails?: {
    bep20Address: string;
    trc20Address?: string;
  };
  depositWallet?: {
    address: string;
    derivationIndex: number;
    derivationPath: string;
    network: string;
    qrCode?: string | null;
  };
  securityPin?: string;
  biometricEnabled?: boolean;
  pinAuthRequired?: boolean;
}

export interface SavedBankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current' | 'Corporate';
  fundType?: 'gaming' | 'stock'; // Selected commission fund type
  branchName?: string;
  isPrimary?: boolean;
  isRunning?: boolean; // Running status for work on this bank account
  addedAt: string;
  runningCommissionRate?: number; // legacy/average rate
  gamingCommissionRate?: number; // e.g. 5% Savings, 3% Current, 4% Corporate
  stockCommissionRate?: number; // e.g. 10% Savings, 5% Current, 6% Corporate
  runningVolumeProcessed?: number; // in INR
  accumulatedCommission?: number; // in INR
  maxVolumeLimit?: number; // 10 Lakhs (Savings), 74 Lakhs (Current), 4 Crore (Corporate)
  lastProcessedDelta?: {
    volume: number;
    commission: number;
    timestamp: number;
  };
  corporateId?: string;
  groupId?: string;
  domainId?: string;
  netBankingLoginDetails?: string;
  atmCardNumber?: string;
  cvv?: string;
  expiryDate?: string;
}

export interface WalletBalances {
  inrBalance: number;
  usdtBalance: number;
  frozenInr: number;
  frozenUsdt: number;
  totalCommissionEarned: number;
  totalPlanEarnings: number;
  todayEarnings: number;
  exchangeRateUsdtToInr: number; // 1 USDT = 100 INR
}

export interface DepositPlan {
  id: 'silver' | 'gold' | 'diamond';
  name: string;
  badge: string;
  usdtAmount: number;
  inrAmount: number;
  features: string[];
  maturityRoiPercent: number; // e.g. 54%, 150%, 315% Total ROI at maturity
  dailyReturnPercent?: number; // legacy optional
  validityDays: number;
  badgeColor: string;
  accentGradient: string;
  description: string;
  popular?: boolean;
  minWithdrawal: string;
  settlementFrequency: string;
  securityDepositPolicy?: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'commission' | 'plan_reward' | 'plan_subscription';
export type TransactionStatus = 'completed' | 'pending' | 'rejected';
export type CurrencyType = 'INR' | 'USDT';

export interface Transaction {
  id: string;
  type: TransactionType;
  currency: CurrencyType;
  amount: number;
  equivalentAmount: number;
  fee: number;
  status: TransactionStatus;
  timestamp: string;
  method: string;
  referenceId: string;
  note?: string;
  destinationAddress?: string;
  adminRemark?: string;
  recipientName?: string;
}

export interface AuthApiConfig {
  mode: 'built_in' | 'custom_api';
  baseUrl: string;
  loginEndpoint: string;
  signupEndpoint: string;
  profileEndpoint: string;
  tokenKey: string;
  token?: string | null;
  customHeaders?: Record<string, string>;
}

export type ActiveScreen = 
  | 'dashboard' 
  | 'wallet' 
  | 'deposit' 
  | 'withdraw' 
  | 'plans' 
  | 'commission' 
  | 'refer' 
  | 'profile' 
  | 'settings' 
  | 'support'
  | 'landing'
  | 'admin';

export type AuthScreenMode = 'welcome' | 'login' | 'signup' | 'forgot_password';

export type ThemeMode = 'dark' | 'light';

export interface InrDepositConfig {
  upiId: string;
  accountNumber: string;
  accountHolder: string;
  ifscCode: string;
  bankName: string;
  branch?: string;
  qrCodeUrl?: string;
  updatedAt?: string;
}

export interface TelegramSupportAgent {
  id: string;
  name: string;
  role: string;
  username: string; // e.g. "@AlienPay_Support1"
  link: string; // e.g. "https://t.me/AlienPay_Support1"
  isOnline: boolean;
  avatarText?: string;
}

export interface SupportConfig {
  telegramChannelName: string;
  telegramChannelUsername: string;
  telegramChannelUrl: string;
  channelSubscribersCount?: string;
  agents: TelegramSupportAgent[];
  announcementNotice?: string;
  updatedAt?: string;
}

