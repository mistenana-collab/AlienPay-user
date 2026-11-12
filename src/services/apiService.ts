import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { AuthApiConfig, UserProfile, InrDepositConfig, SupportConfig } from '../types';

const STORAGE_KEY_AUTH_CONFIG = 'alienpay_api_config';
const STORAGE_KEY_USER_PROFILE = 'alienpay_user_profile';
const STORAGE_KEY_AUTH_TOKEN = 'alienpay_auth_token';

const FALLBACK_MNEMONIC = 'test test test test test test test test test test test junk';

export function deriveClientBep20Address(index: number): {
  address: string;
  derivationIndex: number;
  derivationPath: string;
  network: string;
} {
  const derivationPath = `m/44'/60'/0'/0/${index}`;
  const wallet = ethers.HDNodeWallet.fromPhrase(FALLBACK_MNEMONIC, undefined, derivationPath);
  return {
    address: wallet.address.toLowerCase(),
    derivationIndex: index,
    derivationPath,
    network: 'BEP-20 (BSC)',
  };
}

export const DEFAULT_API_CONFIG: AuthApiConfig = {
  mode: 'built_in',
  baseUrl: '/api',
  loginEndpoint: '/auth/login',
  signupEndpoint: '/auth/register',
  profileEndpoint: '/auth/me',
  tokenKey: 'token',
  token: null,
  customHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

const defaultDerivedWallet = deriveClientBep20Address(0);

export const DEFAULT_USER: UserProfile = {
  id: 'usr_84920412',
  alienPayId: 'AP-784920',
  fullName: 'Rohit Sharma',
  email: 'rohitdear054@gmail.com',
  phoneNumber: '9876543210',
  countryCode: '+91',
  avatarUrl: '',
  kycStatus: 'verified',
  vipTier: 'Normal',
  referralCode: 'ALIEN99',
  uplineReferralCode: 'BOSS01',
  joinedDate: '2026-03-15',
  activePlanId: null,
  planName: 'Inactive',
  planStatus: 'inactive',
  subscriptionStartDate: undefined,
  subscriptionDaysLeft: 0,
  bankDetails: {
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
  },
  cryptoDetails: {
    bep20Address: '',
  },
  depositWallet: {
    address: defaultDerivedWallet.address,
    derivationIndex: defaultDerivedWallet.derivationIndex,
    derivationPath: defaultDerivedWallet.derivationPath,
    network: defaultDerivedWallet.network,
    qrCode: null,
  },
  securityPin: '',
  biometricEnabled: true,
  pinAuthRequired: true,
};

export class ApiService {
  private static config: AuthApiConfig = ApiService.loadConfig();

  public static loadConfig(): AuthApiConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH_CONFIG);
      if (stored) {
        return { ...DEFAULT_API_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_API_CONFIG;
  }

  public static saveConfig(newConfig: Partial<AuthApiConfig>): AuthApiConfig {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_CONFIG, JSON.stringify(this.config));
    } catch {
      // ignore
    }
    return this.config;
  }

  public static getConfig(): AuthApiConfig {
    return this.config;
  }

  public static getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN) || this.config.token || null;
  }

  public static setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
      this.saveConfig({ token });
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
      this.saveConfig({ token: null });
    }
  }

  public static getStoredUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (data) {
        const parsed: UserProfile = JSON.parse(data);
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static saveUser(user: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  public static removeUser(): void {
    localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }

  /**
   * Fetch live user profile directly from Render PostgreSQL
   */
  public static async fetchUserProfile(user?: UserProfile | null): Promise<UserProfile | null> {
    const activeUser = user || this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();
    try {
      const params = new URLSearchParams();
      if (activeUser.id) params.set('userId', activeUser.id);
      if (activeUser.email) params.set('email', activeUser.email);

      const res = await fetch(`/api/user/profile?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const fresh = data.user;
          const merged: UserProfile = {
            ...activeUser,
            ...fresh,
            avatarUrl: fresh.avatarUrl || fresh.profilePhoto || activeUser.avatarUrl,
            profilePhoto: fresh.profilePhoto || fresh.avatarUrl || activeUser.profilePhoto,
            bankDetails: {
              ...(activeUser.bankDetails || {}),
              ...(fresh.bankDetails || {}),
              upiId: fresh.bankDetails?.upiId !== undefined ? fresh.bankDetails.upiId : activeUser.bankDetails?.upiId,
            },
            cryptoDetails: {
              ...(activeUser.cryptoDetails || {}),
              ...(fresh.cryptoDetails || {}),
              bep20Address: fresh.cryptoDetails?.bep20Address !== undefined ? fresh.cryptoDetails.bep20Address : activeUser.cryptoDetails?.bep20Address,
            },
            depositWallet: fresh.depositWallet || activeUser.depositWallet,
          };
          this.saveUser(merged);
          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch user profile:', e);
    }
    return null;
  }

  /**
   * Fetch or generate unique HD Wallet BEP-20 deposit address & QR Code for the current user
   * Matches cryptofd GET /api/wallet
   */
  public static async fetchUserWallet(user?: UserProfile | null): Promise<{
    user?: UserProfile;
    wallet: {
      balance: number;
      locked: number;
      total: number;
      totalEarnings: number;
      referralEarnings: number;
    };
    depositAddress: {
      address: string;
      derivationIndex: number;
      derivationPath: string;
      network: string;
      qrCode: string | null;
    };
    hasAddress: boolean;
  }> {
    const activeUser = user || this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    try {
      const params = new URLSearchParams();
      if (activeUser.id) params.set('userId', activeUser.id);
      if (activeUser.email) params.set('email', activeUser.email);

      const res = await fetch(`/api/wallet?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const serverUser = data.user || null;
        const updatedUser: UserProfile = {
          ...activeUser,
          ...(serverUser || {}),
          avatarUrl: serverUser?.avatarUrl || serverUser?.profilePhoto || activeUser.avatarUrl,
          profilePhoto: serverUser?.profilePhoto || serverUser?.avatarUrl || activeUser.profilePhoto,
          bankDetails: {
            ...(activeUser.bankDetails || {}),
            ...(serverUser?.bankDetails || {}),
            upiId: serverUser?.bankDetails?.upiId !== undefined ? serverUser.bankDetails.upiId : activeUser.bankDetails?.upiId,
          },
          cryptoDetails: {
            ...(activeUser.cryptoDetails || {}),
            ...(serverUser?.cryptoDetails || {}),
            bep20Address: serverUser?.cryptoDetails?.bep20Address !== undefined ? serverUser.cryptoDetails.bep20Address : activeUser.cryptoDetails?.bep20Address,
          },
          depositWallet: data.depositAddress || activeUser.depositWallet,
        };
        this.saveUser(updatedUser);
        return {
          ...data,
          user: updatedUser,
        };
      }
    } catch (err) {
      console.warn('Wallet API fallback to local HD derivation:', err);
    }

    // Client-side deterministic HD wallet derivation fallback
    const index = activeUser.depositWallet?.derivationIndex ?? 0;
    const derived = deriveClientBep20Address(index);
    let qrCode: string | null = null;
    try {
      qrCode = await QRCode.toDataURL(derived.address, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    } catch {}

    return {
      wallet: {
        balance: 0,
        locked: 0,
        total: 0,
        totalEarnings: 0,
        referralEarnings: 0,
      },
      depositAddress: {
        ...derived,
        qrCode,
      },
      hasAddress: true,
    };
  }

  /**
   * Fetch real 3-level referral network and referral commissions from Render PostgreSQL
   * Matches cryptofd getReferrals() and getTeamStats()
   */
  public static async fetchReferrals(user?: UserProfile | null): Promise<any> {
    const activeUser = user || this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const params = new URLSearchParams();
    if (activeUser.id) params.set('userId', activeUser.id);
    if (activeUser.email) params.set('email', activeUser.email);

    const res = await fetch(`/api/referrals?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch referrals');
    }
    return res.json();
  }

  /**
   * Record real INR manual deposit, plan subscription, or commission transaction in PostgreSQL
   */
  public static async recordTransaction(payload: {
    userId?: string;
    email?: string;
    type: string;
    amountUsdt: number;
    status?: 'pending' | 'completed' | 'failed';
    description?: string;
    txHash?: string;
    referenceId?: string;
    planId?: string;
    planName?: string;
  }): Promise<any> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/transactions/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        ...payload,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to record transaction');
    }
    return res.json();
  }

  /**
   * Update Bound Payout Accounts (UPI ID & USDT BEP-20 Address) in Render PostgreSQL
   */
  public static async updatePayoutAccounts(payload: {
    userId?: string;
    email?: string;
    upiId: string;
    bep20Address: string;
  }): Promise<{ success: boolean; user?: UserProfile }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/user/payout-accounts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        upiId: payload.upiId,
        bep20Address: payload.bep20Address,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to update payout accounts');
    }
    const data = await res.json();
    if (data.user) {
      const merged: UserProfile = {
        ...activeUser,
        ...data.user,
        avatarUrl: data.user.avatarUrl || data.user.profilePhoto || activeUser.avatarUrl,
        profilePhoto: data.user.profilePhoto || data.user.avatarUrl || activeUser.profilePhoto,
        bankDetails: {
          ...(activeUser.bankDetails || {}),
          ...(data.user.bankDetails || {}),
          upiId: data.user.bankDetails?.upiId !== undefined ? data.user.bankDetails.upiId : payload.upiId,
        },
        cryptoDetails: {
          ...(activeUser.cryptoDetails || {}),
          ...(data.user.cryptoDetails || {}),
          bep20Address: data.user.cryptoDetails?.bep20Address !== undefined ? data.user.cryptoDetails.bep20Address : payload.bep20Address,
        },
      };
      this.saveUser(merged);
      return { success: true, user: merged };
    }
    return data;
  }

  /**
   * Upload user profile photo to Cloudinary via backend (/api/user/profile-photo)
   * Exact implementation matching cryptofd
   */
  public static async uploadProfilePhoto(
    file: File
  ): Promise<{ success: boolean; photo?: string; error?: string; user?: UserProfile }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch('/api/user/profile-photo', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload photo');
    }

    if (data.photo) {
      const activeUser = this.getStoredUser() || DEFAULT_USER;
      const updated: UserProfile = {
        ...activeUser,
        ...(data.user || {}),
        avatarUrl: data.photo,
        profilePhoto: data.photo,
      };
      this.saveUser(updated);
      return { ...data, user: updated };
    }
    return data;
  }

  /**
   * Transfer accumulated commissions and bonuses to Main Wallet in database
   */
  public static async transferCommission(payload: {
    amountInr?: number;
    amountUsdt?: number;
    userId?: string;
    email?: string;
    fundType?: 'gaming' | 'stock';
    description?: string;
  }): Promise<{ success: boolean; newBalance?: number; message?: string; transaction?: any }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/commissions/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        amountInr: payload.amountInr,
        amountUsdt: payload.amountUsdt,
        fundType: payload.fundType,
        description: payload.description,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to transfer commission');
    }

    if (data.user) {
      this.saveUser({ ...activeUser, ...data.user });
    }
    return data;
  }

  /**
   * Add a user bank account to Render PostgreSQL bank_accounts table
   */
  public static async addBankAccount(account: any): Promise<{ success: boolean; bankAccounts: any[] }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/bank-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: activeUser.id,
        email: activeUser.email,
        account,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to save bank account to database');
    }
    return res.json();
  }

  /**
   * Update bank account (e.g. toggle isRunning or set isPrimary) in Render PostgreSQL
   */
  public static async updateBankAccount(
    id: string,
    updates: {
      isRunning?: boolean;
      isPrimary?: boolean;
      runningVolumeProcessed?: number;
      accumulatedCommission?: number;
    }
  ): Promise<{ success: boolean; bankAccounts: any[] }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch(`/api/bank-accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: activeUser.id,
        email: activeUser.email,
        ...updates,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to update bank account in database');
    }
    return res.json();
  }

  /**
   * Delete a bank account from Render PostgreSQL
   */
  public static async deleteBankAccount(id: string): Promise<{ success: boolean; bankAccounts: any[] }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const params = new URLSearchParams();
    if (activeUser.id) params.set('userId', activeUser.id);
    if (activeUser.email) params.set('email', activeUser.email);

    const res = await fetch(`/api/bank-accounts/${encodeURIComponent(id)}?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete bank account from database');
    }
    return res.json();
  }

  /**
   * Submit INR Deposit Request to Render PostgreSQL (deposit_requests + transactions tables) for Admin Verification
   */
  public static async submitInrDepositRequest(payload: {
    amountInr: number;
    amountUsdt: number;
    utrNumber: string;
    method?: string;
  }): Promise<{
    success: boolean;
    depositRequest: any;
    transaction: any;
    uiTransaction: any;
  }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/deposits/inr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: activeUser.id,
        email: activeUser.email,
        ...payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit INR deposit request');
    }
    return data;
  }

  /**
   * 2-Step Login matching cryptofd/app/api/auth/login/route.ts
   * - Without `otp`: validates credentials and sends 6-digit login OTP email
   * - With `otp`: verifies OTP, sets JWT cookie & returns authenticated user + HD wallet
   */
  public static async login(credentials: {
    identifier: string;
    password: string;
    otp?: string;
    skipOtp?: boolean;
  }): Promise<{
    success: boolean;
    requiresOtp?: boolean;
    requiresVerification?: boolean;
    email?: string;
    otp?: string;
    emailHtml?: string;
    user?: UserProfile;
    token?: string;
    message?: string;
  }> {
    const email = credentials.identifier.trim().toLowerCase();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        identifier: email,
        password: credentials.password,
        otp: credentials.otp,
        skipOtp: credentials.skipOtp,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Invalid email or password');
    }

    if (data.requiresOtp || data.requiresVerification) {
      return {
        success: false,
        requiresOtp: true,
        requiresVerification: data.requiresVerification,
        email: data.email || email,
        otp: data.otp,
        emailHtml: data.emailHtml,
        message: data.message || 'Verification code sent to your email',
      };
    }

    const token = data.token || 'alien_jwt_' + Date.now();
    const mergedUser: UserProfile = {
      ...DEFAULT_USER,
      ...(data.user || {}),
      fullName: data.user?.fullName || data.user?.name || DEFAULT_USER.fullName,
      email: data.user?.email || email,
    };

    this.setToken(token);
    this.saveUser(mergedUser);

    return {
      success: true,
      user: mergedUser,
      token,
      message: data.message || 'Login successful',
    };
  }

  /**
   * Step 1 of Registration: POST /api/auth/register
   * Creates unverified user, derives unique BEP-20 HD wallet address, and sends OTP email
   */
  public static async startRegistration(payload: {
    fullName: string;
    email: string;
    password: string;
    referralCode?: string;
    securityPin?: string;
    phoneNumber?: string;
    countryCode?: string;
  }): Promise<{
    email: string;
    otp?: string;
    emailHtml?: string;
    message: string;
    depositAddress?: {
      address: string;
      derivationIndex: number;
      derivationPath: string;
      network: string;
      qrCode: string | null;
    };
  }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.fullName,
        fullName: payload.fullName,
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        referralCode: payload.referralCode,
        securityPin: payload.securityPin,
        phoneNumber: payload.phoneNumber || '',
        countryCode: payload.countryCode || '+91',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return {
      email: data.email || payload.email.trim().toLowerCase(),
      otp: data.otp,
      emailHtml: data.emailHtml,
      message: data.message || 'Verification code sent to your email',
      depositAddress: data.depositAddress,
    };
  }

  /**
   * Step 2 of Registration: POST /api/auth/verify-otp
   * Verifies 6-digit OTP, credits 5 USDT signup bonus, creates 3-level referral chain,
   * sends Welcome + Signup Bonus emails, and logs user in.
   */
  public static async verifyRegistrationOtp(payload: {
    email: string;
    otp: string;
    securityPin?: string;
  }): Promise<{
    success: boolean;
    user: UserProfile;
    token: string;
    signupBonusCredited?: number;
    welcomeEmailHtml?: string;
    bonusEmailHtml?: string;
    message: string;
  }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        otp: payload.otp.trim(),
        ...(payload.securityPin ? { securityPin: payload.securityPin.trim() } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    const token = data.token || 'alien_jwt_' + Date.now();
    const user: UserProfile = {
      ...DEFAULT_USER,
      ...(data.user || {}),
      fullName: data.user?.fullName || data.user?.name || 'AlienPay User',
      email: data.user?.email || payload.email.trim().toLowerCase(),
      securityPin: data.user?.securityPin || payload.securityPin?.trim() || '',
      activePlanId: null,
      planName: 'Inactive',
      planStatus: 'inactive',
    };

    this.setToken(token);
    this.saveUser(user);

    return {
      success: true,
      user,
      token,
      signupBonusCredited: data.signupBonusCredited,
      welcomeEmailHtml: data.welcomeEmailHtml,
      bonusEmailHtml: data.bonusEmailHtml,
      message: data.message || 'Verification successful!',
    };
  }

  /**
   * Legacy register wrapper for compatibility
   */
  public static async register(payload: {
    fullName: string;
    email: string;
    phoneNumber: string;
    countryCode: string;
    password: string;
    referralCode?: string;
    securityPin?: string;
    otp?: string;
  }): Promise<{ success: boolean; user: UserProfile; token: string; message?: string }> {
    const startRes = await this.startRegistration(payload);
    const verifyRes = await this.verifyRegistrationOtp({
      email: payload.email,
      otp: payload.otp || startRes.otp || '123456',
    });
    return {
      success: true,
      user: verifyRes.user,
      token: verifyRes.token,
      message: verifyRes.message,
    };
  }

  /**
   * Send Password Reset OTP via POST /api/auth/forgot-password
   */
  public static async sendForgotPasswordOtp(email: string): Promise<{
    otp?: string;
    emailHtml?: string;
    message: string;
  }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset email');
    }

    return {
      otp: data.otp,
      emailHtml: data.emailHtml,
      message: data.message || 'Password reset code sent to your email',
    };
  }

  /**
   * Reset password with verified OTP via POST /api/auth/reset-password
   */
  public static async resetPasswordWithOtp(payload: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        otp: payload.otp.trim(),
        newPassword: payload.newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    return {
      success: true,
      message: data.message || 'Password reset successfully! You can now sign in with your new password.',
    };
  }

  /**
   * Verify user security PIN strictly against user's configured PIN
   */
  public static verifySecurityPin(inputPin: string, userOverride?: UserProfile): boolean {
    const user = userOverride || this.getStoredUser() || DEFAULT_USER;
    const correctPin = (user.securityPin || '').trim();
    if (!correctPin) return false;
    return inputPin.trim() === correctPin;
  }

  /**
   * Update user security PIN and/or Biometric setting in PostgreSQL + localStorage
   */
  public static async updateSecuritySettings(payload: {
    userId?: string;
    email?: string;
    currentPin?: string;
    newPin?: string;
    biometricEnabled?: boolean;
  }): Promise<{ success: boolean; user: UserProfile; message: string }> {
    const storedUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/user/security', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || storedUser.id,
        email: payload.email || storedUser.email,
        currentPin: payload.currentPin,
        newPin: payload.newPin,
        biometricEnabled: payload.biometricEnabled,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update security settings');
    }

    const updatedUser: UserProfile = {
      ...storedUser,
      ...(data.user || {}),
      securityPin: payload.newPin !== undefined ? payload.newPin.trim() : (data.user?.securityPin ?? storedUser.securityPin),
      biometricEnabled:
        payload.biometricEnabled !== undefined
          ? payload.biometricEnabled
          : (data.user?.biometricEnabled ?? storedUser.biometricEnabled),
    };

    this.saveUser(updatedUser);
    return {
      success: true,
      user: updatedUser,
      message: data.message || 'Security settings updated successfully!',
    };
  }

  /**
   * Update user security PIN (syncs with PostgreSQL database)
   */
  public static async updateSecurityPin(newPin: string, currentPin?: string): Promise<UserProfile> {
    if (!newPin || newPin.trim().length < 4) {
      throw new Error('PIN must be at least 4 digits.');
    }
    const res = await this.updateSecuritySettings({
      currentPin,
      newPin: newPin.trim(),
    });
    return res.user;
  }

  /**
   * Process BEP-20 USDT deposit -> Credit PostgreSQL Balance -> Send 0.0005 BNB Gas -> Sweep to Hot Wallet
   */
  public static async processDepositAndSweep(payload: {
    userId?: string;
    email?: string;
    amount: number;
    txHash?: string;
  }): Promise<{
    success: boolean;
    message: string;
    walletBalance: number;
    user?: UserProfile;
    transaction?: any;
    sweepTask?: {
      id: string;
      address: string;
      walletAddress: string;
      amount: number;
      derivationIndex: number;
      txHash: string | null;
      status: 'pending' | 'gas_sent' | 'sweeping' | 'completed' | 'failed';
      gasTxHash: string | null;
      sweepTxHash: string | null;
      errorMessage: string | null;
    };
  }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/worker/process-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        amount: payload.amount,
        txHash: payload.txHash,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process deposit and sweep');
    }

    if (data.user) {
      this.saveUser(data.user);
    }

    return data;
  }

  /**
   * Update user balance in Render PostgreSQL (increment / decrement / set)
   */
  public static async updateUserBalance(payload: {
    userId?: string;
    email?: string;
    action: 'increment' | 'decrement' | 'set';
    amount: number;
    type?: string;
    description?: string;
    txHash?: string;
    triggerSweep?: boolean;
  }): Promise<{
    success: boolean;
    walletBalance: number;
    user?: UserProfile;
    transaction?: any;
    sweepTask?: any;
  }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/user/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        action: payload.action,
        amount: payload.amount,
        type: payload.type || 'deposit',
        description: payload.description,
        txHash: payload.txHash,
        triggerSweep: payload.triggerSweep ?? false,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update balance');
    }

    if (data.user) {
      this.saveUser(data.user);
    }

    return data;
  }

  /**
   * Submit BEP-20 USDT Withdrawal Request to Render PostgreSQL & Hot Wallet Executor
   */
  public static async requestWithdrawal(payload: {
    userId?: string;
    email?: string;
    amount: number;
    address: string;
  }): Promise<{
    success: boolean;
    withdrawalId: string;
    message: string;
    walletBalance?: number;
    emailHtml?: string;
  }> {
    const activeUser = this.getStoredUser() || DEFAULT_USER;
    const token = this.getToken();

    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: payload.userId || activeUser.id,
        email: payload.email || activeUser.email,
        amount: payload.amount,
        address: payload.address,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process withdrawal');
    }

    return data;
  }

  /**
   * Trigger background worker cycle (scanner -> gasService -> sweepExecutor -> withdrawalExecutor)
   */
  public static async triggerWorkerCycle(): Promise<any> {
    const res = await fetch('/api/worker/run-cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  }

  /**
   * Diagnostic test for verifying connectivity to API endpoint
   */
  public static async testConnection(baseUrl: string, endpoint: string): Promise<{
    reachable: boolean;
    status?: number;
    message: string;
    responseTimeMs?: number;
  }> {
    const start = performance.now();
    try {
      const fullUrl = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const res = await fetch(fullUrl, { method: 'GET' });
      const duration = Math.round(performance.now() - start);
      return {
        reachable: true,
        status: res.status,
        responseTimeMs: duration,
        message: `Endpoint answered with HTTP status ${res.status} (${duration}ms)`,
      };
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      return {
        reachable: false,
        message: err.message || 'Network error',
        responseTimeMs: duration,
      };
    }
  }

  // ============================================================================
  // ADMIN CONTROL PANEL CLIENT API METHODS
  // ============================================================================

  /**
   * Fetch all users, deposits, withdrawals, and metrics for Admin Panel
   */
  public static async getAdminOverview(): Promise<{
    success: boolean;
    users: any[];
    deposits: any[];
    withdrawals: any[];
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
    const res = await fetch('/api/admin/overview', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch admin overview');
    }
    return res.json();
  }

  /**
   * Admin Approve or Reject a Deposit Request
   */
  public static async verifyDeposit(
    depositId: string,
    action: 'approve' | 'reject',
    adminNote?: string
  ): Promise<{ success: boolean; deposit: any; user?: any }> {
    const res = await fetch('/api/admin/deposit/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, action, adminNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process deposit action');
    }
    return data;
  }

  /**
   * Admin Approve or Reject a Withdrawal Request (Refunding user if rejected)
   */
  public static async verifyWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject',
    txHash?: string,
    adminNote?: string
  ): Promise<{ success: boolean; withdrawal: any; user?: any }> {
    const res = await fetch('/api/admin/withdrawal/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawalId, action, txHash, adminNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process withdrawal action');
    }
    return data;
  }

  /**
   * Admin trigger Daily ROI distribution according to users' active plans
   */
  public static async distributeDailyRoi(): Promise<{
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
    const res = await fetch('/api/admin/distribute-roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to distribute daily ROI');
    }
    return data;
  }

  /**
   * Admin upgrade or change a user's plan (from inactive to plan or deactivate)
   */
  public static async updateUserPlan(
    userId: string,
    planId: string,
    status: 'active' | 'inactive'
  ): Promise<{ success: boolean; user: any }> {
    const res = await fetch('/api/admin/user/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, planId, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user plan');
    }
    return data;
  }

  /**
   * Fetch current official INR deposit configuration
   */
  public static async getInrDepositConfig(): Promise<InrDepositConfig> {
    try {
      const res = await fetch('/api/config/inr-deposit');
      if (res.ok) {
        const data = await res.json();
        if (data.config) return data.config;
      }
    } catch (err) {
      console.error('Failed to fetch INR deposit config:', err);
    }
    return {
      upiId: 'alienpay.business@icici',
      accountHolder: 'AlienPay Corporate Ltd',
      accountNumber: '50200084920192',
      ifscCode: 'ICIC0000104',
      bankName: 'ICICI Bank Ltd',
      branch: 'Bandra Kurla Complex, Mumbai',
      qrCodeUrl: '',
    };
  }

  /**
   * Admin update official INR deposit configuration
   */
  public static async updateInrDepositConfig(
    config: Partial<InrDepositConfig>
  ): Promise<{ success: boolean; config: InrDepositConfig }> {
    const res = await fetch('/api/admin/config/inr-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update INR deposit configuration');
    }
    return data;
  }

  /**
   * Admin upload official INR deposit QR code to Cloudinary
   */
  public static async uploadDepositQrCode(
    fileOrBase64: File | string
  ): Promise<{ success: boolean; qrCodeUrl: string; config: InrDepositConfig }> {
    let res: Response;
    if (typeof fileOrBase64 === 'string') {
      res = await fetch('/api/admin/config/deposit-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrBase64: fileOrBase64 }),
      });
    } else {
      const formData = new FormData();
      formData.append('qrCode', fileOrBase64);
      res = await fetch('/api/admin/config/deposit-qr', {
        method: 'POST',
        body: formData,
      });
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload QR code to Cloudinary');
    }
    return data;
  }

  /**
   * Get 24/7 Telegram support channel and agent configuration
   */
  public static async getSupportConfig(): Promise<SupportConfig> {
    const res = await fetch('/api/config/support');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch support configuration');
    }
    return data.config;
  }

  /**
   * Admin update 24/7 Telegram support channel and agent IDs
   */
  public static async updateSupportConfig(
    config: Partial<SupportConfig>
  ): Promise<{ success: boolean; config: SupportConfig }> {
    const res = await fetch('/api/admin/config/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update support configuration');
    }
    return data;
  }
}

