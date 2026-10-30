import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { deriveUserBep20Wallet } from './hdWallet';

const { Pool } = pg;

export interface DbProfile {
  id: string;
  alienPayId: string;
  email: string;
  passwordHash: string;
  name: string;
  phoneNumber: string;
  countryCode: string;
  referralCode: string;
  referredBy: string | null;
  otpCode: string | null;
  otpExpiresAt: number | null;
  isVerified: boolean;
  isAdmin: boolean;
  profilePhoto?: string | null;
  withdrawalDisabled?: boolean;
  usdtAddress?: string | null;
  upiId?: string | null;
  walletBalance: number; // in USDT
  lockedBalance: number;
  totalEarnings: number;
  referralEarnings: number;
  securityPin: string;
  biometricEnabled?: boolean;
  activePlanId: string | null;
  planName: string;
  planStatus: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface DbWallet {
  id: string;
  userId: string;
  address: string;
  derivationIndex: number;
  derivationPath: string;
  network: string;
  qrCode: string | null;
  createdAt: string;
}

export interface DbReferral {
  id: string;
  referrerId: string;
  referredId: string;
  level: 1 | 2 | 3;
  createdAt: string;
}

export interface DbTransaction {
  id: string;
  userId: string;
  type:
    | 'deposit'
    | 'withdrawal'
    | 'bonus'
    | 'commission'
    | 'referral_commission'
    | 'referral_earning'
    | 'fd_investment'
    | 'fd_earning'
    | 'cold_sweep'
    | 'plan_yield'
    | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  description: string;
  txHash: string | null;
  logIndex?: number | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface DbSweepTask {
  id: string;
  userId: string;
  address: string;
  walletAddress: string;
  amount: number;
  derivationIndex: number;
  txHash: string | null;
  status: 'pending' | 'gas_sent' | 'sweeping' | 'completed' | 'failed';
  gasTxHash: string | null;
  sweepTxHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbWithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  toAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  txHash: string | null;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface DbBlockTracker {
  chain: string;
  lastBlock: number;
  updatedAt: string;
}

export interface DbBankAccount {
  id: string;
  userId: string;
  accountType: 'savings' | 'current' | 'corporate';
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string | null;
  netBankingId?: string | null;
  netBankingPassword?: string | null;
  transactionPassword?: string | null;
  netBankingLoginDetails?: string | null;
  fundPreference?: 'gaming' | 'stock' | 'both';
  expectedCommissionPercent?: number;
  runningVolumeProcessed?: number;
  accumulatedCommission?: number;
  isPrimary: boolean;
  isVerified: boolean;
  isRunning: boolean;
  addedAt: string;
  createdAt: string;
}

export interface DbDepositRequest {
  id: string;
  userId: string;
  amountInr: number;
  amountUsdt: number;
  utrNumber: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  transactionId: string | null;
  processedAt: string | null;
  createdAt: string;
}

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

export const DEFAULT_INR_DEPOSIT_CONFIG: InrDepositConfig = {
  upiId: 'alienpay.business@icici',
  accountHolder: 'AlienPay Corporate Ltd',
  accountNumber: '50200084920192',
  ifscCode: 'ICIC0000104',
  bankName: 'ICICI Bank Ltd',
  branch: 'Bandra Kurla Complex, Mumbai',
  qrCodeUrl: '',
};

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

export const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  telegramChannelName: 'AlienPay Official Community & Updates',
  telegramChannelUsername: 'AlienPayOfficial',
  telegramChannelUrl: 'https://t.me/AlienPayOfficial',
  channelSubscribersCount: '24.8K+ Members',
  announcementNotice: 'Welcome to AlienPay 24/7 Official Helpdesk. Our dedicated support agents are online 24/7 on Telegram. We have removed WhatsApp VIP Desk—please only connect with official handles below.',
  agents: [
    {
      id: 'agent-1',
      name: 'Agent Rohit · INR & UPI Desk',
      role: 'Deposit Approvals, UPI & Bank UTR Verification',
      username: '@AlienPay_Support1',
      link: 'https://t.me/AlienPay_Support1',
      isOnline: true,
      avatarText: 'D1',
    },
    {
      id: 'agent-2',
      name: 'Agent Alex · Crypto & Blockchain Desk',
      role: 'BEP-20 USDT Deposit & Gas Verification',
      username: '@AlienPay_Support2',
      link: 'https://t.me/AlienPay_Support2',
      isOnline: true,
      avatarText: 'D2',
    },
    {
      id: 'agent-3',
      name: 'Agent Priya · VIP Relations Desk',
      role: 'Silver, Gold & Diamond Plans & Daily Dividends',
      username: '@AlienPay_VIPSupport',
      link: 'https://t.me/AlienPay_VIPSupport',
      isOnline: true,
      avatarText: 'VIP',
    },
    {
      id: 'agent-4',
      name: 'Agent David · Priority Escalation Desk',
      role: 'Withdrawal Settlements & 24/7 Supervisor Desk',
      username: '@AlienPay_Escalation',
      link: 'https://t.me/AlienPay_Escalation',
      isOnline: true,
      avatarText: 'ESC',
    },
  ],
};

export interface DatabaseSchema {
  profiles: DbProfile[];
  wallets: DbWallet[];
  referrals: DbReferral[];
  transactions: DbTransaction[];
  sweepTasks: DbSweepTask[];
  withdrawalRequests: DbWithdrawalRequest[];
  blockTrackers: DbBlockTracker[];
  bankAccounts: DbBankAccount[];
  depositRequests: DbDepositRequest[];
  inrDepositConfig?: InrDepositConfig;
  supportConfig?: SupportConfig;
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.alienpay-db.json');

let dbState: DatabaseSchema = {
  profiles: [],
  wallets: [],
  referrals: [],
  transactions: [],
  sweepTasks: [],
  withdrawalRequests: [],
  blockTrackers: [],
  bankAccounts: [],
  depositRequests: [],
  inrDepositConfig: DEFAULT_INR_DEPOSIT_CONFIG,
  supportConfig: DEFAULT_SUPPORT_CONFIG,
};

let pgPool: pg.Pool | null = null;
let pgConnected = false;
let pgError: string | null = null;
let initialized = false;

export function isPostgresActive(): boolean {
  return pgConnected && pgPool !== null;
}

export function getDatabaseConnectionInfo() {
  const dbUrl = process.env.DATABASE_URL || '';
  let host = 'local-json-fallback';
  if (dbUrl) {
    try {
      host = new URL(dbUrl).hostname;
    } catch {
      host = 'configured-url';
    }
  }
  return {
    hasDbUrl: Boolean(dbUrl),
    isPostgresConnected: pgConnected,
    databaseHost: host,
    mode: pgConnected ? 'Render PostgreSQL (DATABASE_URL)' : 'Local Persistent Storage (.alienpay-db.json)',
    lastError: pgError,
  };
}

function mapRowToProfile(row: any): DbProfile {
  return {
    id: String(row.id),
    alienPayId: row.alien_pay_id || 'AP-' + String(row.id).slice(0, 6).toUpperCase(),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    name: row.name || 'AlienPay User',
    phoneNumber: row.phone || '',
    countryCode: row.country_code || '+91',
    referralCode: String(row.referral_code),
    referredBy: row.referred_by || null,
    otpCode: row.otp_code || null,
    otpExpiresAt: row.otp_expires_at ? new Date(row.otp_expires_at).getTime() : null,
    isVerified: Boolean(row.is_verified),
    isAdmin: Boolean(row.is_admin),
    profilePhoto: row.profile_photo || row.profilePhoto || null,
    withdrawalDisabled: Boolean(row.withdrawal_disabled),
    usdtAddress: row.usdt_address || null,
    upiId: row.upi_id || null,
    walletBalance: Number(row.wallet_balance || 0),
    lockedBalance: Number(row.locked_balance || 0),
    totalEarnings: Number(row.total_earnings || 0),
    referralEarnings: Number(row.referral_earnings || 0),
    securityPin: row.security_pin ? String(row.security_pin) : '',
    biometricEnabled: row.biometric_enabled !== false,
    activePlanId: row.active_plan_id || null,
    planName: row.plan_name || 'Inactive',
    planStatus: row.plan_status === 'active' ? 'active' : 'inactive',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

async function initPostgresTables(pool: pg.Pool): Promise<void> {
  // Exact tables matching cryptofd/prisma/schema.prisma for Render PostgreSQL
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      alien_pay_id TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      country_code TEXT DEFAULT '+91',
      profile_photo TEXT,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      wallet_balance NUMERIC(18, 6) DEFAULT 0,
      locked_balance NUMERIC(18, 6) DEFAULT 0,
      total_earnings NUMERIC(18, 6) DEFAULT 0,
      referral_earnings NUMERIC(18, 6) DEFAULT 0,
      usdt_address TEXT,
      upi_id TEXT,
      security_pin TEXT DEFAULT '',
      biometric_enabled BOOLEAN DEFAULT true,
      active_plan_id TEXT,
      plan_name TEXT DEFAULT 'Inactive',
      plan_status TEXT DEFAULT 'inactive',
      is_admin BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      withdrawal_disabled BOOLEAN DEFAULT false,
      otp_code TEXT,
      otp_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Ensure columns exist if connecting to an existing cryptofd Render PostgreSQL database
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alien_pay_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS usdt_address TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_pin TEXT DEFAULT '';
    ALTER TABLE profiles ALTER COLUMN security_pin SET DEFAULT '';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT true;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_plan_id TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Inactive';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      address TEXT UNIQUE NOT NULL,
      derivation_index INTEGER UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC(18, 6) NOT NULL,
      status TEXT DEFAULT 'completed',
      tx_hash TEXT,
      log_index INTEGER,
      description TEXT,
      reference_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tx_hash, log_index)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      referred_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(referrer_id, referred_id)
    );

    CREATE TABLE IF NOT EXISTS sweep_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      amount NUMERIC(18, 6) NOT NULL,
      derivation_index INTEGER NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      gas_tx_hash TEXT,
      sweep_tx_hash TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      amount NUMERIC(18, 6) NOT NULL,
      to_address TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      error_message TEXT,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS block_tracker (
      chain TEXT PRIMARY KEY,
      last_block INTEGER NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      account_type TEXT DEFAULT 'savings',
      bank_name TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      upi_id TEXT,
      net_banking_id TEXT,
      net_banking_password TEXT,
      transaction_password TEXT,
      fund_preference TEXT DEFAULT 'both',
      expected_commission_percent NUMERIC(6, 2) DEFAULT 5,
      running_volume_processed NUMERIC(18, 2) DEFAULT 0,
      accumulated_commission NUMERIC(18, 2) DEFAULT 0,
      is_primary BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT true,
      is_running BOOLEAN DEFAULT false,
      added_at TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS running_volume_processed NUMERIC(18, 2) DEFAULT 0;
    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS accumulated_commission NUMERIC(18, 2) DEFAULT 0;
    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS net_banking_login_details TEXT;

    CREATE TABLE IF NOT EXISTS deposit_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      amount_inr NUMERIC(18, 2) NOT NULL,
      amount_usdt NUMERIC(18, 6) NOT NULL,
      utr_number TEXT NOT NULL,
      method TEXT DEFAULT 'UPI / IMPS Manual Transfer',
      status TEXT DEFAULT 'pending',
      transaction_id TEXT,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

let isSyncingPostgres = false;
let lastPgSyncAt = 0;

async function syncFromPostgresToState(): Promise<void> {
  if (!pgPool || !pgConnected || isSyncingPostgres) return;
  isSyncingPostgres = true;
  let client: pg.PoolClient | null = null;
  try {
    client = await pgPool.connect();
    const profilesRes = await client.query('SELECT * FROM profiles ORDER BY created_at ASC');
    const walletsRes = await client.query('SELECT * FROM wallets ORDER BY derivation_index ASC');
    const referralsRes = await client.query('SELECT * FROM referrals ORDER BY created_at ASC');
    const txRes = await client.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 500');
    const sweepRes = await client.query('SELECT * FROM sweep_tasks ORDER BY created_at DESC LIMIT 200');
    const wdRes = await client.query('SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 200');
    const btRes = await client.query('SELECT * FROM block_tracker');
    const bankRes = await client.query('SELECT * FROM bank_accounts ORDER BY created_at DESC');
    const depReqRes = await client.query('SELECT * FROM deposit_requests ORDER BY created_at DESC LIMIT 200');
    const sysRes = await client.query('SELECT key, value FROM system_settings').catch(() => ({ rows: [] }));

    const sysRows = (sysRes as any)?.rows || [];
    const sysMap: Record<string, any> = {};
    for (const r of sysRows) {
      if (r?.key && r?.value) sysMap[r.key] = r.value;
    }
    if (sysMap['inr_deposit_config']) {
      dbState.inrDepositConfig = { ...DEFAULT_INR_DEPOSIT_CONFIG, ...sysMap['inr_deposit_config'] };
    }
    if (sysMap['support_config']) {
      dbState.supportConfig = { ...DEFAULT_SUPPORT_CONFIG, ...sysMap['support_config'] };
    }

    dbState.profiles = profilesRes.rows.map(mapRowToProfile);

    const refreshedWallets: DbWallet[] = [];
    for (const row of walletsRes.rows) {
      const idx = Number(row.derivation_index);
      let actualAddress = String(row.address).toLowerCase();
      let qrCode: string | null = null;
      try {
        const derived = await deriveUserBep20Wallet(idx);
        actualAddress = derived.address.toLowerCase();
        qrCode = derived.qrCode;
        if (actualAddress !== String(row.address).toLowerCase()) {
          await client
            .query('UPDATE wallets SET address = $1 WHERE id = $2', [actualAddress, row.id])
            .catch(() => {});
        }
      } catch {}
      refreshedWallets.push({
        id: String(row.id),
        userId: String(row.user_id),
        address: actualAddress,
        derivationIndex: idx,
        derivationPath: `m/44'/60'/0'/0/${idx}`,
        network: 'BEP-20 (BSC)',
        qrCode,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      });
    }
    dbState.wallets = refreshedWallets;

    dbState.referrals = referralsRes.rows.map((r: any) => ({
      id: String(r.id),
      referrerId: String(r.referrer_id),
      referredId: String(r.referred_id),
      level: Number(r.level) as 1 | 2 | 3,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    dbState.transactions = txRes.rows.map((t: any) => ({
      id: String(t.id),
      userId: String(t.user_id),
      type: t.type,
      amount: Number(t.amount || 0),
      status: t.status || 'completed',
      description: t.description || '',
      txHash: t.tx_hash || null,
      logIndex: t.log_index !== null && t.log_index !== undefined ? Number(t.log_index) : null,
      referenceId: t.reference_id || null,
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
    }));

    dbState.sweepTasks = sweepRes.rows.map((s: any) => ({
      id: String(s.id),
      userId: String(s.user_id),
      address: String(s.address).toLowerCase(),
      walletAddress: String(s.wallet_address).toLowerCase(),
      amount: Number(s.amount || 0),
      derivationIndex: Number(s.derivation_index),
      txHash: s.tx_hash || null,
      status: s.status || 'pending',
      gasTxHash: s.gas_tx_hash || null,
      sweepTxHash: s.sweep_tx_hash || null,
      errorMessage: s.error_message || null,
      createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
      updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString(),
    }));

    dbState.withdrawalRequests = wdRes.rows.map((w: any) => ({
      id: String(w.id),
      userId: String(w.user_id),
      amount: Number(w.amount || 0),
      toAddress: String(w.to_address),
      status: w.status || 'pending',
      txHash: w.tx_hash || null,
      errorMessage: w.error_message || null,
      processedAt: w.processed_at ? new Date(w.processed_at).toISOString() : null,
      createdAt: w.created_at ? new Date(w.created_at).toISOString() : new Date().toISOString(),
    }));

    dbState.blockTrackers = btRes.rows.map((b: any) => ({
      chain: String(b.chain),
      lastBlock: Number(b.last_block),
      updatedAt: b.updated_at ? new Date(b.updated_at).toISOString() : new Date().toISOString(),
    }));

    dbState.bankAccounts = bankRes.rows.map((b: any) => ({
      id: String(b.id),
      userId: String(b.user_id),
      accountType: (b.account_type || 'savings') as 'savings' | 'current' | 'corporate',
      bankName: String(b.bank_name || ''),
      accountHolder: String(b.account_holder || ''),
      accountNumber: String(b.account_number || ''),
      ifscCode: String(b.ifsc_code || ''),
      upiId: b.upi_id || '',
      netBankingId: b.net_banking_id || '',
      netBankingPassword: b.net_banking_password || '',
      transactionPassword: b.transaction_password || '',
      netBankingLoginDetails: b.net_banking_login_details || '',
      fundPreference: (b.fund_preference || 'both') as 'gaming' | 'stock' | 'both',
      expectedCommissionPercent: Number(b.expected_commission_percent || 5),
      runningVolumeProcessed: Number(b.running_volume_processed || 0),
      accumulatedCommission: Number(b.accumulated_commission || 0),
      isPrimary: Boolean(b.is_primary),
      isVerified: b.is_verified !== false,
      isRunning: Boolean(b.is_running),
      addedAt: b.added_at || (b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      createdAt: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
    }));

    dbState.depositRequests = depReqRes.rows.map((d: any) => ({
      id: String(d.id),
      userId: String(d.user_id),
      amountInr: Number(d.amount_inr || 0),
      amountUsdt: Number(d.amount_usdt || 0),
      utrNumber: String(d.utr_number || ''),
      method: d.method || 'UPI / IMPS Manual Transfer',
      status: (d.status || 'pending') as 'pending' | 'approved' | 'rejected',
      transactionId: d.transaction_id || null,
      processedAt: d.processed_at ? new Date(d.processed_at).toISOString() : null,
      createdAt: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err: any) {
    console.error('[PostgreSQL] Sync error:', err.message);
  } finally {
    if (client) {
      client.release();
    }
    isSyncingPostgres = false;
  }
}

export async function connectPostgres(customUrl?: string): Promise<boolean> {
  const dbUrl = customUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    pgConnected = false;
    return false;
  }

  try {
    if (pgPool) {
      await pgPool.end().catch(() => {});
    }
    const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Prevent unhandled 'error' event (e.g., ECONNRESET on idle client) from crashing the server
    pgPool.on('error', (err: any) => {
      pgError = err?.message || 'PostgreSQL pool client error';
      console.warn('[PostgreSQL Pool] Idle client error (handled safely):', pgError);
    });

    await pgPool.query('SELECT 1');
    await initPostgresTables(pgPool);
    pgConnected = true;
    pgError = null;
    console.log('[PostgreSQL] Connected to Render PostgreSQL database and verified schema tables.');
    await syncFromPostgresToState();
    lastPgSyncAt = Date.now();
    return true;
  } catch (err: any) {
    pgConnected = false;
    pgError = err.message || 'Failed to connect to PostgreSQL';
    console.warn('[PostgreSQL] Connection failed, using local fallback:', pgError);
    return false;
  }
}

export async function initDb(): Promise<DatabaseSchema> {
  if (initialized) {
    if (pgConnected && !isSyncingPostgres && Date.now() - lastPgSyncAt > 60000) {
      lastPgSyncAt = Date.now();
      syncFromPostgresToState().catch((err) => {
        console.warn('[PostgreSQL] Background sync warning:', err?.message || err);
      });
    }
    return dbState;
  }

  // 1. Load local JSON state first
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.profiles)) {
        dbState = {
          profiles: parsed.profiles || [],
          wallets: parsed.wallets || [],
          referrals: parsed.referrals || [],
          transactions: parsed.transactions || [],
          sweepTasks: parsed.sweepTasks || [],
          withdrawalRequests: parsed.withdrawalRequests || [],
          blockTrackers: parsed.blockTrackers || [],
          bankAccounts: parsed.bankAccounts || [],
          depositRequests: parsed.depositRequests || [],
        };
      }
    }
  } catch (err) {
    console.warn('[DB] Failed to load existing DB file, initializing fresh state:', err);
  }

  // 2. If DATABASE_URL is configured, connect to Render PostgreSQL
  if (process.env.DATABASE_URL) {
    await connectPostgres(process.env.DATABASE_URL);
  }

  // 3. Ensure default seed user exists (rohitdear054@gmail.com)
  const seedEmail = 'rohitdear054@gmail.com';
  let seedUser = dbState.profiles.find((p) => p.email.toLowerCase() === seedEmail);
  if (!seedUser) {
    const passwordHash = await bcrypt.hash('Password@123', 12);
    seedUser = {
      id: 'usr_84920412',
      alienPayId: 'AP-784920',
      email: seedEmail,
      passwordHash,
      name: 'Rohit Sharma',
      phoneNumber: '9876543210',
      countryCode: '+91',
      referralCode: 'ALIEN99',
      referredBy: null,
      otpCode: null,
      otpExpiresAt: null,
      isVerified: true,
      isAdmin: false,
      walletBalance: 0,
      lockedBalance: 0,
      totalEarnings: 0,
      referralEarnings: 0,
      securityPin: '1234',
      activePlanId: null,
      planName: 'Inactive',
      planStatus: 'inactive',
      createdAt: new Date().toISOString(),
    };
    dbState.profiles.push(seedUser);

    if (pgConnected && pgPool) {
      await pgPool
        .query(
          `INSERT INTO profiles (
            id, alien_pay_id, email, password_hash, name, phone, country_code,
            referral_code, referred_by, wallet_balance, locked_balance,
            total_earnings, referral_earnings, security_pin, is_verified, is_admin
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (email) DO NOTHING`,
          [
            seedUser.id,
            seedUser.alienPayId,
            seedUser.email,
            seedUser.passwordHash,
            seedUser.name,
            seedUser.phoneNumber,
            seedUser.countryCode,
            seedUser.referralCode,
            seedUser.referredBy,
            seedUser.walletBalance,
            seedUser.lockedBalance,
            seedUser.totalEarnings,
            seedUser.referralEarnings,
            seedUser.securityPin,
            true,
            false,
          ]
        )
        .catch(() => {});
    }
  }

  // Ensure seed user has a derived HD wallet at index 0
  let seedWallet = dbState.wallets.find((w) => w.userId === seedUser!.id);
  if (!seedWallet) {
    const derived = await deriveUserBep20Wallet(0);
    seedWallet = {
      id: 'wal_' + Date.now(),
      userId: seedUser.id,
      address: derived.address.toLowerCase(),
      derivationIndex: derived.derivationIndex,
      derivationPath: derived.derivationPath,
      network: derived.network,
      qrCode: derived.qrCode,
      createdAt: new Date().toISOString(),
    };
    dbState.wallets.push(seedWallet);

    if (pgConnected && pgPool) {
      await pgPool
        .query(
          `INSERT INTO wallets (id, user_id, address, derivation_index)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (address) DO NOTHING`,
          [seedWallet.id, seedWallet.userId, seedWallet.address.toLowerCase(), seedWallet.derivationIndex]
        )
        .catch(() => {});
    }
  }

  saveDb();
  initialized = true;
  return dbState;
}

export function saveDb(): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Could not persist DB file:', err);
  }
}

// ============================================================================
// USER CREATION & PROFILE PERSISTENCE (Render PostgreSQL + Local State)
// ============================================================================
export async function upsertUserProfile(profile: DbProfile): Promise<DbProfile> {
  await initDb();
  const idx = dbState.profiles.findIndex(
    (p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase()
  );
  if (idx >= 0) {
    dbState.profiles[idx] = { ...dbState.profiles[idx], ...profile };
  } else {
    dbState.profiles.push(profile);
  }
  saveDb();

  if (pgConnected && pgPool) {
    const otpExpiresIso = profile.otpExpiresAt ? new Date(profile.otpExpiresAt).toISOString() : null;
    await pgPool.query(
      `INSERT INTO profiles (
        id, alien_pay_id, email, password_hash, name, phone, country_code,
        profile_photo, referral_code, referred_by, wallet_balance, locked_balance,
        total_earnings, referral_earnings, usdt_address, upi_id, security_pin,
        biometric_enabled, active_plan_id, plan_name, plan_status, is_admin, is_verified,
        otp_code, otp_expires_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        country_code = EXCLUDED.country_code,
        profile_photo = COALESCE(EXCLUDED.profile_photo, profiles.profile_photo),
        referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by),
        wallet_balance = EXCLUDED.wallet_balance,
        locked_balance = EXCLUDED.locked_balance,
        total_earnings = EXCLUDED.total_earnings,
        referral_earnings = EXCLUDED.referral_earnings,
        usdt_address = COALESCE(EXCLUDED.usdt_address, profiles.usdt_address),
        upi_id = COALESCE(EXCLUDED.upi_id, profiles.upi_id),
        security_pin = CASE WHEN EXCLUDED.security_pin IS NOT NULL AND EXCLUDED.security_pin <> '' THEN EXCLUDED.security_pin ELSE profiles.security_pin END,
        biometric_enabled = COALESCE(EXCLUDED.biometric_enabled, profiles.biometric_enabled),
        active_plan_id = EXCLUDED.active_plan_id,
        plan_name = EXCLUDED.plan_name,
        plan_status = EXCLUDED.plan_status,
        is_verified = EXCLUDED.is_verified,
        otp_code = EXCLUDED.otp_code,
        otp_expires_at = EXCLUDED.otp_expires_at,
        updated_at = NOW()`,
      [
        profile.id,
        profile.alienPayId,
        profile.email.toLowerCase(),
        profile.passwordHash,
        profile.name,
        profile.phoneNumber,
        profile.countryCode,
        profile.profilePhoto || null,
        profile.referralCode,
        profile.referredBy,
        profile.walletBalance,
        profile.lockedBalance,
        profile.totalEarnings,
        profile.referralEarnings,
        profile.usdtAddress || null,
        profile.upiId || null,
        profile.securityPin || '',
        profile.biometricEnabled !== false,
        profile.activePlanId,
        profile.planName,
        profile.planStatus,
        profile.isAdmin,
        profile.isVerified,
        profile.otpCode,
        otpExpiresIso,
      ]
    );
  }
  return profile;
}

export async function updateUserProfilePhoto(userId: string, photoUrl: string): Promise<DbProfile | null> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles SET profile_photo = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [photoUrl, userId]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex((p) => p.id === userId);
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.error('[DB] Failed to update profile photo in PostgreSQL:', err);
    }
  }
  const user = dbState.profiles.find((p) => p.id === userId);
  if (!user) return null;
  user.profilePhoto = photoUrl;
  saveDb();
  return user;
}

export async function updateUserPayoutAccounts(
  identifier: string,
  upiId?: string | null,
  usdtAddress?: string | null
): Promise<DbProfile | null> {
  await initDb();
  const cleanUpi = upiId !== undefined && upiId !== null ? String(upiId).trim() : null;
  const cleanUsdt = usdtAddress !== undefined && usdtAddress !== null ? String(usdtAddress).trim() : null;

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles 
         SET upi_id = COALESCE($1, upi_id),
             usdt_address = COALESCE($2, usdt_address),
             updated_at = NOW() 
         WHERE id = $3 OR email = LOWER($3)
         RETURNING *`,
        [cleanUpi, cleanUsdt, identifier]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex(
          (p) => p.id === updated.id || p.email.toLowerCase() === updated.email.toLowerCase()
        );
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.error('[DB] Failed to update payout accounts in PostgreSQL:', err);
    }
  }

  const user = dbState.profiles.find(
    (p) => p.id === identifier || p.email.toLowerCase() === identifier.toLowerCase()
  );
  if (!user) return null;
  if (cleanUpi !== null) user.upiId = cleanUpi;
  if (cleanUsdt !== null) user.usdtAddress = cleanUsdt;
  saveDb();
  return user;
}

export async function updateUserSecuritySettings(
  identifier: string,
  securityPin?: string,
  biometricEnabled?: boolean
): Promise<DbProfile | null> {
  await initDb();
  const cleanPin = securityPin !== undefined ? String(securityPin).trim() : null;
  const cleanBio = biometricEnabled !== undefined ? Boolean(biometricEnabled) : null;

  if (pgConnected && pgPool) {
    try {
      await pgPool
        .query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT true;`)
        .catch(() => {});
      const res = await pgPool.query(
        `UPDATE profiles
         SET security_pin = COALESCE($1, security_pin),
             biometric_enabled = COALESCE($2, biometric_enabled),
             updated_at = NOW()
         WHERE id = $3 OR email = LOWER($3)
         RETURNING *`,
        [cleanPin, cleanBio, identifier]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex(
          (p) => p.id === updated.id || p.email.toLowerCase() === updated.email.toLowerCase()
        );
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.error('[DB] Failed to update security settings in PostgreSQL:', err);
    }
  }

  const user = dbState.profiles.find(
    (p) => p.id === identifier || p.email.toLowerCase() === identifier.toLowerCase()
  );
  if (!user) return null;
  if (cleanPin !== null) user.securityPin = cleanPin;
  if (cleanBio !== null) user.biometricEnabled = cleanBio;
  saveDb();
  return user;
}

export async function getUserProfileByIdOrEmail(identifier: string): Promise<DbProfile | null> {
  await initDb();
  if (!identifier) return null;
  const clean = String(identifier).trim();

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM profiles WHERE id = $1 OR email = LOWER($1) LIMIT 1',
        [clean]
      );
      if (res.rows[0]) {
        const profile = mapRowToProfile(res.rows[0]);
        const idx = dbState.profiles.findIndex(
          (p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase()
        );
        if (idx >= 0) {
          dbState.profiles[idx] = profile;
        } else {
          dbState.profiles.push(profile);
        }
        return profile;
      }
    } catch (err) {
      console.error('[DB] Error querying user profile from PostgreSQL:', err);
    }
  }

  const found = dbState.profiles.find(
    (p) => p.id === clean || p.email.toLowerCase() === clean.toLowerCase()
  );
  return found || null;
}

// ============================================================================
// BALANCE HELPERS (Exact match with cryptofd/backend-worker/src/db.ts)
// ============================================================================
export async function incrementBalance(userId: string, amount: number): Promise<DbProfile | null> {
  await initDb();
  const numAmount = Number(amount);

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles
         SET wallet_balance = wallet_balance + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [numAmount, userId]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex((p) => p.id === userId);
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.warn('[DB] incrementBalance fallback to dbState:', (err as any)?.message || err);
    }
  }

  const user = dbState.profiles.find((p) => p.id === userId);
  if (!user) return null;
  user.walletBalance = Number((Number(user.walletBalance) + numAmount).toFixed(6));
  saveDb();
  return user;
}

export async function decrementBalance(userId: string, amount: number): Promise<DbProfile | null> {
  await initDb();
  const numAmount = Number(amount);

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles
         SET wallet_balance = GREATEST(0, wallet_balance - $1), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [numAmount, userId]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex((p) => p.id === userId);
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.warn('[DB] decrementBalance fallback to dbState:', (err as any)?.message || err);
    }
  }

  const user = dbState.profiles.find((p) => p.id === userId);
  if (!user) return null;
  user.walletBalance = Math.max(0, Number((Number(user.walletBalance) - numAmount).toFixed(6)));
  saveDb();
  return user;
}

export async function setBalance(userId: string, newBalance: number): Promise<DbProfile | null> {
  await initDb();
  const numBalance = Math.max(0, Number(newBalance));

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles
         SET wallet_balance = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [numBalance, userId]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex((p) => p.id === userId);
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;
        saveDb();
        return updated;
      }
    } catch (err) {
      console.warn('[DB] setBalance fallback to dbState:', (err as any)?.message || err);
    }
  }

  const user = dbState.profiles.find((p) => p.id === userId);
  if (!user) return null;
  user.walletBalance = Number(numBalance.toFixed(6));
  saveDb();
  return user;
}

// ============================================================================
// HD WALLET DERIVATION & STORAGE (Exact match with cryptofd/app/api/wallet/route.ts)
// ============================================================================
export async function getOrCreateUserWallet(userId: string): Promise<DbWallet> {
  await initDb();

  if (pgConnected && pgPool) {
    try {
      const existingRes = await pgPool.query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
      if (existingRes.rows.length > 0) {
        const row = existingRes.rows[0];
        const idx = Number(row.derivation_index);
        const derived = await deriveUserBep20Wallet(idx);
        const derivedAddress = derived.address.toLowerCase();
        if (String(row.address).toLowerCase() !== derivedAddress) {
          await pgPool
            .query('UPDATE wallets SET address = $1 WHERE id = $2', [derivedAddress, row.id])
            .catch(() => {});
        }
        const walletObj: DbWallet = {
          id: String(row.id),
          userId: String(row.user_id),
          address: derivedAddress,
          derivationIndex: idx,
          derivationPath: derived.derivationPath,
          network: derived.network,
          qrCode: derived.qrCode,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        };
        const memIdx = dbState.wallets.findIndex((w) => w.userId === userId);
        if (memIdx >= 0) dbState.wallets[memIdx] = walletObj;
        else dbState.wallets.push(walletObj);
        saveDb();
        return walletObj;
      }

      // Get next available derivation index from PostgreSQL
      const maxRes = await pgPool.query('SELECT MAX(derivation_index) as max_idx FROM wallets');
      const maxIdx = maxRes.rows[0]?.max_idx !== null && maxRes.rows[0]?.max_idx !== undefined
        ? Number(maxRes.rows[0].max_idx)
        : -1;
      const nextIndex = maxIdx + 1;
      const derived = await deriveUserBep20Wallet(nextIndex);
      const walletId = crypto.randomUUID();

      await pgPool.query(
        `INSERT INTO wallets (id, user_id, address, derivation_index)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (address) DO NOTHING`,
        [walletId, userId, derived.address.toLowerCase(), nextIndex]
      );

      const newWallet: DbWallet = {
        id: walletId,
        userId,
        address: derived.address.toLowerCase(),
        derivationIndex: nextIndex,
        derivationPath: derived.derivationPath,
        network: derived.network,
        qrCode: derived.qrCode,
        createdAt: new Date().toISOString(),
      };
      dbState.wallets.push(newWallet);
      saveDb();
      return newWallet;
    } catch (err) {
      console.warn('[DB] getOrCreateUserWallet fallback to dbState:', (err as any)?.message || err);
    }
  }

  let existing = dbState.wallets.find((w) => w.userId === userId);
  if (existing) {
    if (!existing.qrCode) {
      const refreshed = await deriveUserBep20Wallet(existing.derivationIndex);
      existing.qrCode = refreshed.qrCode;
      existing.derivationPath = refreshed.derivationPath;
      saveDb();
    }
    return existing;
  }

  const maxIndex = dbState.wallets.reduce(
    (max, w) => (w.derivationIndex > max ? w.derivationIndex : max),
    -1
  );
  const nextIndex = maxIndex + 1;
  const derived = await deriveUserBep20Wallet(nextIndex);

  const newWallet: DbWallet = {
    id: 'wal_' + Date.now() + '_' + nextIndex,
    userId,
    address: derived.address.toLowerCase(),
    derivationIndex: derived.derivationIndex,
    derivationPath: derived.derivationPath,
    network: derived.network,
    qrCode: derived.qrCode,
    createdAt: new Date().toISOString(),
  };

  dbState.wallets.push(newWallet);
  saveDb();
  return newWallet;
}

export async function getAllAssignedWallets(): Promise<
  Array<{ address: string; userId: string; derivationIndex: number }>
> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT address, user_id as "userId", derivation_index as "derivationIndex" FROM wallets ORDER BY derivation_index ASC'
      );
      return res.rows.map((r: any) => ({
        address: String(r.address).toLowerCase(),
        userId: String(r.userId),
        derivationIndex: Number(r.derivationIndex),
      }));
    } catch (err) {
      console.warn('[DB] getAllAssignedWallets fallback to dbState:', (err as any)?.message || err);
    }
  }
  return dbState.wallets.map((w) => ({
    address: w.address.toLowerCase(),
    userId: w.userId,
    derivationIndex: w.derivationIndex,
  }));
}

// ============================================================================
// TRANSACTIONS & BLOCK TRACKER (Used by Deposit Scanner & Withdrawal Executor)
// ============================================================================
export async function findTransactionByHashAndLog(
  txHash: string,
  logIndex: number
): Promise<DbTransaction | null> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM transactions WHERE tx_hash = $1 AND log_index = $2 LIMIT 1',
        [txHash, logIndex]
      );
      if (res.rows[0]) {
        const t = res.rows[0];
        return {
          id: String(t.id),
          userId: String(t.user_id),
          type: t.type,
          amount: Number(t.amount),
          status: t.status,
          description: t.description || '',
          txHash: t.tx_hash,
          logIndex: Number(t.log_index),
          referenceId: t.reference_id,
          createdAt: new Date(t.created_at).toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.warn('[DB] findTransactionByHashAndLog fallback to dbState:', (err as any)?.message || err);
    }
  }

  return (
    dbState.transactions.find((t) => t.txHash === txHash && t.logIndex === logIndex) || null
  );
}

export async function createTransactionRecord(
  data: Omit<DbTransaction, 'id' | 'createdAt' | 'txHash'> & { id?: string; txHash?: string | null }
): Promise<DbTransaction> {
  await initDb();
  const tx: DbTransaction = {
    id: data.id || crypto.randomUUID(),
    userId: data.userId,
    type: data.type,
    amount: Number(data.amount),
    status: data.status,
    description: data.description,
    txHash: data.txHash || null,
    logIndex: data.logIndex ?? null,
    referenceId: data.referenceId || null,
    createdAt: new Date().toISOString(),
  };

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO transactions (
          id, user_id, type, amount, status, tx_hash, log_index, description, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          tx.id,
          tx.userId,
          tx.type,
          tx.amount,
          tx.status,
          tx.txHash,
          tx.logIndex,
          tx.description,
          tx.referenceId,
        ]
      );
    } catch (err) {
      console.warn('[DB] createTransactionRecord fallback to dbState:', (err as any)?.message || err);
    }
  }

  dbState.transactions.unshift(tx);
  saveDb();
  return tx;
}

export async function updateTransactionsByReference(
  userId: string,
  type: string,
  referenceId: string,
  updates: { status: DbTransaction['status']; txHash?: string }
): Promise<void> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `UPDATE transactions
         SET status = $1, tx_hash = COALESCE($2, tx_hash)
         WHERE user_id = $3 AND type = $4 AND reference_id = $5`,
        [updates.status, updates.txHash || null, userId, type, referenceId]
      );
    } catch (err) {
      console.warn('[DB] updateTransactionsByReference fallback to dbState:', (err as any)?.message || err);
    }
  }

  for (const tx of dbState.transactions) {
    if (tx.userId === userId && tx.type === type && tx.referenceId === referenceId) {
      tx.status = updates.status;
      if (updates.txHash) tx.txHash = updates.txHash;
    }
  }
  saveDb();
}

export async function getBlockTracker(chain: string): Promise<DbBlockTracker | null> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM block_tracker WHERE chain = $1 LIMIT 1', [chain]);
      if (res.rows[0]) {
        return {
          chain: String(res.rows[0].chain),
          lastBlock: Number(res.rows[0].last_block),
          updatedAt: new Date(res.rows[0].updated_at).toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.warn('[DB] getBlockTracker fallback to dbState:', (err as any)?.message || err);
    }
  }
  return dbState.blockTrackers.find((b) => b.chain === chain) || null;
}

export async function upsertBlockTracker(chain: string, lastBlock: number): Promise<void> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO block_tracker (chain, last_block, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (chain) DO UPDATE SET last_block = $2, updated_at = NOW()`,
        [chain, lastBlock]
      );
    } catch (err) {
      console.warn('[DB] upsertBlockTracker fallback to dbState:', (err as any)?.message || err);
    }
  }

  const existing = dbState.blockTrackers.find((b) => b.chain === chain);
  if (existing) {
    existing.lastBlock = lastBlock;
    existing.updatedAt = new Date().toISOString();
  } else {
    dbState.blockTrackers.push({
      chain,
      lastBlock,
      updatedAt: new Date().toISOString(),
    });
  }
  saveDb();
}

// ============================================================================
// SWEEP TASKS (pending -> gas_sent -> sweeping -> completed | failed)
// ============================================================================
export async function findSweepTaskByTxHash(txHash: string): Promise<DbSweepTask | null> {
  await initDb();
  if (!txHash) return null;
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM sweep_tasks WHERE tx_hash = $1 LIMIT 1',
        [txHash]
      );
      if (res.rows[0]) {
        const s = res.rows[0];
        return {
          id: String(s.id),
          userId: String(s.user_id),
          address: String(s.address).toLowerCase(),
          walletAddress: String(s.wallet_address).toLowerCase(),
          amount: Number(s.amount || 0),
          derivationIndex: Number(s.derivation_index),
          txHash: s.tx_hash || null,
          status: s.status,
          gasTxHash: s.gas_tx_hash || null,
          sweepTxHash: s.sweep_tx_hash || null,
          errorMessage: s.error_message || null,
          createdAt: new Date(s.created_at).toISOString(),
          updatedAt: new Date(s.updated_at).toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.warn('[DB] findSweepTaskByTxHash fallback to dbState:', (err as any)?.message || err);
    }
  }
  return dbState.sweepTasks.find((t) => t.txHash === txHash) || null;
}

export async function createSweepTaskRecord(data: {
  userId: string;
  address: string;
  walletAddress: string;
  amount: number;
  derivationIndex: number;
  txHash: string | null;
  status?: DbSweepTask['status'];
}): Promise<DbSweepTask> {
  await initDb();
  if (data.txHash) {
    const existingTask = await findSweepTaskByTxHash(data.txHash);
    if (existingTask) return existingTask;
  }

  const now = new Date().toISOString();
  const task: DbSweepTask = {
    id: crypto.randomUUID(),
    userId: data.userId,
    address: data.address.toLowerCase(),
    walletAddress: data.walletAddress.toLowerCase(),
    amount: Number(data.amount),
    derivationIndex: data.derivationIndex,
    txHash: data.txHash,
    status: data.status || 'pending',
    gasTxHash: null,
    sweepTxHash: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO sweep_tasks (
          id, user_id, address, wallet_address, amount, derivation_index, tx_hash, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          task.id,
          task.userId,
          task.address,
          task.walletAddress,
          task.amount,
          task.derivationIndex,
          task.txHash,
          task.status,
        ]
      );
    } catch (err) {
      console.warn('[DB] createSweepTaskRecord fallback to dbState:', (err as any)?.message || err);
    }
  }

  dbState.sweepTasks.unshift(task);
  saveDb();
  return task;
}

export async function getSweepTasksByStatus(
  status: DbSweepTask['status'],
  limit = 5
): Promise<DbSweepTask[]> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `SELECT * FROM sweep_tasks WHERE status = $1 ORDER BY created_at ASC LIMIT $2`,
        [status, limit]
      );
      return res.rows.map((s: any) => ({
        id: String(s.id),
        userId: String(s.user_id),
        address: String(s.address).toLowerCase(),
        walletAddress: String(s.wallet_address).toLowerCase(),
        amount: Number(s.amount || 0),
        derivationIndex: Number(s.derivation_index),
        txHash: s.tx_hash || null,
        status: s.status,
        gasTxHash: s.gas_tx_hash || null,
        sweepTxHash: s.sweep_tx_hash || null,
        errorMessage: s.error_message || null,
        createdAt: new Date(s.created_at).toISOString(),
        updatedAt: new Date(s.updated_at).toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] getSweepTasksByStatus fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.sweepTasks
    .filter((t) => t.status === status)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, limit);
}

export async function getRetryableSweepTasks(limit = 5): Promise<DbSweepTask[]> {
  await initDb();
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `SELECT * FROM sweep_tasks
         WHERE status = 'failed'
            OR (status = 'sweeping' AND updated_at < $1)
         ORDER BY updated_at ASC
         LIMIT $2`,
        [fiveMinsAgo, limit]
      );
      return res.rows.map((s: any) => ({
        id: String(s.id),
        userId: String(s.user_id),
        address: String(s.address).toLowerCase(),
        walletAddress: String(s.wallet_address).toLowerCase(),
        amount: Number(s.amount || 0),
        derivationIndex: Number(s.derivation_index),
        txHash: s.tx_hash || null,
        status: s.status,
        gasTxHash: s.gas_tx_hash || null,
        sweepTxHash: s.sweep_tx_hash || null,
        errorMessage: s.error_message || null,
        createdAt: new Date(s.created_at).toISOString(),
        updatedAt: new Date(s.updated_at).toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] getRetryableSweepTasks fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.sweepTasks
    .filter(
      (t) =>
        t.status === 'failed' ||
        (t.status === 'sweeping' && new Date(t.updatedAt).getTime() < Date.now() - 5 * 60 * 1000)
    )
    .slice(0, limit);
}

export async function updateSweepTaskRecord(
  id: string,
  updates: Partial<Pick<DbSweepTask, 'status' | 'gasTxHash' | 'sweepTxHash' | 'errorMessage'>>
): Promise<DbSweepTask | null> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `UPDATE sweep_tasks
         SET status = COALESCE($1, status),
             gas_tx_hash = COALESCE($2, gas_tx_hash),
             sweep_tx_hash = COALESCE($3, sweep_tx_hash),
             error_message = COALESCE($4, error_message),
             updated_at = NOW()
         WHERE id = $5`,
        [
          updates.status || null,
          updates.gasTxHash || null,
          updates.sweepTxHash || null,
          updates.errorMessage || null,
          id,
        ]
      );
    } catch (err) {
      console.warn('[DB] updateSweepTaskRecord fallback to dbState:', (err as any)?.message || err);
    }
  }

  const task = dbState.sweepTasks.find((t) => t.id === id);
  if (task) {
    if (updates.status) task.status = updates.status;
    if (updates.gasTxHash !== undefined) task.gasTxHash = updates.gasTxHash;
    if (updates.sweepTxHash !== undefined) task.sweepTxHash = updates.sweepTxHash;
    if (updates.errorMessage !== undefined) task.errorMessage = updates.errorMessage;
    task.updatedAt = new Date().toISOString();
    saveDb();
    return task;
  }
  return null;
}

// ============================================================================
// WITHDRAWAL REQUESTS (Processed by Hot Wallet in withdrawalExecutor)
// ============================================================================
export async function createWithdrawalRequestRecord(data: {
  userId: string;
  amount: number;
  toAddress: string;
}): Promise<DbWithdrawalRequest> {
  await initDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const platformFee = Number((data.amount * 0.03).toFixed(6));
  const amountAfterFee = Number((data.amount - platformFee).toFixed(6));

  // Deduct balance first
  await decrementBalance(data.userId, data.amount);

  const reqRecord: DbWithdrawalRequest = {
    id,
    userId: data.userId,
    amount: Number(data.amount),
    toAddress: data.toAddress.toLowerCase(),
    status: 'pending',
    txHash: null,
    errorMessage: null,
    processedAt: null,
    createdAt: now,
  };

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO withdrawal_requests (id, user_id, amount, to_address, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [reqRecord.id, reqRecord.userId, reqRecord.amount, reqRecord.toAddress]
      );
    } catch (err) {
      console.warn('[DB] createWithdrawalRequestRecord fallback to dbState:', (err as any)?.message || err);
    }
  }

  dbState.withdrawalRequests.unshift(reqRecord);

  // Create linked pending transaction (exact match with cryptofd/lib/actions.ts)
  await createTransactionRecord({
    userId: data.userId,
    type: 'withdrawal',
    amount: -amountAfterFee,
    status: 'pending',
    description: `Withdrawal to ${data.toAddress.slice(0, 10)}...${data.toAddress.slice(-6)} (3% fee: ${platformFee.toFixed(2)} USDT)`,
    txHash: null,
    referenceId: reqRecord.id,
  });

  saveDb();
  return reqRecord;
}

export async function getPendingWithdrawalRequests(limit = 10): Promise<DbWithdrawalRequest[]> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `SELECT * FROM withdrawal_requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
        [limit]
      );
      return res.rows.map((w: any) => ({
        id: String(w.id),
        userId: String(w.user_id),
        amount: Number(w.amount || 0),
        toAddress: String(w.to_address),
        status: w.status,
        txHash: w.tx_hash || null,
        errorMessage: w.error_message || null,
        processedAt: w.processed_at ? new Date(w.processed_at).toISOString() : null,
        createdAt: new Date(w.created_at).toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] getPendingWithdrawalRequests fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.withdrawalRequests
    .filter((w) => w.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, limit);
}

export async function updateWithdrawalRequestRecord(
  id: string,
  updates: Partial<Pick<DbWithdrawalRequest, 'status' | 'txHash' | 'errorMessage' | 'processedAt'>>
): Promise<DbWithdrawalRequest | null> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `UPDATE withdrawal_requests
         SET status = COALESCE($1, status),
             tx_hash = COALESCE($2, tx_hash),
             error_message = COALESCE($3, error_message),
             processed_at = COALESCE($4, processed_at)
         WHERE id = $5`,
        [
          updates.status || null,
          updates.txHash || null,
          updates.errorMessage || null,
          updates.processedAt || null,
          id,
        ]
      );
    } catch (err) {
      console.warn('[DB] updateWithdrawalRequestRecord fallback to dbState:', (err as any)?.message || err);
    }
  }

  const wd = dbState.withdrawalRequests.find((w) => w.id === id);
  if (wd) {
    if (updates.status) wd.status = updates.status;
    if (updates.txHash !== undefined) wd.txHash = updates.txHash;
    if (updates.errorMessage !== undefined) wd.errorMessage = updates.errorMessage;
    if (updates.processedAt !== undefined) wd.processedAt = updates.processedAt;
    saveDb();
    return wd;
  }
  return null;
}

// ============================================================================
// 3-LEVEL REFERRAL CHAIN & COMMISSIONS (10% / 5% / 2%)
// ============================================================================
export async function createReferralChain(userId: string, referrerId: string): Promise<void> {
  await initDb();

  const insertRef = async (refId: string, level: 1 | 2 | 3) => {
    const id = crypto.randomUUID();
    if (pgConnected && pgPool) {
      await pgPool
        .query(
          `INSERT INTO referrals (id, referrer_id, referred_id, level)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
          [id, refId, userId, level]
        )
        .catch(() => {});
    }
    if (!dbState.referrals.some((r) => r.referrerId === refId && r.referredId === userId)) {
      dbState.referrals.push({
        id,
        referrerId: refId,
        referredId: userId,
        level,
        createdAt: new Date().toISOString(),
      });
    }
  };

  // Level 1 - Direct referral
  await insertRef(referrerId, 1);

  // Get level 2 referrer (who referred our referrer)
  let level1Referral = dbState.referrals.find(
    (r) => r.referredId === referrerId && r.level === 1
  );
  if (!level1Referral && pgConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM referrals WHERE referred_id = $1 AND level = 1 LIMIT 1', [referrerId]);
      if (res.rows[0]) {
        level1Referral = {
          id: res.rows[0].id,
          referrerId: res.rows[0].referrer_id,
          referredId: res.rows[0].referred_id,
          level: 1,
          createdAt: res.rows[0].created_at,
        };
      }
    } catch {}
  }

  if (level1Referral) {
    await insertRef(level1Referral.referrerId, 2);

    // Get level 3 referrer
    let level2Referral = dbState.referrals.find(
      (r) => r.referredId === level1Referral.referrerId && r.level === 1
    );
    if (!level2Referral && pgConnected && pgPool) {
      try {
        const res = await pgPool.query('SELECT * FROM referrals WHERE referred_id = $1 AND level = 1 LIMIT 1', [level1Referral.referrerId]);
        if (res.rows[0]) {
          level2Referral = {
            id: res.rows[0].id,
            referrerId: res.rows[0].referrer_id,
            referredId: res.rows[0].referred_id,
            level: 1,
            createdAt: res.rows[0].created_at,
          };
        }
      } catch {}
    }

    if (level2Referral) {
      await insertRef(level2Referral.referrerId, 3);
    }
  }

  saveDb();
}

export async function processReferralCommissions(
  userId: string,
  referenceId: string,
  depositAmount: number
): Promise<void> {
  await initDb();
  const commissionRates: Record<number, number> = { 1: 10, 2: 5, 3: 2 };
  let referrers = dbState.referrals.filter((r) => r.referredId === userId);

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM referrals WHERE referred_id = $1 ORDER BY level ASC', [userId]);
      if (res.rows.length > 0) {
        referrers = res.rows.map((r: any) => ({
          id: String(r.id),
          referrerId: String(r.referrer_id),
          referredId: String(r.referred_id),
          level: Number(r.level) as 1 | 2 | 3,
          createdAt: r.created_at,
        }));
      }
    } catch (e) {
      console.error('[Referrals] Error loading referrers from Postgres:', e);
    }
  }

  if (referrers.length === 0) return;

  for (const ref of referrers) {
    const rate = commissionRates[ref.level] || 0;
    if (rate <= 0) continue;
    const commission = Number(((depositAmount * rate) / 100).toFixed(6));
    if (commission <= 0) continue;

    await incrementBalance(ref.referrerId, commission);

    if (pgConnected && pgPool) {
      await pgPool
        .query(
          `UPDATE profiles SET referral_earnings = referral_earnings + $1 WHERE id = $2`,
          [commission, ref.referrerId]
        )
        .catch(() => {});
    }
    const refProfile = dbState.profiles.find((p) => p.id === ref.referrerId);
    if (refProfile) {
      refProfile.referralEarnings = Number((Number(refProfile.referralEarnings) + commission).toFixed(6));
    }

    await createTransactionRecord({
      userId: ref.referrerId,
      type: 'referral_commission',
      amount: commission,
      status: 'completed',
      description: `Level ${ref.level} referral commission (${rate}%)`,
      txHash: null,
      referenceId,
    });
  }
  saveDb();
}

// ============================================================================
// REAL DATABASE QUERIES (Exact match with cryptofd/lib/queries.ts)
// ============================================================================
export function mapDbTxToUiTransaction(tx: DbTransaction, exchangeRate = 100) {
  const absAmount = Math.abs(Number(tx.amount || 0));
  const isInrNote = tx.description?.includes('INR') || tx.description?.includes('UTR');

  let uiType: 'deposit' | 'withdraw' | 'commission' | 'plan_subscription' | 'plan_reward' = 'deposit';
  if (tx.type === 'withdrawal') {
    uiType = 'withdraw';
  } else if (
    tx.type === 'commission' ||
    tx.type === 'referral_commission' ||
    tx.type === 'referral_earning'
  ) {
    uiType = 'commission';
  } else if (tx.type === 'fd_investment') {
    uiType = 'plan_subscription';
  } else if (tx.type === 'fd_earning') {
    uiType = 'plan_reward';
  } else {
    uiType = 'deposit';
  }

  let uiStatus: 'completed' | 'pending' | 'rejected' = 'completed';
  if (tx.status === 'pending') uiStatus = 'pending';
  else if (tx.status === 'failed' || tx.status === 'rejected') uiStatus = 'rejected';

  const dateObj = tx.createdAt ? new Date(tx.createdAt) : new Date();
  const formattedTime = dateObj.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: tx.id,
    type: uiType,
    rawType: tx.type,
    currency: isInrNote ? ('INR' as const) : ('USDT' as const),
    amount: isInrNote ? absAmount * exchangeRate : absAmount,
    equivalentAmount: isInrNote ? absAmount : absAmount * exchangeRate,
    fee: 0,
    status: uiStatus,
    timestamp: formattedTime,
    createdAt: tx.createdAt,
    method: tx.description || tx.type.replace(/_/g, ' '),
    referenceId:
      tx.referenceId && !tx.referenceId.startsWith('0x') && tx.referenceId.length <= 16
        ? tx.referenceId
        : `TX-${tx.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
    destinationAddress: tx.txHash || undefined,
    note: tx.description || '',
  };
}

export async function getUserTransactions(userId: string, limit = 100): Promise<DbTransaction[]> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      return res.rows.map((t: any) => ({
        id: String(t.id),
        userId: String(t.user_id),
        type: t.type,
        amount: Number(t.amount || 0),
        status: t.status || 'completed',
        description: t.description || '',
        txHash: t.tx_hash || null,
        logIndex: t.log_index !== null && t.log_index !== undefined ? Number(t.log_index) : null,
        referenceId: t.reference_id || null,
        createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] getUserTransactions fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.transactions
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getUserReferralsWithStats(
  userId: string,
  exchangeRate = 100,
  existingUserTransactions?: DbTransaction[]
) {
  await initDb();
  let myReferrals = dbState.referrals.filter((r) => r.referrerId === userId);
  let profilesList = dbState.profiles;
  let referredDepositTxs: DbTransaction[] = dbState.transactions.filter(
    (t) => t.type === 'deposit' && t.status === 'completed'
  );

  if (pgConnected && pgPool) {
    try {
      const refRes = await pgPool.query(
        'SELECT * FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      if (refRes.rows.length > 0 || myReferrals.length === 0) {
        myReferrals = refRes.rows.map((r: any) => ({
          id: String(r.id),
          referrerId: String(r.referrer_id),
          referredId: String(r.referred_id),
          level: Number(r.level) as 1 | 2 | 3,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        }));
      }

      const referredIds = Array.from(new Set(myReferrals.map((r) => r.referredId)));
      if (referredIds.length > 0) {
        // Query only referred profiles (excluding heavy base64 profile_photo blobs) and their completed deposits
        const [profRes, txRes] = await Promise.all([
          pgPool.query(
            `SELECT id, alien_pay_id, email, password_hash, name, phone, country_code,
                    referral_code, referred_by, wallet_balance, locked_balance,
                    total_earnings, referral_earnings, active_plan_id, plan_name,
                    plan_status, is_verified, is_admin, created_at, updated_at
             FROM profiles
             WHERE id = ANY($1::text[])`,
            [referredIds]
          ),
          pgPool.query(
            `SELECT * FROM transactions
             WHERE user_id = ANY($1::text[])
               AND type = 'deposit'
               AND status = 'completed'`,
            [referredIds]
          ),
        ]);

        if (profRes.rows.length > 0) {
          profilesList = profRes.rows.map(mapRowToProfile);
        }
        referredDepositTxs = txRes.rows.map((r: any) => ({
          id: String(r.id),
          userId: String(r.user_id),
          type: r.type,
          amount: Number(r.amount || 0),
          status: r.status,
          description: r.description || '',
          txHash: r.tx_hash,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        }));
      } else {
        referredDepositTxs = [];
      }
    } catch (e) {
      console.error('[Referrals] DB query fallback:', e);
    }
  }

  const myTransactions = existingUserTransactions || (await getUserTransactions(userId, 500));
  const myCommissionTxs = myTransactions.filter(
    (t) => t.type === 'referral_commission' || t.type === 'referral_earning'
  );

  const commissionRates: Record<number, number> = { 1: 10, 2: 5, 3: 2 };
  const tierCounts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const tierEarnedUsdt: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  for (const ref of myReferrals) {
    const lvl = (ref.level === 1 || ref.level === 2 || ref.level === 3 ? ref.level : 1) as 1 | 2 | 3;
    tierCounts[lvl] = (tierCounts[lvl] || 0) + 1;
  }

  for (const tx of myCommissionTxs) {
    const match = tx.description?.match(/Level (\d)/i);
    const lvl = match ? (Number(match[1]) as 1 | 2 | 3) : 1;
    const validLvl = lvl === 1 || lvl === 2 || lvl === 3 ? lvl : 1;
    tierEarnedUsdt[validLvl] += Math.abs(Number(tx.amount || 0));
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEarnedUsdt = myCommissionTxs
    .filter((t) => t.createdAt && t.createdAt.startsWith(todayStr))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const todayNewMembers = myReferrals.filter(
    (r) => r.createdAt && r.createdAt.startsWith(todayStr)
  ).length;

  const teamMembers = myReferrals.map((ref) => {
    const referredProfile = profilesList.find((p) => p.id === ref.referredId);
    const referredDeposits = referredDepositTxs.filter(
      (t) =>
        t.userId === ref.referredId &&
        !t.description?.toLowerCase().includes('sign-up bonus')
    );
    const depositUsdt = referredDeposits.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    const rate = commissionRates[ref.level] || 10;
    const commissionUsdt = Number(((depositUsdt * rate) / 100).toFixed(2));
    const dateObj = ref.createdAt ? new Date(ref.createdAt) : new Date();

    return {
      id: ref.id,
      referredUserId: ref.referredId,
      name: referredProfile?.name || 'AlienPay Member',
      userId:
        referredProfile?.alienPayId ||
        'AP-' + String(ref.referredId).slice(0, 6).toUpperCase(),
      email: referredProfile?.email || '',
      tier: ref.level,
      date: dateObj.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      depositVolumeUsdt: depositUsdt,
      depositVolume: Math.round(depositUsdt * exchangeRate),
      commissionEarnedUsdt: commissionUsdt,
      commissionEarned: Math.round(commissionUsdt * exchangeRate),
      status: (referredProfile?.planStatus === 'active' ? 'VIP' : 'Active') as 'Active' | 'VIP',
    };
  });

  const totalEarnedUsdt =
    tierEarnedUsdt[1] + tierEarnedUsdt[2] + tierEarnedUsdt[3];

  return {
    tierStats: {
      tier1: {
        name: 'Tier 1 (Direct)',
        rate: '10%',
        desc: 'Direct invitations with your referral code',
        count: tierCounts[1],
        earnedUsdt: Number(tierEarnedUsdt[1].toFixed(2)),
        earnedInr: Math.round(tierEarnedUsdt[1] * exchangeRate),
        rateNum: 10,
      },
      tier2: {
        name: 'Tier 2 (Indirect)',
        rate: '5%',
        desc: 'Invited by your Tier 1 direct team partners',
        count: tierCounts[2],
        earnedUsdt: Number(tierEarnedUsdt[2].toFixed(2)),
        earnedInr: Math.round(tierEarnedUsdt[2] * exchangeRate),
        rateNum: 5,
      },
      tier3: {
        name: 'Tier 3 (Network)',
        rate: '2%',
        desc: 'Extended multi-tier community network deposits',
        count: tierCounts[3],
        earnedUsdt: Number(tierEarnedUsdt[3].toFixed(2)),
        earnedInr: Math.round(tierEarnedUsdt[3] * exchangeRate),
        rateNum: 2,
      },
    },
    totalTeamSize: myReferrals.length,
    totalEarnedUsdt: Number(totalEarnedUsdt.toFixed(2)),
    totalEarnedInr: Math.round(totalEarnedUsdt * exchangeRate),
    todayReferral: {
      earnedUsdt: Number(todayEarnedUsdt.toFixed(2)),
      earnedInr: Math.round(todayEarnedUsdt * exchangeRate),
      newMembers: todayNewMembers,
    },
    teamMembers,
    commissionTransactions: myCommissionTxs,
  };
}

// ============================================================================
// BANK ACCOUNTS PERSISTENCE (Render PostgreSQL + Local State)
// ============================================================================
export function formatBankAccountForUi(b: any) {
  const rawType = String(b.account_type || b.accountType || 'Savings');
  const normType: 'Savings' | 'Current' | 'Corporate' =
    rawType.toLowerCase() === 'corporate'
      ? 'Corporate'
      : rawType.toLowerCase() === 'current'
      ? 'Current'
      : 'Savings';
  const fundType: 'gaming' | 'stock' =
    (b.fund_preference || b.fundType || b.fundPreference) === 'stock' ? 'stock' : 'gaming';
  const gamingRate = normType === 'Corporate' ? 4 : normType === 'Current' ? 3 : 5;
  const stockRate = normType === 'Corporate' ? 6 : normType === 'Current' ? 5 : 10;
  const chosenRate = Number(
    b.expected_commission_percent || b.runningCommissionRate || (fundType === 'stock' ? stockRate : gamingRate)
  );
  const maxLimit =
    normType === 'Corporate' && fundType === 'stock'
      ? 9907184
      : normType === 'Corporate'
      ? 40000000
      : normType === 'Current'
      ? 7400000
      : 1000000;

  return {
    id: String(b.id),
    userId: String(b.user_id || b.userId || ''),
    accountType: normType,
    fundType,
    bankName: String(b.bank_name || b.bankName || ''),
    accountHolder: String(b.account_holder || b.accountHolder || b.accountHolderName || ''),
    accountHolderName: String(b.account_holder || b.accountHolderName || b.accountHolder || ''),
    accountNumber: String(b.account_number || b.accountNumber || ''),
    ifscCode: String(b.ifsc_code || b.ifscCode || ''),
    upiId: b.upi_id || b.upiId || '',
    branchName: b.upi_id || b.branchName || undefined,
    corporateId: b.net_banking_id || b.corporateId || undefined,
    groupId: b.net_banking_password || b.groupId || undefined,
    domainId: b.transaction_password || b.domainId || undefined,
    netBankingLoginDetails: b.net_banking_login_details || b.netBankingLoginDetails || undefined,
    runningCommissionRate: chosenRate,
    gamingCommissionRate: gamingRate,
    stockCommissionRate: stockRate,
    runningVolumeProcessed: Number(b.running_volume_processed ?? b.runningVolumeProcessed ?? 0),
    accumulatedCommission: Number(b.accumulated_commission ?? b.accumulatedCommission ?? 0),
    maxVolumeLimit: maxLimit,
    isPrimary: Boolean(b.is_primary ?? b.isPrimary),
    isVerified: (b.is_verified ?? b.isVerified) !== false,
    isRunning: Boolean(b.is_running ?? b.isRunning),
    addedAt:
      b.added_at ||
      b.addedAt ||
      (b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    createdAt: b.created_at ? new Date(b.created_at).toISOString() : (b.createdAt || new Date().toISOString()),
  };
}

export async function getUserBankAccounts(userId: string): Promise<any[]> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows.map(formatBankAccountForUi);
    } catch (err) {
      console.warn('[DB] getUserBankAccounts fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.bankAccounts.filter((b) => b.userId === userId).map(formatBankAccountForUi);
}

export async function createBankAccountRecord(
  account: any
): Promise<any[]> {
  await initDb();

  const existing = dbState.bankAccounts.filter((b) => b.userId === account.userId);
  const isFirst = existing.length === 0;
  const shouldBePrimary = account.isPrimary || isFirst;

  if (shouldBePrimary) {
    dbState.bankAccounts.forEach((b) => {
      if (b.userId === account.userId) b.isPrimary = false;
    });
    if (pgConnected && pgPool) {
      await pgPool
        .query('UPDATE bank_accounts SET is_primary = false WHERE user_id = $1', [account.userId])
        .catch(() => {});
    }
  }

  const record: DbBankAccount = {
    id: account.id || 'ba_' + Date.now(),
    userId: account.userId,
    accountType: (String(account.accountType || 'savings').toLowerCase()) as 'savings' | 'current' | 'corporate',
    bankName: account.bankName,
    accountHolder: account.accountHolder || account.accountHolderName || '',
    accountNumber: account.accountNumber,
    ifscCode: account.ifscCode,
    upiId: account.branchName || account.upiId || '',
    netBankingId: account.corporateId || account.netBankingId || '',
    netBankingPassword: account.groupId || account.netBankingPassword || '',
    transactionPassword: account.domainId || account.transactionPassword || '',
    netBankingLoginDetails: String(account.netBankingLoginDetails || '').slice(0, 1000),
    fundPreference: (account.fundType || account.fundPreference || 'gaming') as 'gaming' | 'stock' | 'both',
    expectedCommissionPercent: Number(account.runningCommissionRate || account.expectedCommissionPercent || 5),
    runningVolumeProcessed: Number(account.runningVolumeProcessed || 0),
    accumulatedCommission: Number(account.accumulatedCommission || 0),
    isPrimary: shouldBePrimary,
    isVerified: account.isVerified !== false,
    isRunning: Boolean(account.isRunning),
    addedAt: account.addedAt || new Date().toISOString().split('T')[0],
    createdAt: account.createdAt || new Date().toISOString(),
  };

  if (pgConnected && pgPool) {
    await pgPool.query(
      `INSERT INTO bank_accounts (
        id, user_id, account_type, bank_name, account_holder, account_number,
        ifsc_code, upi_id, net_banking_id, net_banking_password, transaction_password,
        net_banking_login_details, fund_preference, expected_commission_percent,
        running_volume_processed, accumulated_commission,
        is_primary, is_verified, is_running, added_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (id) DO UPDATE SET
        bank_name = EXCLUDED.bank_name,
        account_holder = EXCLUDED.account_holder,
        account_number = EXCLUDED.account_number,
        ifsc_code = EXCLUDED.ifsc_code,
        upi_id = EXCLUDED.upi_id,
        net_banking_login_details = EXCLUDED.net_banking_login_details,
        running_volume_processed = EXCLUDED.running_volume_processed,
        accumulated_commission = EXCLUDED.accumulated_commission,
        is_primary = EXCLUDED.is_primary,
        is_running = EXCLUDED.is_running`,
      [
        record.id,
        record.userId,
        record.accountType,
        record.bankName,
        record.accountHolder,
        record.accountNumber,
        record.ifscCode,
        record.upiId || null,
        record.netBankingId || null,
        record.netBankingPassword || null,
        record.transactionPassword || null,
        record.netBankingLoginDetails || null,
        record.fundPreference || 'gaming',
        record.expectedCommissionPercent || 5,
        record.runningVolumeProcessed || 0,
        record.accumulatedCommission || 0,
        record.isPrimary,
        record.isVerified,
        record.isRunning,
        record.addedAt,
      ]
    );
  }

  dbState.bankAccounts.unshift(record);
  saveDb();
  return getUserBankAccounts(account.userId);
}

export async function updateBankAccountRecord(
  id: string,
  userId: string,
  updates: Partial<Pick<DbBankAccount, 'isRunning' | 'isPrimary' | 'runningVolumeProcessed' | 'accumulatedCommission'>>
): Promise<DbBankAccount[]> {
  await initDb();

  if (updates.isPrimary) {
    dbState.bankAccounts.forEach((b) => {
      if (b.userId === userId) b.isPrimary = b.id === id;
    });
    if (pgConnected && pgPool) {
      await pgPool
        .query('UPDATE bank_accounts SET is_primary = (id = $1) WHERE user_id = $2', [id, userId])
        .catch(() => {});
    }
  }

  const target = dbState.bankAccounts.find((b) => b.id === id && b.userId === userId);

  if (updates.isRunning !== undefined) {
    if (target) {
      target.isRunning = Boolean(updates.isRunning);
    }
    if (pgConnected && pgPool) {
      await pgPool
        .query('UPDATE bank_accounts SET is_running = $1 WHERE id = $2 AND user_id = $3', [
          Boolean(updates.isRunning),
          id,
          userId,
        ])
        .catch(() => {});
    }
  }

  if (updates.runningVolumeProcessed !== undefined) {
    const vol = Math.max(0, Number(updates.runningVolumeProcessed) || 0);
    if (target) {
      target.runningVolumeProcessed = vol;
    }
    if (pgConnected && pgPool) {
      await pgPool
        .query('UPDATE bank_accounts SET running_volume_processed = $1 WHERE id = $2 AND user_id = $3', [
          vol,
          id,
          userId,
        ])
        .catch(() => {});
    }
  }

  if (updates.accumulatedCommission !== undefined) {
    const comm = Math.max(0, Number(updates.accumulatedCommission) || 0);
    if (target) {
      target.accumulatedCommission = comm;
    }
    if (pgConnected && pgPool) {
      await pgPool
        .query('UPDATE bank_accounts SET accumulated_commission = $1 WHERE id = $2 AND user_id = $3', [
          comm,
          id,
          userId,
        ])
        .catch(() => {});
    }
  }

  saveDb();
  return getUserBankAccounts(userId);
}

export async function deleteBankAccountRecord(id: string, userId: string): Promise<DbBankAccount[]> {
  await initDb();
  dbState.bankAccounts = dbState.bankAccounts.filter((b) => !(b.id === id && b.userId === userId));
  if (pgConnected && pgPool) {
    await pgPool
      .query('DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2', [id, userId])
      .catch(() => {});
  }
  saveDb();
  return getUserBankAccounts(userId);
}

// ============================================================================
// INR DEPOSIT REQUESTS (Admin Verification Queue in Render PostgreSQL)
// ============================================================================
export async function createInrDepositRequest(params: {
  userId: string;
  amountInr: number;
  amountUsdt: number;
  utrNumber: string;
  method?: string;
}): Promise<{ depositRequest: DbDepositRequest; transaction: DbTransaction }> {
  await initDb();

  const method = params.method || 'UPI / IMPS Manual Transfer';
  const utr = params.utrNumber.trim();

  // 1. Create pending transaction record in transactions table
  const tx = await createTransactionRecord({
    userId: params.userId,
    type: 'deposit',
    amount: Number(params.amountUsdt),
    status: 'pending',
    description: `INR Deposit ₹${Number(params.amountInr).toLocaleString('en-IN')} via ${method} (UTR: ${utr})`,
    txHash: utr,
    referenceId: utr,
  });

  // 2. Create pending deposit request in deposit_requests table for Admin Panel verification
  const reqRecord: DbDepositRequest = {
    id: crypto.randomUUID(),
    userId: params.userId,
    amountInr: Number(params.amountInr),
    amountUsdt: Number(params.amountUsdt),
    utrNumber: utr,
    method,
    status: 'pending',
    transactionId: tx.id,
    processedAt: null,
    createdAt: new Date().toISOString(),
  };

  if (pgConnected && pgPool) {
    await pgPool.query(
      `INSERT INTO deposit_requests (
        id, user_id, amount_inr, amount_usdt, utr_number, method, status, transaction_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())`,
      [
        reqRecord.id,
        reqRecord.userId,
        reqRecord.amountInr,
        reqRecord.amountUsdt,
        reqRecord.utrNumber,
        reqRecord.method,
        reqRecord.transactionId,
      ]
    );
  }

  dbState.depositRequests.unshift(reqRecord);
  saveDb();

  return { depositRequest: reqRecord, transaction: tx };
}

export async function getUserDepositRequests(userId: string): Promise<DbDepositRequest[]> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT * FROM deposit_requests WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows.map((d: any) => ({
        id: String(d.id),
        userId: String(d.user_id),
        amountInr: Number(d.amount_inr || 0),
        amountUsdt: Number(d.amount_usdt || 0),
        utrNumber: String(d.utr_number || ''),
        method: d.method || 'UPI / IMPS Manual Transfer',
        status: (d.status || 'pending') as 'pending' | 'approved' | 'rejected',
        transactionId: d.transaction_id || null,
        processedAt: d.processed_at ? new Date(d.processed_at).toISOString() : null,
        createdAt: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[DB] getUserDepositRequests fallback to dbState:', (err as any)?.message || err);
    }
  }

  return dbState.depositRequests.filter((d) => d.userId === userId);
}

// ============================================================================
// ADMIN CONTROL PANEL BACKEND HELPERS
// ============================================================================

export async function getAdminOverview(): Promise<{
  users: Array<{
    id: string;
    alienPayId: string;
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    walletBalance: number;
    lockedBalance: number;
    totalEarnings: number;
    referralEarnings: number;
    activePlanId: string | null;
    planName: string;
    planStatus: string;
    upiId: string | null;
    usdtAddress: string | null;
    profilePhoto: string | null;
    isVerified: boolean;
    isAdmin: boolean;
    createdAt: string;
  }>;
  deposits: Array<DbDepositRequest & { userName?: string; userEmail?: string }>;
  withdrawals: Array<DbWithdrawalRequest & { userName?: string; userEmail?: string }>;
  stats: {
    totalUsers: number;
    pendingDepositsCount: number;
    pendingWithdrawalsCount: number;
    activePlanCount: number;
    totalBalanceUsdt: number;
  };
  inrDepositConfig?: InrDepositConfig;
  supportConfig?: SupportConfig;
}> {
  await initDb();

  let profilesList: DbProfile[] = [];
  let depositsList: DbDepositRequest[] = [];
  let withdrawalsList: DbWithdrawalRequest[] = [];

  if (pgConnected && pgPool) {
    try {
      const [pRes, dRes, wRes] = await Promise.all([
        pgPool.query('SELECT * FROM profiles ORDER BY created_at DESC'),
        pgPool.query('SELECT * FROM deposit_requests ORDER BY created_at DESC LIMIT 100'),
        pgPool.query('SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 100'),
      ]);
      profilesList = pRes.rows.map(mapRowToProfile);
      depositsList = dRes.rows.map((d: any) => ({
        id: String(d.id),
        userId: String(d.user_id),
        amountInr: Number(d.amount_inr || 0),
        amountUsdt: Number(d.amount_usdt || 0),
        utrNumber: String(d.utr_number || ''),
        method: d.method || 'Manual Deposit',
        status: (d.status || 'pending') as 'pending' | 'approved' | 'rejected',
        transactionId: d.transaction_id || null,
        processedAt: d.processed_at ? new Date(d.processed_at).toISOString() : null,
        createdAt: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
      }));
      withdrawalsList = wRes.rows.map((w: any) => ({
        id: String(w.id),
        userId: String(w.user_id),
        amount: Number(w.amount || 0),
        toAddress: String(w.to_address),
        status: (w.status || 'pending') as 'pending' | 'completed' | 'rejected' | 'failed',
        txHash: w.tx_hash || null,
        errorMessage: w.error_message || null,
        processedAt: w.processed_at ? new Date(w.processed_at).toISOString() : null,
        createdAt: w.created_at ? new Date(w.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[Admin] Failed to query PostgreSQL directly, using dbState:', err);
      profilesList = dbState.profiles;
      depositsList = dbState.depositRequests;
      withdrawalsList = dbState.withdrawalRequests;
    }
  } else {
    profilesList = dbState.profiles;
    depositsList = dbState.depositRequests;
    withdrawalsList = dbState.withdrawalRequests;
  }

  const profileMap = new Map<string, DbProfile>();
  profilesList.forEach((p) => profileMap.set(p.id, p));

  const enrichedDeposits = depositsList.map((d) => {
    const u = profileMap.get(d.userId);
    return {
      ...d,
      userName: u?.name || 'User',
      userEmail: u?.email || d.userId,
    };
  });

  const enrichedWithdrawals = withdrawalsList.map((w) => {
    const u = profileMap.get(w.userId);
    return {
      ...w,
      userName: u?.name || 'User',
      userEmail: u?.email || w.userId,
    };
  });

  const formattedUsers = profilesList.map((p) => ({
    id: p.id,
    alienPayId: p.alienPayId,
    name: p.name,
    email: p.email,
    phone: p.phoneNumber,
    countryCode: p.countryCode,
    walletBalance: Number(p.walletBalance),
    lockedBalance: Number(p.lockedBalance || 0),
    totalEarnings: Number(p.totalEarnings || 0),
    referralEarnings: Number(p.referralEarnings || 0),
    activePlanId: p.activePlanId,
    planName: p.planName || 'Inactive',
    planStatus: p.planStatus || 'inactive',
    upiId: p.upiId ?? null,
    usdtAddress: p.usdtAddress ?? null,
    profilePhoto: p.profilePhoto ?? null,
    isVerified: p.isVerified,
    isAdmin: p.isAdmin,
    createdAt: p.createdAt,
  }));

  const stats = {
    totalUsers: profilesList.length,
    pendingDepositsCount: depositsList.filter((d) => d.status === 'pending').length,
    pendingWithdrawalsCount: withdrawalsList.filter((w) => w.status === 'pending').length,
    activePlanCount: profilesList.filter((p) => p.planStatus === 'active').length,
    totalBalanceUsdt: profilesList.reduce((acc, p) => acc + Number(p.walletBalance || 0), 0),
  };

  return {
    users: formattedUsers,
    deposits: enrichedDeposits,
    withdrawals: enrichedWithdrawals,
    stats,
    inrDepositConfig: await getInrDepositConfig(),
    supportConfig: await getSupportConfig(),
  };
}

export async function adminProcessDeposit(
  depositId: string,
  action: 'approve' | 'reject',
  adminNote?: string
): Promise<{ success: boolean; deposit: any; user?: DbProfile }> {
  await initDb();
  let deposit = dbState.depositRequests.find((d) => d.id === depositId);

  if (pgConnected && pgPool) {
    const q = await pgPool.query('SELECT * FROM deposit_requests WHERE id = $1', [depositId]);
    if (q.rows[0]) {
      deposit = {
        id: String(q.rows[0].id),
        userId: String(q.rows[0].user_id),
        amountInr: Number(q.rows[0].amount_inr || 0),
        amountUsdt: Number(q.rows[0].amount_usdt || 0),
        utrNumber: String(q.rows[0].utr_number || ''),
        method: q.rows[0].method || 'Manual Deposit',
        status: q.rows[0].status,
        transactionId: q.rows[0].transaction_id || null,
        processedAt: q.rows[0].processed_at,
        createdAt: q.rows[0].created_at,
      };
    }
  }

  if (!deposit) {
    throw new Error('Deposit request not found');
  }

  if (deposit.status === 'approved' || deposit.status === 'rejected') {
    return { success: true, deposit };
  }

  let updatedUser: DbProfile | null = null;
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();

  if (action === 'approve') {
    // Credit user's wallet
    updatedUser = await incrementBalance(deposit.userId, deposit.amountUsdt);

    // Update linked transaction or create completed deposit transaction
    if (deposit.transactionId) {
      if (pgConnected && pgPool) {
        await pgPool.query(
          "UPDATE transactions SET status = 'completed', description = $1, created_at = NOW() WHERE id = $2",
          [`INR Deposit Verified (UTR: ${deposit.utrNumber})`, deposit.transactionId]
        ).catch(() => {});
      }
      const memTx = dbState.transactions.find((t) => t.id === deposit!.transactionId);
      if (memTx) memTx.status = 'completed';
    } else {
      await createTransactionRecord({
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amountUsdt,
        status: 'completed',
        description: `Verified Deposit (+${deposit.amountUsdt} USDT / ₹${deposit.amountInr} INR)`,
        referenceId: deposit.utrNumber,
      });
    }

    // Trigger referral commission chain
    try {
      await processReferralCommissions(deposit.userId, deposit.utrNumber, deposit.amountUsdt);
    } catch (refErr) {
      console.warn('[Admin Deposit] Referral processing warning:', refErr);
    }
  } else {
    // Reject deposit
    if (deposit.transactionId) {
      if (pgConnected && pgPool) {
        await pgPool.query(
          "UPDATE transactions SET status = 'failed', description = $1 WHERE id = $2",
          [`Deposit Rejected (${adminNote || 'Invalid UTR reference'})`, deposit.transactionId]
        ).catch(() => {});
      }
      const memTx = dbState.transactions.find((t) => t.id === deposit!.transactionId);
      if (memTx) memTx.status = 'failed';
    }
  }

  // Update deposit record
  deposit.status = newStatus as any;
  deposit.processedAt = now;

  if (pgConnected && pgPool) {
    await pgPool.query(
      'UPDATE deposit_requests SET status = $1, processed_at = NOW() WHERE id = $2',
      [newStatus, depositId]
    );
  }

  const memIdx = dbState.depositRequests.findIndex((d) => d.id === depositId);
  if (memIdx >= 0) dbState.depositRequests[memIdx] = deposit;
  saveDb();

  return { success: true, deposit, user: updatedUser || undefined };
}

export async function adminProcessWithdrawal(
  withdrawalId: string,
  action: 'approve' | 'reject',
  txHash?: string,
  adminNote?: string
): Promise<{ success: boolean; withdrawal: any; user?: DbProfile }> {
  await initDb();
  let withdrawal = dbState.withdrawalRequests.find((w) => w.id === withdrawalId);

  if (pgConnected && pgPool) {
    const q = await pgPool.query('SELECT * FROM withdrawal_requests WHERE id = $1', [withdrawalId]);
    if (q.rows[0]) {
      withdrawal = {
        id: String(q.rows[0].id),
        userId: String(q.rows[0].user_id),
        amount: Number(q.rows[0].amount || 0),
        toAddress: String(q.rows[0].to_address),
        status: q.rows[0].status,
        txHash: q.rows[0].tx_hash || null,
        errorMessage: q.rows[0].error_message || null,
        processedAt: q.rows[0].processed_at,
        createdAt: q.rows[0].created_at,
      };
    }
  }

  if (!withdrawal) {
    throw new Error('Withdrawal request not found');
  }

  if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
    return { success: true, withdrawal };
  }

  let updatedUser: DbProfile | null = null;
  const now = new Date().toISOString();

  if (action === 'approve') {
    const actualTxHash = txHash || '0x' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    withdrawal.status = 'completed';
    withdrawal.txHash = actualTxHash;
    withdrawal.processedAt = now;

    if (pgConnected && pgPool) {
      await pgPool.query(
        "UPDATE withdrawal_requests SET status = 'completed', tx_hash = $1, processed_at = NOW() WHERE id = $2",
        [actualTxHash, withdrawalId]
      );
      await pgPool.query(
        "UPDATE transactions SET status = 'completed', tx_hash = $1 WHERE reference_id = $2 OR (user_id = $3 AND type = 'withdrawal' AND status = 'pending')",
        [actualTxHash, withdrawalId, withdrawal.userId]
      ).catch(() => {});
    }

    const memTx = dbState.transactions.find((t) => t.referenceId === withdrawalId);
    if (memTx) {
      memTx.status = 'completed';
      memTx.txHash = actualTxHash;
    }
  } else {
    // Reject withdrawal: Refund amount back to user's wallet_balance!
    const errMsg = adminNote || 'Rejected by Administrator';
    withdrawal.status = 'rejected';
    withdrawal.errorMessage = errMsg;
    withdrawal.processedAt = now;

    updatedUser = await incrementBalance(withdrawal.userId, withdrawal.amount);

    if (pgConnected && pgPool) {
      await pgPool.query(
        "UPDATE withdrawal_requests SET status = 'rejected', error_message = $1, processed_at = NOW() WHERE id = $2",
        [errMsg, withdrawalId]
      );
      await pgPool.query(
        "UPDATE transactions SET status = 'failed', description = $1 WHERE reference_id = $2",
        [`Withdrawal Rejected (${errMsg})`, withdrawalId]
      ).catch(() => {});
    }

    const memTx = dbState.transactions.find((t) => t.referenceId === withdrawalId);
    if (memTx) {
      memTx.status = 'failed';
    }

    // Record refund transaction
    await createTransactionRecord({
      userId: withdrawal.userId,
      type: 'refund' as any,
      amount: withdrawal.amount,
      status: 'completed',
      description: `Refund: Withdrawal to ${withdrawal.toAddress.slice(0, 10)}... rejected (${errMsg})`,
      referenceId: withdrawalId,
    });
  }

  const memIdx = dbState.withdrawalRequests.findIndex((w) => w.id === withdrawalId);
  if (memIdx >= 0) dbState.withdrawalRequests[memIdx] = withdrawal;
  saveDb();

  return { success: true, withdrawal, user: updatedUser || undefined };
}

export async function adminDistributeDailyRoi(): Promise<{
  success: boolean;
  totalDistributedUsdt: number;
  usersCredited: number;
  details: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    planName: string;
    roiAmount: number;
  }>;
}> {
  await initDb();
  let profilesList: DbProfile[] = [];

  if (pgConnected && pgPool) {
    const res = await pgPool.query("SELECT * FROM profiles WHERE plan_status = 'active'");
    profilesList = res.rows.map(mapRowToProfile);
  } else {
    profilesList = dbState.profiles.filter((p) => p.planStatus === 'active');
  }

  const planRoiRates: Record<string, number> = {
    silver: 4.0, // 1% of 400 USDT = 4.0 USDT/day (₹400)
    'silver vip': 4.0,
    gold: 8.0, // 1% of 800 USDT = 8.0 USDT/day (₹800)
    'gold pro vip': 8.0,
    diamond: 18.0, // 1% of 1800 USDT = 18.0 USDT/day (₹1,800)
    'diamond elite vip': 18.0,
  };

  const details: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    planName: string;
    roiAmount: number;
  }> = [];

  let totalDistributed = 0;

  for (const user of profilesList) {
    const planKey = (user.activePlanId || user.planName || '').toLowerCase().trim();
    let roiAmount = planRoiRates[planKey] || 4.0; // default 4 USDT / ₹400

    await incrementBalance(user.id, roiAmount);

    // Update total_earnings in PostgreSQL & memory
    if (pgConnected && pgPool) {
      await pgPool.query(
        'UPDATE profiles SET total_earnings = total_earnings + $1, updated_at = NOW() WHERE id = $2',
        [roiAmount, user.id]
      ).catch(() => {});
    }

    const memProfile = dbState.profiles.find((p) => p.id === user.id);
    if (memProfile) {
      memProfile.totalEarnings = Number(memProfile.totalEarnings || 0) + roiAmount;
    }

    // Create linked plan_yield transaction record
    await createTransactionRecord({
      userId: user.id,
      type: 'plan_yield',
      amount: roiAmount,
      status: 'completed',
      description: `${user.planName || 'VIP Plan'} Daily Dividend ROI (+${roiAmount.toFixed(2)} USDT)`,
      referenceId: 'ROI' + Date.now().toString().slice(-6),
    });

    totalDistributed += roiAmount;
    details.push({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      planName: user.planName || 'VIP Plan',
      roiAmount,
    });
  }

  saveDb();

  return {
    success: true,
    totalDistributedUsdt: Number(totalDistributed.toFixed(2)),
    usersCredited: details.length,
    details,
  };
}

export async function adminUpdateUserPlan(
  identifier: string,
  planId: string,
  planStatus: 'active' | 'inactive'
): Promise<DbProfile | null> {
  await initDb();

  const planMap: Record<string, { id: string; name: string; amount: number }> = {
    silver: { id: 'silver', name: 'Silver VIP', amount: 400 },
    gold: { id: 'gold', name: 'Gold Pro VIP', amount: 800 },
    diamond: { id: 'diamond', name: 'Diamond Elite VIP', amount: 1800 },
  };

  const selectedPlan = planMap[planId.toLowerCase()] || (
    planId === 'inactive' ? null : { id: planId, name: `${planId.toUpperCase()} VIP`, amount: 400 }
  );

  const newPlanId = planStatus === 'active' && selectedPlan ? selectedPlan.id : null;
  const newPlanName = planStatus === 'active' && selectedPlan ? selectedPlan.name : 'Inactive';
  const newPlanStatus = planStatus === 'active' && selectedPlan ? 'active' : 'inactive';

  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE profiles 
         SET active_plan_id = $1, plan_name = $2, plan_status = $3, updated_at = NOW() 
         WHERE id = $4 OR email = LOWER($4)
         RETURNING *`,
        [newPlanId, newPlanName, newPlanStatus, identifier]
      );
      if (res.rows[0]) {
        const updated = mapRowToProfile(res.rows[0]);
        const memIdx = dbState.profiles.findIndex(
          (p) => p.id === updated.id || p.email.toLowerCase() === updated.email.toLowerCase()
        );
        if (memIdx >= 0) dbState.profiles[memIdx] = updated;

        if (newPlanStatus === 'active' && selectedPlan) {
          await createTransactionRecord({
            userId: updated.id,
            type: 'fd_investment',
            amount: selectedPlan.amount,
            status: 'completed',
            description: `Plan Activated by Admin: ${selectedPlan.name} (${selectedPlan.amount} USDT)`,
            referenceId: 'PLAN_ADM_' + Math.floor(100000 + Math.random() * 900000),
          }).catch(() => {});
        }

        saveDb();
        return updated;
      }
    } catch (err) {
      console.error('[DB] Failed to update user plan in PostgreSQL:', err);
    }
  }

  const user = dbState.profiles.find(
    (p) => p.id === identifier || p.email.toLowerCase() === identifier.toLowerCase()
  );
  if (!user) return null;

  user.activePlanId = newPlanId;
  user.planName = newPlanName;
  user.planStatus = newPlanStatus as any;

  if (newPlanStatus === 'active' && selectedPlan) {
    await createTransactionRecord({
      userId: user.id,
      type: 'fd_investment',
      amount: selectedPlan.amount,
      status: 'completed',
      description: `Plan Activated by Admin: ${selectedPlan.name} (${selectedPlan.amount} USDT)`,
      referenceId: 'PLAN_ADM_' + Math.floor(100000 + Math.random() * 900000),
    }).catch(() => {});
  }

  saveDb();
  return user;
}

export async function getInrDepositConfig(): Promise<InrDepositConfig> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query("SELECT value FROM system_settings WHERE key = 'inr_deposit_config'");
      if (res.rows[0]?.value) {
        const merged: InrDepositConfig = { ...DEFAULT_INR_DEPOSIT_CONFIG, ...res.rows[0].value };
        dbState.inrDepositConfig = merged;
        return merged;
      }
    } catch (err) {
      console.error('[DB] Error getting inr_deposit_config from PostgreSQL:', err);
    }
  }
  return dbState.inrDepositConfig || DEFAULT_INR_DEPOSIT_CONFIG;
}

export async function updateInrDepositConfig(updates: Partial<InrDepositConfig>): Promise<InrDepositConfig> {
  await initDb();
  const current = await getInrDepositConfig();
  const updated: InrDepositConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  dbState.inrDepositConfig = updated;
  saveDb();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ('inr_deposit_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(updated)]
      );
    } catch (err) {
      console.error('[DB] Error saving inr_deposit_config to PostgreSQL:', err);
    }
  }

  return updated;
}

export async function getSupportConfig(): Promise<SupportConfig> {
  await initDb();
  if (pgConnected && pgPool) {
    try {
      const res = await pgPool.query("SELECT value FROM system_settings WHERE key = 'support_config'");
      if (res.rows[0]?.value) {
        const merged: SupportConfig = {
          ...DEFAULT_SUPPORT_CONFIG,
          ...res.rows[0].value,
          agents: Array.isArray(res.rows[0].value.agents) && res.rows[0].value.agents.length > 0
            ? res.rows[0].value.agents
            : DEFAULT_SUPPORT_CONFIG.agents,
        };
        dbState.supportConfig = merged;
        return merged;
      }
    } catch (err) {
      console.error('[DB] Error getting support_config from PostgreSQL:', err);
    }
  }
  return dbState.supportConfig || DEFAULT_SUPPORT_CONFIG;
}

export async function updateSupportConfig(updates: Partial<SupportConfig>): Promise<SupportConfig> {
  await initDb();
  const current = await getSupportConfig();
  const updated: SupportConfig = {
    ...current,
    ...updates,
    agents: updates.agents !== undefined ? updates.agents : current.agents,
    updatedAt: new Date().toISOString(),
  };

  dbState.supportConfig = updated;
  saveDb();

  if (pgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ('support_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(updated)]
      );
    } catch (err) {
      console.error('[DB] Error saving support_config to PostgreSQL:', err);
    }
  }

  return updated;
}


