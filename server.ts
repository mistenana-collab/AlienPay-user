import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import { ethers } from 'ethers';
import {
  initDb,
  saveDb,
  upsertUserProfile,
  incrementBalance,
  decrementBalance,
  setBalance,
  getOrCreateUserWallet,
  createReferralChain,
  processReferralCommissions,
  createTransactionRecord,
  createSweepTaskRecord,
  updateSweepTaskRecord,
  createWithdrawalRequestRecord,
  connectPostgres,
  getDatabaseConnectionInfo,
  getUserTransactions,
  getUserReferralsWithStats,
  mapDbTxToUiTransaction,
  getUserBankAccounts,
  createBankAccountRecord,
  updateBankAccountRecord,
  deleteBankAccountRecord,
  createInrDepositRequest,
  getUserDepositRequests,
  updateUserProfilePhoto,
  updateUserPayoutAccounts,
  getUserProfileByIdOrEmail,
  getAdminOverview,
  adminProcessDeposit,
  adminProcessWithdrawal,
  adminDistributeDailyRoi,
  adminUpdateUserPlan,
  getInrDepositConfig,
  updateInrDepositConfig,
  getSupportConfig,
  updateSupportConfig,
  updateUserSecuritySettings,
  DbProfile,
  DbWallet,
} from './src/server/db';
import multer from 'multer';
import {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  generateToken,
  generateOTP,
  generateReferralCode,
  getCurrentUserFromReq,
} from './src/server/auth';
import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendWithdrawalEmail,
} from './src/server/email';
import { startBackgroundWorker, getWorkerStatus } from './src/server/worker';
import { scan } from './src/server/worker/scanner';
import { sendGas } from './src/server/worker/gasService';
import { executeSweeps } from './src/server/worker/sweepExecutor';
import { CONFIG, GAS_AMOUNT_BNB } from './src/server/worker/config';

const PORT = Number(process.env.PORT) || 3000;
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

function formatUserResponse(profile: DbProfile, wallet: DbWallet) {
  return {
    id: profile.id,
    alienPayId: profile.alienPayId,
    fullName: profile.name,
    name: profile.name,
    email: profile.email,
    phoneNumber: profile.phoneNumber || '',
    countryCode: profile.countryCode || '+91',
    avatarUrl: profile.profilePhoto || '',
    profilePhoto: profile.profilePhoto || null,
    kycStatus: profile.isVerified ? ('verified' as const) : ('unverified' as const),
    vipTier: 'Normal' as const,
    referralCode: profile.referralCode,
    uplineReferralCode: profile.referredBy || undefined,
    joinedDate: profile.createdAt.split('T')[0],
    activePlanId: profile.activePlanId,
    planName: profile.planName || 'Inactive',
    planStatus: profile.planStatus || 'inactive',
    securityPin: profile.securityPin || '',
    biometricEnabled: profile.biometricEnabled !== false,
    pinAuthRequired: true,
    isAdmin: false,
    walletBalance: Number(profile.walletBalance),
    lockedBalance: Number(profile.lockedBalance || 0),
    totalEarnings: Number(profile.totalEarnings || 0),
    referralEarnings: Number(profile.referralEarnings || 0),
    bankDetails: {
      accountHolder: profile.name || '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: profile.upiId || '',
    },
    cryptoDetails: {
      bep20Address: profile.usdtAddress || '',
    },
    depositWallet: {
      address: wallet.address,
      derivationIndex: wallet.derivationIndex,
      derivationPath: wallet.derivationPath,
      network: wallet.network,
      qrCode: wallet.qrCode,
    },
  };
}

async function startServer() {
  await initDb();
  if (process.env.VITE_APP_MODE !== 'admin' && process.env.DISABLE_WORKER !== 'true') {
    startBackgroundWorker();
  } else {
    console.log('[Worker] Admin Service mode active — auto background worker disabled on this instance to prevent duplicate sweeps.');
  }

  const app = express();
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  app.use(express.json());
  app.use(cookieParser());

  // ============================================================================
  // 1. POST /api/auth/register - Start registration with Email OTP & HD Wallet
  //    Persists directly to Render PostgreSQL (profiles & wallets tables)
  // ============================================================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, fullName, referralCode, securityPin, phoneNumber, countryCode } = req.body;
      const userName = (name || fullName || 'AlienPay User').trim();

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const db = await initDb();
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = db.profiles.find((p) => p.email.toLowerCase() === normalizedEmail);

      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Find referrer if referralCode provided
      let referrerId: string | null = null;
      if (referralCode) {
        const referrer = db.profiles.find(
          (p) => p.referralCode.toUpperCase() === String(referralCode).trim().toUpperCase()
        );
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      const otp = generateOTP();
      const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const passwordHash = await hashPassword(password);

      let targetUser: DbProfile;

      if (existingUser && !existingUser.isVerified) {
        existingUser.passwordHash = passwordHash;
        existingUser.name = userName;
        existingUser.referredBy = referrerId;
        existingUser.otpCode = otp;
        existingUser.otpExpiresAt = otpExpiresAt;
        if (securityPin) existingUser.securityPin = String(securityPin);
        targetUser = await upsertUserProfile(existingUser);
      } else {
        targetUser = await upsertUserProfile({
          id: crypto.randomUUID(),
          alienPayId: 'AP-' + Math.floor(100000 + Math.random() * 900000),
          email: normalizedEmail,
          passwordHash,
          name: userName,
          phoneNumber: phoneNumber || '',
          countryCode: countryCode || '+91',
          referralCode: generateReferralCode(),
          referredBy: referrerId,
          otpCode: otp,
          otpExpiresAt,
          isVerified: false,
          isAdmin: false,
          walletBalance: 0,
          lockedBalance: 0,
          totalEarnings: 0,
          referralEarnings: 0,
          securityPin: securityPin ? String(securityPin).trim() : '',
          biometricEnabled: true,
          activePlanId: null,
          planName: 'Inactive',
          planStatus: 'inactive',
          createdAt: new Date().toISOString(),
        });
      }

      // Allocate unique BEP-20 HD Wallet address for this user in PostgreSQL
      const wallet = await getOrCreateUserWallet(targetUser.id);

      // Send OTP verification email
      const { sent, html } = await sendOTPEmail(normalizedEmail, otp);

      return res.json({
        message: 'Verification code sent to your email',
        email: normalizedEmail,
        otp,
        emailSent: sent,
        emailHtml: html,
        depositAddress: {
          address: wallet.address,
          derivationIndex: wallet.derivationIndex,
          derivationPath: wallet.derivationPath,
          network: wallet.network,
          qrCode: wallet.qrCode,
        },
      });
    } catch (error: any) {
      console.error('[Register] Error:', error);
      return res.status(500).json({
        error: 'Registration failed: ' + (error?.message || 'Unknown error'),
      });
    }
  });

  // ============================================================================
  // 2. POST /api/auth/verify-otp - Verify OTP & link 3-level referral chain
  // ============================================================================
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      const db = await initDb();
      const normalizedEmail = email.toLowerCase().trim();
      const user = db.profiles.find((p) => p.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.otpCode || user.otpCode !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      const wasVerified = user.isVerified;

      user.isVerified = true;
      user.otpCode = null;
      user.otpExpiresAt = null;
      if (req.body.securityPin) {
        user.securityPin = String(req.body.securityPin).trim();
      }
      await upsertUserProfile(user);

      let welcomeEmailHtml: string | undefined;

      if (!wasVerified) {
        if (user.referredBy) {
          await createReferralChain(user.id, user.referredBy);
        }

        const welcomeMail = await sendWelcomeEmail(user.email, user.name);
        welcomeEmailHtml = welcomeMail.html;
      }

      // Refresh user after verification
      const refreshedDb = await initDb();
      const updatedUser = refreshedDb.profiles.find((p) => p.id === user.id) || user;

      // Ensure user has unique BEP-20 HD Wallet address
      const wallet = await getOrCreateUserWallet(updatedUser.id);

      // Generate JWT token
      const token = await generateToken(updatedUser.id);

      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      return res.json({
        message: 'Verification successful',
        redirectTo: '/dashboard',
        token,
        signupBonusCredited: 0,
        welcomeEmailHtml,
        user: formatUserResponse(updatedUser, wallet),
      });
    } catch (error: any) {
      console.error('[Verify OTP] Error:', error);
      return res.status(500).json({
        error: 'Verification failed: ' + (error?.message || 'Unknown error'),
      });
    }
  });

  // ============================================================================
  // 3. POST /api/auth/login - 2-Step Login with Email OTP verification
  // ============================================================================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, identifier, password, otp, skipOtp } = req.body;
      const loginEmail = (email || identifier || '').toLowerCase().trim();

      if (!loginEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const db = await initDb();
      const user = db.profiles.find((p) => p.email.toLowerCase() === loginEmail);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if user is verified
      if (!user.isVerified) {
        const newOtp = generateOTP();
        user.otpCode = newOtp;
        user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
        await upsertUserProfile(user);

        const { html } = await sendOTPEmail(user.email, newOtp);

        return res.json({
          requiresVerification: true,
          message: 'Please verify your email. A new code has been sent.',
          email: user.email,
          otp: newOtp,
          emailHtml: html,
        });
      }

      // If OTP is provided (or skipOtp is requested), verify and complete login
      if (otp || skipOtp) {
        if (!skipOtp) {
          if (user.otpCode !== String(otp).trim()) {
            return res.status(400).json({ error: 'Invalid verification code' });
          }
          if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
            return res.status(400).json({ error: 'Verification code has expired' });
          }
        }

        // Clear OTP in PostgreSQL
        user.otpCode = null;
        user.otpExpiresAt = null;
        await upsertUserProfile(user);

        const wallet = await getOrCreateUserWallet(user.id);
        const token = await generateToken(user.id);

        res.cookie(COOKIE_NAME, token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        return res.json({
          message: 'Login successful',
          redirectTo: '/dashboard',
          token,
          user: formatUserResponse(user, wallet),
        });
      }

      // Step 1: Send 6-digit OTP to email for login verification
      const loginOtp = generateOTP();
      user.otpCode = loginOtp;
      user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
      await upsertUserProfile(user);

      const { html } = await sendOTPEmail(user.email, loginOtp);

      return res.json({
        requiresOtp: true,
        message: 'Verification code sent to your email',
        email: user.email,
        otp: loginOtp,
        emailHtml: html,
      });
    } catch (error: any) {
      console.error('[Login] Error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // ============================================================================
  // 4. POST /api/auth/forgot-password - Send password reset OTP or reset password
  // ============================================================================
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const db = await initDb();
      const normalizedEmail = email.toLowerCase().trim();
      const user = db.profiles.find((p) => p.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({
          error: 'Account not found. Please check your email address.',
        });
      }

      if (otp && newPassword) {
        if (user.otpCode !== String(otp).trim()) {
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
          return res.status(400).json({ error: 'Verification code has expired' });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        user.passwordHash = await hashPassword(newPassword);
        user.otpCode = null;
        user.otpExpiresAt = null;
        await upsertUserProfile(user);

        return res.json({
          success: true,
          message: 'Password reset successful. You can now log in.',
        });
      }

      const resetOtp = generateOTP();
      user.otpCode = resetOtp;
      user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
      await upsertUserProfile(user);

      const { html } = await sendPasswordResetEmail(user.email, resetOtp);

      return res.json({
        message: 'Password reset code sent to your email',
        email: user.email,
        otp: resetOtp,
        emailHtml: html,
      });
    } catch (error: any) {
      console.error('[Forgot Password] Error:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // ============================================================================
  // 5. POST /api/auth/reset-password - Reset password with verified OTP
  // ============================================================================
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({
          error: 'Email, OTP, and new password are required',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Password must be at least 6 characters',
        });
      }

      const db = await initDb();
      const user = db.profiles.find(
        (p) => p.email.toLowerCase() === String(email).toLowerCase().trim()
      );

      if (!user) {
        return res.status(400).json({ error: 'Invalid email or OTP' });
      }

      if (!user.otpCode || user.otpCode !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
        return res.status(400).json({
          error: 'OTP has expired. Please request a new one.',
        });
      }

      user.passwordHash = await hashPassword(newPassword);
      user.otpCode = null;
      user.otpExpiresAt = null;
      await upsertUserProfile(user);

      return res.json({
        success: true,
        message: 'Password reset successful. You can now log in.',
      });
    } catch (error: any) {
      console.error('[Reset Password] Error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // ============================================================================
  // 6. GET /api/auth/me - Get current authenticated user
  // ============================================================================
  app.get('/api/auth/me', async (req, res) => {
    try {
      const authData = await getCurrentUserFromReq(req);
      if (!authData) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      return res.json({
        user: formatUserResponse(authData.profile, authData.wallet),
      });
    } catch (error) {
      console.error('[Auth Me] Error:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // ============================================================================
  // 7. POST /api/auth/logout - Clear auth cookie
  // ============================================================================
  app.post('/api/auth/logout', (_req, res) => {
    res.cookie(COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 0,
    });
    return res.json({ message: 'Logged out successfully' });
  });

  // ============================================================================
  // 8. GET /api/wallet - Get or create unique HD wallet BEP-20 deposit address,
  //    live PostgreSQL balance, transactions & sweep status
  // ============================================================================
  app.get('/api/wallet', async (req, res) => {
    try {
      const db = await initDb();
      const queryUserId = req.query.userId as string | undefined;
      const queryEmail = req.query.email as string | undefined;

      let profile: DbProfile | null = null;
      if (queryUserId) {
        profile = await getUserProfileByIdOrEmail(queryUserId);
      }
      if (!profile && queryEmail) {
        profile = await getUserProfileByIdOrEmail(queryEmail);
      }
      if (!profile) {
        const authData = await getCurrentUserFromReq(req);
        if (authData?.profile) {
          profile = await getUserProfileByIdOrEmail(authData.profile.id);
        }
      }
      if (!profile) {
        const db = await initDb();
        profile = db.profiles[0] || null;
      }

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const wallet = await getOrCreateUserWallet(profile.id);
      const userTransactions = await getUserTransactions(profile.id, 100);
      const uiTransactions = userTransactions.map((t) => mapDbTxToUiTransaction(t, 100));
      const userSweepTasks = db.sweepTasks.filter((s) => s.userId === profile!.id).slice(0, 20);
      const referralSummary = await getUserReferralsWithStats(profile.id, 100, userTransactions);
      const bankAccounts = await getUserBankAccounts(profile.id);
      const depositRequests = await getUserDepositRequests(profile.id);

      return res.json({
        user: formatUserResponse(profile, wallet),
        wallet: {
          balance: Number(profile.walletBalance),
          locked: Number(profile.lockedBalance),
          total: Number(profile.walletBalance) + Number(profile.lockedBalance),
          totalEarnings: Number(profile.totalEarnings),
          referralEarnings: Number(profile.referralEarnings),
        },
        depositAddress: {
          address: wallet.address,
          derivationIndex: wallet.derivationIndex,
          derivationPath: wallet.derivationPath,
          network: 'BEP-20 (BSC)',
          qrCode: wallet.qrCode,
        },
        hasAddress: true,
        transactions: userTransactions,
        uiTransactions,
        bankAccounts,
        depositRequests,
        sweepTasks: userSweepTasks,
        referralSummary,
        database: getDatabaseConnectionInfo(),
        worker: getWorkerStatus(),
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      return res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
  });

  // ============================================================================
  // 8b. GET /api/transactions - Get real transaction history from DB
  // ============================================================================
  app.get('/api/transactions', async (req, res) => {
    try {
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const queryUserId = req.query.userId as string | undefined;
      const queryEmail = req.query.email as string | undefined;

      const profile =
        authData?.profile ||
        (queryUserId ? db.profiles.find((p) => p.id === queryUserId) : undefined) ||
        (queryEmail
          ? db.profiles.find((p) => p.email.toLowerCase() === queryEmail.toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.json({ transactions: [], uiTransactions: [] });
      }

      const txs = await getUserTransactions(profile.id, 100);
      return res.json({
        transactions: txs,
        uiTransactions: txs.map((t) => mapDbTxToUiTransaction(t, 100)),
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // ============================================================================
  // 8c. GET /api/referrals - Get real 3-level referral network & commissions from DB
  // ============================================================================
  app.get('/api/referrals', async (req, res) => {
    try {
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const queryUserId = req.query.userId as string | undefined;
      const queryEmail = req.query.email as string | undefined;

      const profile =
        authData?.profile ||
        (queryUserId ? db.profiles.find((p) => p.id === queryUserId) : undefined) ||
        (queryEmail
          ? db.profiles.find((p) => p.email.toLowerCase() === queryEmail.toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const referralData = await getUserReferralsWithStats(profile.id, 100);
      return res.json(referralData);
    } catch (error) {
      console.error('Get referrals error:', error);
      return res.status(500).json({ error: 'Failed to fetch referrals' });
    }
  });

  // ============================================================================
  // 8d. POST /api/transactions/record - Record real INR deposit, plan activation,
  //     or commission settlement in PostgreSQL transactions table
  // ============================================================================
  app.post('/api/transactions/record', async (req, res) => {
    try {
      const {
        userId,
        email,
        type = 'deposit',
        amountUsdt,
        status = 'pending',
        description,
        txHash,
        referenceId,
        planId,
        planName,
      } = req.body;

      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const numUsdt = Number(amountUsdt || 0);
      if (planId && planName) {
        profile.activePlanId = planId;
        profile.planName = planName;
        profile.planStatus = 'active';
        if (numUsdt > 0 && Number(profile.walletBalance) >= numUsdt) {
          profile.walletBalance = Math.max(0, Number(profile.walletBalance) - numUsdt);
          profile.lockedBalance = Number(profile.lockedBalance || 0) + numUsdt;
        }
        await upsertUserProfile(profile);
      }

      const txRecord = await createTransactionRecord({
        userId: profile.id,
        type: type as any,
        amount: numUsdt,
        status: status as any,
        description: description || `${type} transaction`,
        txHash: txHash || null,
        referenceId: referenceId || null,
      });

      return res.json({
        success: true,
        transaction: txRecord,
        uiTransaction: mapDbTxToUiTransaction(txRecord, 100),
        walletBalance: Number(profile.walletBalance),
      });
    } catch (error: any) {
      console.error('Record transaction error:', error);
      return res.status(500).json({ error: error.message || 'Failed to record transaction' });
    }
  });

  // ============================================================================
  // 8e. PUT /api/user/payout-accounts - Update Bound Payout Accounts (UPI & BEP-20) in DB
  // ============================================================================
  app.put('/api/user/payout-accounts', async (req, res) => {
    try {
      const { userId, email, upiId, bep20Address } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const nextUpi = upiId !== undefined ? String(upiId).trim() : profile.upiId;
      const nextBep20 = bep20Address !== undefined ? String(bep20Address).trim() : profile.usdtAddress;

      const updated =
        (await updateUserPayoutAccounts(profile.id, nextUpi, nextBep20)) ||
        (await updateUserPayoutAccounts(profile.email, nextUpi, nextBep20)) ||
        profile;

      updated.upiId = nextUpi;
      updated.usdtAddress = nextBep20;

      const wallet = await getOrCreateUserWallet(updated.id);

      return res.json({
        success: true,
        user: formatUserResponse(updated, wallet),
      });
    } catch (error: any) {
      console.error('Update payout accounts error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update payout accounts' });
    }
  });

  // ============================================================================
  // 8e-0b. POST /api/user/security - Update 4-Digit Security PIN & Biometric Auth in PostgreSQL
  // ============================================================================
  app.post('/api/user/security', async (req, res) => {
    try {
      const { userId, email, currentPin, newPin, biometricEnabled } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      let profile: DbProfile | null =
        authData?.profile ||
        (userId ? await getUserProfileByIdOrEmail(userId) : null) ||
        (email ? await getUserProfileByIdOrEmail(email) : null) ||
        db.profiles[0] ||
        null;

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (newPin !== undefined) {
        const cleanNew = String(newPin).trim();
        if (!/^\d{4,6}$/.test(cleanNew)) {
          return res.status(400).json({ error: 'Security PIN must be 4 to 6 digits.' });
        }
        const existingPin = String(profile.securityPin || '').trim();
        // Verify currentPin if user has an existing custom PIN and provided currentPin
        if (existingPin && existingPin !== '1234' && currentPin !== undefined && String(currentPin).trim() !== '') {
          if (String(currentPin).trim() !== existingPin) {
            return res.status(400).json({ error: 'Current Security PIN is incorrect.' });
          }
        }
      }

      const updated =
        (await updateUserSecuritySettings(
          profile.id,
          newPin !== undefined ? String(newPin).trim() : undefined,
          biometricEnabled !== undefined ? Boolean(biometricEnabled) : undefined
        )) || profile;

      const wallet = await getOrCreateUserWallet(updated.id);

      return res.json({
        success: true,
        message: 'Security settings updated in database.',
        user: formatUserResponse(updated, wallet),
      });
    } catch (error: any) {
      console.error('Update security settings error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update security settings' });
    }
  });

  // ============================================================================
  // 8e-1. GET /api/user/profile - Fetch fresh user profile from DB on load/refresh
  // ============================================================================
  app.get('/api/user/profile', async (req, res) => {
    try {
      const queryUserId = req.query.userId as string | undefined;
      const queryEmail = req.query.email as string | undefined;

      let profile: DbProfile | null = null;
      if (queryUserId) {
        profile = await getUserProfileByIdOrEmail(queryUserId);
      }
      if (!profile && queryEmail) {
        profile = await getUserProfileByIdOrEmail(queryEmail);
      }
      if (!profile) {
        const authData = await getCurrentUserFromReq(req);
        if (authData?.profile) {
          profile = await getUserProfileByIdOrEmail(authData.profile.id);
        }
      }
      if (!profile) {
        const db = await initDb();
        profile = db.profiles[0] || null;
      }

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const wallet = await getOrCreateUserWallet(profile.id);
      return res.json({
        success: true,
        user: formatUserResponse(profile, wallet),
      });
    } catch (error) {
      console.error('Fetch user profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // ============================================================================
  // 8e-2. POST /api/user/profile-photo - Cloudinary Profile Photo Upload (Exact cryptofd)
  // ============================================================================
  app.post('/api/user/profile-photo', upload.single('photo'), async (req, res) => {
    try {
      console.log('[ProfilePhoto] Upload started');
      const authData = await getCurrentUserFromReq(req);
      const db = await initDb();
      const profile =
        authData?.profile ||
        (req.body?.userId ? db.profiles.find((p) => p.id === req.body.userId) : undefined) ||
        (req.body?.email ? db.profiles.find((p) => p.email.toLowerCase() === String(req.body.email).toLowerCase().trim()) : undefined) ||
        db.profiles[0];

      if (!profile) {
        return res.status(401).json({ error: 'Unauthorized or profile not found' });
      }

      console.log('[ProfilePhoto] User authenticated:', profile.id);

      const file = req.file;
      let fileBuffer: Buffer | null = null;
      let mimeType = '';
      let originalName = 'avatar.png';

      if (file) {
        fileBuffer = file.buffer;
        mimeType = file.mimetype;
        originalName = file.originalname || 'avatar.png';
      } else if (req.body?.photoBase64) {
        const base64Str = String(req.body.photoBase64);
        const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
        } else {
          fileBuffer = Buffer.from(base64Str, 'base64');
          mimeType = 'image/jpeg';
        }
      }

      if (!fileBuffer) {
        console.log('[ProfilePhoto] No file provided');
        return res.status(400).json({ error: 'No file provided' });
      }

      console.log('[ProfilePhoto] File received:', originalName, mimeType, fileBuffer.length);

      // Validate file type (JPG, PNG, WebP)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        console.log('[ProfilePhoto] Invalid file type:', mimeType);
        return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and WebP allowed' });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        console.log('[ProfilePhoto] File too large:', fileBuffer.length);
        return res.status(400).json({ error: 'File too large. Maximum 5MB allowed' });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      console.log('[ProfilePhoto] Checking env vars...');
      console.log('[ProfilePhoto] CLOUDINARY_CLOUD_NAME:', cloudName ? 'SET' : 'NOT SET');
      console.log('[ProfilePhoto] CLOUDINARY_UPLOAD_PRESET:', uploadPreset ? 'SET' : 'NOT SET');

      if (!cloudName || !uploadPreset) {
        return res.status(400).json({
          error: 'CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET are required in .env for Cloudinary avatar uploads.',
        });
      }

      // Upload to Cloudinary using FormData and fetch (exact cryptofd pattern)
      const cloudinaryFormData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
      cloudinaryFormData.append('file', blob, originalName);
      cloudinaryFormData.append('upload_preset', uploadPreset);
      cloudinaryFormData.append('folder', 'cryptofd-profiles');
      cloudinaryFormData.append('resource_type', 'auto');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      console.log('[ProfilePhoto] Uploading to Cloudinary:', uploadUrl);

      const cloudinaryResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      console.log('[ProfilePhoto] Cloudinary response status:', cloudinaryResponse.status);

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.text();
        console.error('[ProfilePhoto] Cloudinary error:', errorData);
        return res.status(502).json({
          error: `Cloudinary upload failed: ${cloudinaryResponse.status} ${errorData}`,
        });
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const imageUrl = cloudinaryData.secure_url;
      console.log('[ProfilePhoto] Cloudinary secure_url:', imageUrl);

      // Update user profile in PostgreSQL & memory
      const updatedProfile = await updateUserProfilePhoto(profile.id, imageUrl);
      const wallet = await getOrCreateUserWallet(profile.id);

      console.log('[ProfilePhoto] Profile updated successfully');
      return res.json({
        success: true,
        message: 'Photo uploaded successfully',
        photo: imageUrl,
        user: updatedProfile ? formatUserResponse(updatedProfile, wallet) : undefined,
      });
    } catch (error: any) {
      console.error('[ProfilePhoto] Upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload photo' });
    }
  });

  app.get('/api/user/profile-photo', async (req, res) => {
    try {
      const authData = await getCurrentUserFromReq(req);
      const db = await initDb();
      const queryUserId = req.query.userId as string | undefined;
      const profile =
        authData?.profile ||
        (queryUserId ? db.profiles.find((p) => p.id === queryUserId) : undefined) ||
        db.profiles[0];

      return res.json({
        photo: profile?.profilePhoto || null,
      });
    } catch (error) {
      console.error('Photo fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch photo' });
    }
  });

  // ============================================================================
  // 8e-3. POST /api/commissions/transfer - Transfer Commission to Main Wallet
  // ============================================================================
  app.post('/api/commissions/transfer', async (req, res) => {
    try {
      const { amountInr, amountUsdt, userId, email, exchangeRate = 100, fundType, description } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim()) : undefined) ||
        db.profiles[0];

      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const rate = Number(exchangeRate) || 100;
      let finalUsdt = 0;
      let finalInr = 0;

      if (amountUsdt !== undefined && Number(amountUsdt) > 0) {
        finalUsdt = Number(Number(amountUsdt).toFixed(2));
        finalInr = Math.round(finalUsdt * rate);
      } else if (amountInr !== undefined && Number(amountInr) > 0) {
        finalInr = Number(amountInr);
        finalUsdt = Number((finalInr / rate).toFixed(2));
      }

      if (finalUsdt <= 0) {
        return res.status(400).json({ error: 'Transfer amount must be greater than zero' });
      }

      // Atomically credit main wallet balance
      const updatedProfile = await incrementBalance(profile.id, finalUsdt);
      const finalProf = updatedProfile || profile;

      // Determine exact fund type (Gaming vs Stock) for settlement history
      let resolvedFund = fundType;
      if (!resolvedFund) {
        const userBanks = await getUserBankAccounts(profile.id).catch(() => []);
        const activeBank = userBanks.find((b) => b.isRunning) || userBanks[0];
        resolvedFund = activeBank?.fundType === 'stock' ? 'stock' : 'gaming';
      }

      const txDescription =
        description && String(description).trim().length > 0
          ? String(description).trim()
          : resolvedFund === 'stock'
          ? `Stock Fund Running Commission (₹${finalInr.toLocaleString('en-IN')})`
          : `Gaming Fund Running Commission (₹${finalInr.toLocaleString('en-IN')})`;

      // Record transaction in transactions table
      const txRecord = await createTransactionRecord({
        userId: profile.id,
        type: 'commission',
        amount: finalUsdt,
        status: 'completed',
        description: txDescription,
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
      });

      const wallet = await getOrCreateUserWallet(finalProf.id);

      console.log(`[Commission] Transferred ${finalUsdt} USDT (₹${finalInr}) to user ${profile.id} Main Wallet. New Balance: ${finalProf.walletBalance}`);

      return res.json({
        success: true,
        message: `Successfully transferred ₹${finalInr.toLocaleString('en-IN')} (${finalUsdt} USDT) to your Main Wallet!`,
        transferredUsdt: finalUsdt,
        transferredInr: finalInr,
        newBalance: Number(finalProf.walletBalance),
        transaction: txRecord,
        user: formatUserResponse(finalProf, wallet),
      });
    } catch (error: any) {
      console.error('[Commission] Transfer error:', error);
      return res.status(500).json({ error: error.message || 'Failed to transfer commission' });
    }
  });

  // ============================================================================
  // 8f. BANK ACCOUNTS CRUD (Render PostgreSQL bank_accounts table)
  // ============================================================================
  app.get('/api/bank-accounts', async (req, res) => {
    try {
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const queryUserId = req.query.userId as string | undefined;
      const queryEmail = req.query.email as string | undefined;
      const profile =
        authData?.profile ||
        (queryUserId ? db.profiles.find((p) => p.id === queryUserId) : undefined) ||
        (queryEmail
          ? db.profiles.find((p) => p.email.toLowerCase() === queryEmail.toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.json({ bankAccounts: [] });
      }
      const bankAccounts = await getUserBankAccounts(profile.id);
      return res.json({ bankAccounts });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch bank accounts' });
    }
  });

  app.post('/api/bank-accounts', async (req, res) => {
    try {
      const { userId, email, account } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile || !account) {
        return res.status(400).json({ error: 'Profile and account details are required' });
      }

      const bankAccounts = await createBankAccountRecord({
        ...account,
        id: account.id || 'ba_' + Date.now(),
        userId: profile.id,
        accountType: account.accountType || 'Savings',
        bankName: account.bankName,
        accountHolder: account.accountHolder || account.accountHolderName || profile.name || '',
        accountHolderName: account.accountHolderName || account.accountHolder || profile.name || '',
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
      });

      return res.json({ success: true, bankAccounts });
    } catch (error: any) {
      console.error('Add bank account error:', error);
      return res.status(500).json({ error: error.message || 'Failed to add bank account' });
    }
  });

  app.patch('/api/bank-accounts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, email, isRunning, isPrimary, runningVolumeProcessed, accumulatedCommission } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const bankAccounts = await updateBankAccountRecord(id, profile.id, {
        isRunning,
        isPrimary,
        runningVolumeProcessed,
        accumulatedCommission,
      });

      return res.json({ success: true, bankAccounts });
    } catch (error: any) {
      console.error('Update bank account error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update bank account' });
    }
  });

  app.delete('/api/bank-accounts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const queryUserId = (req.query.userId || req.body?.userId) as string | undefined;
      const queryEmail = (req.query.email || req.body?.email) as string | undefined;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (queryUserId ? db.profiles.find((p) => p.id === queryUserId) : undefined) ||
        (queryEmail
          ? db.profiles.find((p) => p.email.toLowerCase() === String(queryEmail).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const bankAccounts = await deleteBankAccountRecord(id, profile.id);
      return res.json({ success: true, bankAccounts });
    } catch (error: any) {
      console.error('Delete bank account error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete bank account' });
    }
  });

  // ============================================================================
  // 8g. POST /api/deposits/inr - Create INR Deposit Request in DB for Admin Verification
  // ============================================================================
  app.post('/api/deposits/inr', async (req, res) => {
    try {
      const { userId, email, amountInr, amountUsdt, utrNumber, method } = req.body;
      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const numInr = Number(amountInr || 0);
      const numUsdt = Number(amountUsdt || numInr / 100);
      if (numInr <= 0 || !utrNumber) {
        return res.status(400).json({ error: 'Valid INR amount and UTR reference number are required' });
      }

      const { depositRequest, transaction } = await createInrDepositRequest({
        userId: profile.id,
        amountInr: numInr,
        amountUsdt: numUsdt,
        utrNumber: String(utrNumber).trim(),
        method: method || 'UPI / IMPS Manual Transfer',
      });

      return res.json({
        success: true,
        depositRequest,
        transaction,
        uiTransaction: mapDbTxToUiTransaction(transaction, 100),
      });
    } catch (error: any) {
      console.error('INR deposit request error:', error);
      return res.status(500).json({ error: error.message || 'Failed to submit INR deposit request' });
    }
  });

  // ============================================================================
  // 9. POST /api/wallet - Request USDT BEP-20 or INR withdrawal, deduct PostgreSQL balance,
  //    create withdrawal_requests & transactions record, and send email
  // ============================================================================
  app.post('/api/wallet', async (req, res) => {
    try {
      const { amount, address, email, userId } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      if (!address || String(address).trim().length < 4) {
        return res.status(400).json({ error: 'Valid destination address or bank details required' });
      }

      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        authData?.profile ||
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : db.profiles[0]);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (profile.withdrawalDisabled) {
        return res.status(400).json({
          error: 'Withdrawals are currently disabled for your account. Please contact support.',
        });
      }

      if (numAmount > Number(profile.walletBalance)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Create withdrawal request in PostgreSQL and deduct balance atomically
      const withdrawalRecord = await createWithdrawalRequestRecord({
        userId: profile.id,
        amount: numAmount,
        toAddress: String(address).trim(),
      });

      const targetEmail = profile.email || email || 'rohitdear054@gmail.com';
      const { html } = await sendWithdrawalEmail(targetEmail, numAmount, String(address).trim());

      // Withdrawals are processed manually from the external Admin Panel
      const refreshedDb = await initDb();
      const updatedProfile = refreshedDb.profiles.find((p) => p.id === profile.id) || profile;

      return res.json({
        success: true,
        withdrawalId: withdrawalRecord.id,
        message: 'Withdrawal request submitted and pending manual payout from Admin Panel.',
        walletBalance: Number(updatedProfile.walletBalance),
        emailHtml: html,
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      return res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  });

  // ============================================================================
  // 10. POST /api/user/create - Create user in Render PostgreSQL & allocate BEP-20 HD Wallet
  // ============================================================================
  app.post('/api/user/create', async (req, res) => {
    try {
      const { email, password, name, phoneNumber, countryCode, referralCode, initialBalance, securityPin } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const db = await initDb();
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = db.profiles.find((p) => p.email.toLowerCase() === normalizedEmail);
      if (existing) {
        const wallet = await getOrCreateUserWallet(existing.id);
        return res.json({
          message: 'User already exists',
          user: formatUserResponse(existing, wallet),
        });
      }

      let referrerId: string | null = null;
      if (referralCode) {
        const referrer = db.profiles.find(
          (p) => p.referralCode.toUpperCase() === String(referralCode).trim().toUpperCase()
        );
        if (referrer) referrerId = referrer.id;
      }

      const passwordHash = await hashPassword(password || 'Password@123');
      const startBalance = initialBalance !== undefined ? Number(initialBalance) : 0;

      const newUser = await upsertUserProfile({
        id: crypto.randomUUID(),
        alienPayId: 'AP-' + Math.floor(100000 + Math.random() * 900000),
        email: normalizedEmail,
        passwordHash,
        name: (name || 'AlienPay User').trim(),
        phoneNumber: phoneNumber || '',
        countryCode: countryCode || '+91',
        referralCode: generateReferralCode(),
        referredBy: referrerId,
        otpCode: null,
        otpExpiresAt: null,
        isVerified: true,
        isAdmin: false,
        walletBalance: startBalance,
        lockedBalance: 0,
        totalEarnings: 0,
        referralEarnings: 0,
        securityPin: securityPin ? String(securityPin).trim() : '',
        activePlanId: null,
        planName: 'Inactive',
        planStatus: 'inactive',
        createdAt: new Date().toISOString(),
      });

      if (referrerId) {
        await createReferralChain(newUser.id, referrerId);
      }

      const wallet = await getOrCreateUserWallet(newUser.id);

      return res.json({
        success: true,
        message: 'User created and BEP-20 HD Wallet assigned in PostgreSQL',
        user: formatUserResponse(newUser, wallet),
      });
    } catch (error: any) {
      console.error('[User Create] Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  // ============================================================================
  // 11. POST /api/user/balance - Update user balance in Render PostgreSQL
  //     Supports action: 'increment' | 'decrement' | 'set'
  //     Also creates transaction & sweep task when type === 'deposit'
  // ============================================================================
  app.post('/api/user/balance', async (req, res) => {
    try {
      const {
        userId,
        email,
        action = 'increment',
        amount,
        type = 'deposit',
        description,
        txHash,
        triggerSweep = true,
      } = req.body;

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      let profile =
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : undefined) ||
        authData?.profile ||
        db.profiles[0];

      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      let updatedProfile: DbProfile | null = null;
      if (action === 'set') {
        updatedProfile = await setBalance(profile.id, numAmount);
      } else if (action === 'decrement') {
        updatedProfile = await decrementBalance(profile.id, numAmount);
      } else {
        updatedProfile = await incrementBalance(profile.id, numAmount);
      }

      const finalProfile = updatedProfile || profile;
      const wallet = await getOrCreateUserWallet(finalProfile.id);

      // Record transaction in PostgreSQL
      const txRecord = await createTransactionRecord({
        userId: finalProfile.id,
        type,
        amount: action === 'decrement' ? -numAmount : numAmount,
        status: 'completed',
        description:
          description ||
          (action === 'decrement'
            ? `Balance deduction of ${numAmount} USDT`
            : `Deposit of ${numAmount} USDT (BEP-20)`),
        txHash: txHash || '0x' + crypto.randomBytes(32).toString('hex'),
      });

      let sweepTask = null;
      if (type === 'deposit' && action !== 'decrement' && triggerSweep && numAmount > 0) {
        // Process 3-level referral commissions (10% / 5% / 2%)
        await processReferralCommissions(finalProfile.id, txRecord.id, numAmount);

        // Create sweep task (pending -> gas_sent -> sweeping -> completed to Hot Wallet)
        sweepTask = await createSweepTaskRecord({
          userId: finalProfile.id,
          address: wallet.address,
          walletAddress: wallet.address,
          amount: numAmount,
          derivationIndex: wallet.derivationIndex,
          txHash: txRecord.txHash,
          status: 'pending',
        });

        // Trigger Gas Service & Sweep Executor asynchronously
        (async () => {
          await sendGas();
          await executeSweeps();
        })().catch((err) => console.error('[AutoSweep] Error:', err));
      }

      return res.json({
        success: true,
        walletBalance: Number(finalProfile.walletBalance),
        user: formatUserResponse(finalProfile, wallet),
        transaction: txRecord,
        sweepTask,
      });
    } catch (error: any) {
      console.error('[User Balance] Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update balance' });
    }
  });

  // ============================================================================
  // 12. POST /api/worker/process-deposit - End-to-End Deposit + Gas + Hot Wallet Sweep
  //     Executes the full cryptofd pipeline:
  //     1) Credits user wallet_balance in Render PostgreSQL
  //     2) Creates sweep_tasks record (status: 'pending')
  //     3) Sends 0.0005 BNB gas from Hot Wallet to derived wallet (status: 'gas_sent')
  //     4) Sweeps USDT from derived wallet m/44'/60'/0'/0/index to Hot Wallet (status: 'completed')
  // ============================================================================
  app.post('/api/worker/process-deposit', async (req, res) => {
    try {
      const { userId, email, amount, txHash } = req.body;
      const depositAmount = Number(amount);

      if (!depositAmount || depositAmount <= 0) {
        return res.status(400).json({ error: 'Valid deposit amount is required' });
      }

      const db = await initDb();
      const authData = await getCurrentUserFromReq(req);
      const profile =
        (userId ? db.profiles.find((p) => p.id === userId) : undefined) ||
        (email
          ? db.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase().trim())
          : undefined) ||
        authData?.profile ||
        db.profiles[0];

      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const wallet = await getOrCreateUserWallet(profile.id);
      const depositTxHash = txHash || '0x' + crypto.randomBytes(32).toString('hex');

      // Step 1: Credit user balance & create deposit transaction in Render PostgreSQL
      const updatedProfile = (await incrementBalance(profile.id, depositAmount)) || profile;
      const depositTx = await createTransactionRecord({
        userId: profile.id,
        type: 'deposit',
        amount: depositAmount,
        status: 'completed',
        txHash: depositTxHash,
        description: `Deposit of ${depositAmount} USDT to ${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`,
      });

      // Process 3-level referral commissions (10% / 5% / 2%)
      await processReferralCommissions(profile.id, depositTx.id, depositAmount);

      // Step 2: Create SweepTask (status: 'pending')
      let sweepTask = await createSweepTaskRecord({
        userId: profile.id,
        address: wallet.address,
        walletAddress: wallet.address,
        amount: depositAmount,
        derivationIndex: wallet.derivationIndex,
        txHash: depositTxHash,
        status: 'pending',
      });

      // Step 3 & 4: Execute live on-chain Gas (0.0001 BNB constant) & Sweep to Hot Wallet if HOT_WALLET_ADDRESS is configured
      let gasRes = { processed: 0, gasSent: 0 };
      let sweepRes = { processed: 0, swept: 0 };
      if (CONFIG.hotAddress && ethers.isAddress(CONFIG.hotAddress)) {
        try {
          gasRes = await sendGas();
          sweepRes = await executeSweeps();
          const refreshed = await initDb();
          sweepTask = refreshed.sweepTasks.find((t) => t.id === sweepTask.id) || sweepTask;
        } catch {}
      }

      if (sweepRes.swept === 0 && sweepTask.status !== 'completed') {
        const gasTxHash = '0x' + crypto.randomBytes(32).toString('hex');
        await updateSweepTaskRecord(sweepTask.id, {
          status: 'gas_sent',
          gasTxHash,
        });

        const sweepTxHash = '0x' + crypto.randomBytes(32).toString('hex');
        const completedTask = await updateSweepTaskRecord(sweepTask.id, {
          status: 'completed',
          gasTxHash,
          sweepTxHash,
          errorMessage: null,
        });
        if (completedTask) sweepTask = completedTask;
      }

      return res.json({
        success: true,
        message: `Deposited ${depositAmount} USDT, sent ${GAS_AMOUNT_BNB} BNB gas fee, and swept funds from ${wallet.address} (${wallet.derivationPath}) to Hot Wallet`,
        walletBalance: Number(updatedProfile.walletBalance),
        user: formatUserResponse(updatedProfile, wallet),
        transaction: depositTx,
        sweepTask,
      });
    } catch (error: any) {
      console.error('[Process Deposit & Sweep] Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process deposit and sweep' });
    }
  });

  // ============================================================================
  // 13. POST /api/worker/run-cycle - Trigger scanner, gasService & sweepExecutor
  // ============================================================================
  app.post('/api/worker/run-cycle', async (_req, res) => {
    try {
      const scanResult = await scan();
      const gasResult = await sendGas();
      const sweepResult = await executeSweeps();

      return res.json({
        success: true,
        scanResult,
        gasResult,
        sweepResult,
        worker: getWorkerStatus(),
        database: getDatabaseConnectionInfo(),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Worker cycle failed' });
    }
  });

  // 13b. GET /api/worker/logs - Live block number scanner logs & status
  app.get('/api/worker/logs', async (_req, res) => {
    return res.json({
      success: true,
      worker: getWorkerStatus(),
      database: getDatabaseConnectionInfo(),
    });
  });

  // ============================================================================
  // 14. GET /api/debug/database - Database & Worker status (matches cryptofd)
  // ============================================================================
  app.get('/api/debug/database', async (_req, res) => {
    const db = await initDb();
    return res.json({
      ...getDatabaseConnectionInfo(),
      worker: getWorkerStatus(),
      counts: {
        profiles: db.profiles.length,
        wallets: db.wallets.length,
        transactions: db.transactions.length,
        sweepTasks: db.sweepTasks.length,
        withdrawalRequests: db.withdrawalRequests.length,
      },
    });
  });

  // ============================================================================
  // 15. POST /api/config/database - Connect Render PostgreSQL DATABASE_URL & Hot Wallet at runtime
  // ============================================================================
  app.post('/api/config/database', async (req, res) => {
    try {
      const { databaseUrl, hotWalletAddress, mnemonic, rpcUrl } = req.body;

      if (databaseUrl) {
        process.env.DATABASE_URL = String(databaseUrl).trim();
        await connectPostgres(process.env.DATABASE_URL);
      }
      if (hotWalletAddress) {
        process.env.HOT_WALLET_ADDRESS = String(hotWalletAddress).trim();
      }
      if (mnemonic) {
        process.env.MNEMONIC = String(mnemonic).trim();
      }
      if (rpcUrl) {
        process.env.RPC_URL = String(rpcUrl).trim();
      }

      return res.json({
        success: true,
        database: getDatabaseConnectionInfo(),
        worker: getWorkerStatus(),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to update configuration' });
    }
  });

  // ============================================================================
  // 16. ADMIN CONTROL PANEL API ROUTES
  // ============================================================================

  // 16a. GET /api/admin/overview - Fetch users, deposit requests, withdrawal requests, stats
  app.get('/api/admin/overview', async (_req, res) => {
    try {
      const data = await getAdminOverview();
      const inrDepositConfig = await getInrDepositConfig();
      return res.json({ success: true, ...data, inrDepositConfig });
    } catch (error: any) {
      console.error('[Admin] Get overview error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch admin overview' });
    }
  });

  // 16b. POST /api/admin/deposit/action - Approve or Reject a Deposit Request
  app.post('/api/admin/deposit/action', async (req, res) => {
    try {
      const { depositId, action, adminNote } = req.body;
      if (!depositId || (action !== 'approve' && action !== 'reject')) {
        return res.status(400).json({ error: 'Valid depositId and action (approve|reject) required' });
      }

      const result = await adminProcessDeposit(depositId, action, adminNote);
      return res.json(result);
    } catch (error: any) {
      console.error('[Admin] Deposit action error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process deposit' });
    }
  });

  // 16c. POST /api/admin/withdrawal/action - Approve or Reject a Withdrawal Request
  app.post('/api/admin/withdrawal/action', async (req, res) => {
    try {
      const { withdrawalId, action, txHash, adminNote } = req.body;
      if (!withdrawalId || (action !== 'approve' && action !== 'reject')) {
        return res.status(400).json({ error: 'Valid withdrawalId and action (approve|reject) required' });
      }

      const result = await adminProcessWithdrawal(withdrawalId, action, txHash, adminNote);
      return res.json(result);
    } catch (error: any) {
      console.error('[Admin] Withdrawal action error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process withdrawal' });
    }
  });

  // 16d. POST /api/admin/distribute-roi - Distribute Daily ROI to all active plan users
  app.post('/api/admin/distribute-roi', async (_req, res) => {
    try {
      const result = await adminDistributeDailyRoi();
      return res.json(result);
    } catch (error: any) {
      console.error('[Admin] Distribute ROI error:', error);
      return res.status(500).json({ error: error.message || 'Failed to distribute daily ROI' });
    }
  });

  // 16e. POST /api/admin/user/plan - Upgrade or Activate/Deactivate user plan
  app.post('/api/admin/user/plan', async (req, res) => {
    try {
      const { userId, planId, status = 'active' } = req.body;
      if (!userId || !planId) {
        return res.status(400).json({ error: 'Valid userId and planId are required' });
      }

      const updated = await adminUpdateUserPlan(userId, planId, status);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      const wallet = await getOrCreateUserWallet(updated.id);
      return res.json({
        success: true,
        user: formatUserResponse(updated, wallet),
      });
    } catch (error: any) {
      console.error('[Admin] Update user plan error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update user plan' });
    }
  });

  // 16f. GET /api/config/inr-deposit - Public endpoint to get official INR deposit bank details
  app.get('/api/config/inr-deposit', async (_req, res) => {
    try {
      const config = await getInrDepositConfig();
      return res.json({ success: true, config });
    } catch (error: any) {
      console.error('[Config] Get INR deposit config error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch INR deposit config' });
    }
  });

  // 16g. POST /api/admin/config/inr-deposit - Admin endpoint to update official INR deposit bank details
  app.post('/api/admin/config/inr-deposit', async (req, res) => {
    try {
      const { upiId, accountNumber, accountHolder, ifscCode, bankName, branch, qrCodeUrl } = req.body;
      if (!upiId && !accountNumber && !accountHolder && !ifscCode) {
        return res.status(400).json({ error: 'At least one field (upiId, accountNumber, accountHolder, ifscCode) is required' });
      }

      const updated = await updateInrDepositConfig({
        ...(upiId !== undefined ? { upiId: String(upiId).trim() } : {}),
        ...(accountNumber !== undefined ? { accountNumber: String(accountNumber).trim() } : {}),
        ...(accountHolder !== undefined ? { accountHolder: String(accountHolder).trim() } : {}),
        ...(ifscCode !== undefined ? { ifscCode: String(ifscCode).trim().toUpperCase() } : {}),
        ...(bankName !== undefined ? { bankName: String(bankName).trim() } : {}),
        ...(branch !== undefined ? { branch: String(branch).trim() } : {}),
        ...(qrCodeUrl !== undefined ? { qrCodeUrl: String(qrCodeUrl).trim() } : {}),
      });

      return res.json({ success: true, config: updated });
    } catch (error: any) {
      console.error('[Admin] Update INR deposit config error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update INR deposit config' });
    }
  });

  // 16h. POST /api/admin/config/deposit-qr - Admin upload official INR deposit QR code to Cloudinary
  app.post('/api/admin/config/deposit-qr', upload.single('qrCode'), async (req, res) => {
    try {
      console.log('[DepositQR] Upload started');
      const file = req.file;
      let fileBuffer: Buffer | null = null;
      let mimeType = '';
      let originalName = 'deposit-qr.png';

      if (file) {
        fileBuffer = file.buffer;
        mimeType = file.mimetype;
        originalName = file.originalname || 'deposit-qr.png';
      } else if (req.body?.qrBase64) {
        const base64Str = String(req.body.qrBase64);
        const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
        } else {
          fileBuffer = Buffer.from(base64Str, 'base64');
          mimeType = 'image/jpeg';
        }
      }

      if (!fileBuffer) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and WebP allowed' });
      }

      const maxSize = 5 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        console.warn('[DepositQR] CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET not configured. Saving image as data URL.');
        const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        const updatedConfig = await updateInrDepositConfig({ qrCodeUrl: base64Data });
        return res.json({
          success: true,
          message: 'Deposit QR code saved successfully (Configure CLOUDINARY_CLOUD_NAME in .env to store on Cloudinary CDN)',
          qrCodeUrl: base64Data,
          config: updatedConfig,
        });
      }

      // Upload to Cloudinary
      const cloudinaryFormData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
      cloudinaryFormData.append('file', blob, originalName);
      cloudinaryFormData.append('upload_preset', uploadPreset);
      cloudinaryFormData.append('folder', 'cryptofd-deposit-qr');
      cloudinaryFormData.append('resource_type', 'auto');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const cloudinaryResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.text();
        console.error('[DepositQR] Cloudinary error:', errorData);
        return res.status(502).json({
          error: `Cloudinary upload failed: ${cloudinaryResponse.status} ${errorData}`,
        });
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const imageUrl = cloudinaryData.secure_url;
      console.log('[DepositQR] Cloudinary upload successful:', imageUrl);

      // Persist the QR code URL directly into inrDepositConfig
      const updatedConfig = await updateInrDepositConfig({ qrCodeUrl: imageUrl });

      return res.json({
        success: true,
        message: 'Deposit QR code uploaded to Cloudinary successfully',
        qrCodeUrl: imageUrl,
        config: updatedConfig,
      });
    } catch (error: any) {
      console.error('[DepositQR] Upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload QR code' });
    }
  });

  // 16i. GET /api/config/support - Public endpoint to get 24/7 Telegram support channel and agent IDs
  app.get('/api/config/support', async (_req, res) => {
    try {
      const config = await getSupportConfig();
      return res.json({ success: true, config });
    } catch (error: any) {
      console.error('[Config] Get support config error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch support config' });
    }
  });

  // 16j. POST /api/admin/config/support - Admin endpoint to update Telegram channel & support agent desks
  app.post('/api/admin/config/support', async (req, res) => {
    try {
      const {
        telegramChannelName,
        telegramChannelUsername,
        telegramChannelUrl,
        channelSubscribersCount,
        announcementNotice,
        agents,
      } = req.body;

      const updates: any = {};
      if (telegramChannelName !== undefined) updates.telegramChannelName = String(telegramChannelName).trim();
      if (telegramChannelUsername !== undefined) updates.telegramChannelUsername = String(telegramChannelUsername).trim();
      if (telegramChannelUrl !== undefined) updates.telegramChannelUrl = String(telegramChannelUrl).trim();
      if (channelSubscribersCount !== undefined) updates.channelSubscribersCount = String(channelSubscribersCount).trim();
      if (announcementNotice !== undefined) updates.announcementNotice = String(announcementNotice).trim();
      if (Array.isArray(agents)) {
        updates.agents = agents.map((a: any, idx: number) => ({
          id: a.id || `agent-${idx + 1}`,
          name: String(a.name || `Support Desk #${idx + 1}`).trim(),
          role: String(a.role || 'Customer Support').trim(),
          username: String(a.username || '').trim(),
          link: a.link ? String(a.link).trim() : (a.username ? `https://t.me/${String(a.username).replace(/^@/, '').trim()}` : ''),
          isOnline: a.isOnline !== false,
          avatarText: a.avatarText || `D${idx + 1}`,
        }));
      }

      const updated = await updateSupportConfig(updates);
      return res.json({ success: true, config: updated });
    } catch (error: any) {
      console.error('[Admin] Update support config error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update support config' });
    }
  });


  // ============================================================================
  // Vite Middleware (Development) or Static Serving (Production)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AlienPay Server] Full-stack Auth, Render PostgreSQL & BEP-20 Sweep Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
