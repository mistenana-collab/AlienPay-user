import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Tag, 
  AlertCircle, 
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  Gift
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { UserProfile } from '../../types';

interface SignupScreenProps {
  onSuccess: (user: UserProfile) => void;
  onSwitchToLogin: () => void;
  onOpenApiConfig: () => void;
  onBackToWelcome?: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({
  onSuccess,
  onSwitchToLogin,
  onBackToWelcome,
}) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP Verification Step State
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step 1: Submit registration form & send OTP email (POST /api/auth/register)
  const handleStartSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!securityPin || securityPin.length < 4) {
      setErrorMsg('Please set a 4-digit Security PIN for withdrawals & quick unlock.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Please accept the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);
    try {
      await ApiService.startRegistration({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
        securityPin,
      });

      setCountdown(60);
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit Email OTP & complete registration (POST /api/auth/verify-otp)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otp || otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.verifyRegistrationOtp({
        email,
        otp,
        securityPin,
      });

      if (res.success && res.user) {
        onSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check your OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await ApiService.startRegistration({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
        securityPin,
      });
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto transition-colors duration-250">
      {/* Top-Left Back Navigation */}
      {onBackToWelcome && (
        <div className="w-full flex items-center justify-start pt-1 pb-2 shrink-0">
          <button
            type="button"
            onClick={step === 'verify' ? () => { setStep('form'); setOtp(''); setErrorMsg(null); } : onBackToWelcome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'verify' ? 'Back to Sign Up' : 'Back to Get Started'}</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center py-2">
        {/* Brand Hero */}
        <div className="text-center mb-4">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-emerald-400 items-center justify-center shadow-lg shadow-cyan-500/20 mb-2">
            <span className="font-heading font-black text-slate-950 text-xl tracking-tighter">AP</span>
          </div>
          <h1 className="font-heading font-black text-2xl tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            {step === 'form' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-dim)' }}>
            {step === 'form'
              ? 'Register with Email OTP verification'
              : `We've sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* Sign-up Bonus Banner */}
        {step === 'form' && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 p-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Gift className="w-4 h-4 shrink-0" />
            <span>Sign up &amp; verify email to get 5 USDT bonus</span>
          </div>
        )}

        {/* Error Callout */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {step === 'form' ? (
          /* STEP 1: Registration Form */
          <form onSubmit={handleStartSignup} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all font-medium border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all font-medium border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full rounded-xl pl-8 pr-8 py-2.5 text-xs focus:outline-none font-mono border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center cursor-pointer"
                    style={{ color: 'var(--app-text-dim)' }}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className="w-full rounded-xl pl-8 pr-3 py-2.5 text-xs focus:outline-none font-mono border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4-Digit Security PIN & Referral Code */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  4-Digit Security PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Create 4-digit PIN"
                    className="w-full rounded-xl pl-8 pr-3 py-2.5 text-xs font-mono tracking-widest focus:outline-none border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Optional"
                    className="w-full rounded-xl pl-8 pr-3 py-2.5 text-xs font-mono uppercase focus:outline-none border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none pt-1" style={{ color: 'var(--app-text-dim)' }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                }}
              />
              <span>
                I agree to the <span className="underline" style={{ color: 'var(--app-text-primary)' }}>Terms of Service</span> &amp; <span className="underline" style={{ color: 'var(--app-text-primary)' }}>Privacy Policy</span>.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Verify 6-Digit Email OTP */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-center" style={{ color: 'var(--app-text-muted)' }}>
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={isLoading}
                maxLength={6}
                className="w-full rounded-xl py-3.5 px-4 text-center text-2xl font-mono font-bold tracking-[0.4em] focus:outline-none border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
              <p className="text-[11px] text-center mt-1" style={{ color: 'var(--app-text-dim)' }}>
                Code expires in 10 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Verify &amp; Create Account</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || countdown > 0}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-secondary)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{countdown > 0 ? `Resend (${countdown}s)` : 'Resend Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setOtp('');
                  setErrorMsg(null);
                }}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-secondary)',
                }}
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Switch to Login */}
        <div className="mt-5 text-center text-xs" style={{ color: 'var(--app-text-dim)' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold hover:underline cursor-pointer ml-1"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
