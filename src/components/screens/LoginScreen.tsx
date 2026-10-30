import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  ShieldCheck,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { UserProfile } from '../../types';

interface LoginScreenProps {
  onSuccess: (user: UserProfile) => void;
  onSwitchToSignup: () => void;
  onOpenApiConfig: () => void;
  onForgotPassword: () => void;
  onBackToWelcome?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onSwitchToSignup,
  onForgotPassword,
  onBackToWelcome,
}) => {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !identifier.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (step === 'credentials') {
        const res = await ApiService.login({ identifier: identifier.trim(), password });
        if (res.requiresOtp) {
          setStep('otp');
        } else if (res.success && res.user) {
          onSuccess(res.user);
        }
      } else {
        // Step 2: Verify 6-digit OTP and complete login / save user to DB
        const res = await ApiService.login({ identifier: identifier.trim(), password, otp });
        if (res.success && res.user) {
          onSuccess(res.user);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await ApiService.login({ identifier: identifier.trim(), password });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto transition-colors duration-250">
      {/* Top-Left Back to Get Started Button */}
      {onBackToWelcome && (
        <div className="w-full flex items-center justify-start pt-1 pb-2 shrink-0">
          <button
            type="button"
            onClick={step === 'otp' ? () => { setStep('credentials'); setOtp(''); setErrorMsg(null); } : onBackToWelcome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 'otp' ? 'Back to Login' : 'Back to Get Started'}</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center py-2">
        {/* Brand Hero */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-emerald-400 items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <span className="font-heading font-black text-slate-950 text-2xl tracking-tighter">AP</span>
          </div>
          <h1 className="font-heading font-black text-2xl tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            {step === 'credentials' ? 'Sign In with Email OTP' : 'Verify Your Email'}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-dim)' }}>
            {step === 'credentials'
              ? 'Enter your email and password to receive a 6-digit OTP'
              : 'Enter the 6-digit verification code sent to your email'}
          </p>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Login Form (2-Step: Email + Password -> Email OTP Verification -> Saved in DB) */}
        <form onSubmit={handleLogin} className="space-y-4">
          {step === 'credentials' ? (
            <>
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all font-medium border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                    Password (or Create Password)
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs cursor-pointer hover:underline font-semibold"
                    style={{ color: 'var(--app-text-secondary)' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or create password (min 6 chars)"
                    className="w-full rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none transition-all font-mono border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer"
                    style={{ color: 'var(--app-text-dim)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Security */}
              <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--app-text-dim)' }}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                    }}
                  />
                  <span>Keep me signed in</span>
                </label>

                <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--app-text-secondary)' }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-bit SSL</span>
                </div>
              </div>
            </>
          ) : (
            /* Step 2: 6-Digit Email OTP Verification */
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <Mail className="h-7 w-7 text-emerald-500" />
                </div>
              </div>

              <p className="text-center text-xs" style={{ color: 'var(--app-text-muted)' }}>
                We sent a 6-digit verification code to <strong style={{ color: 'var(--app-text-primary)' }}>{identifier}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-center" style={{ color: 'var(--app-text-muted)' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
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
              </div>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:underline"
                style={{ color: 'var(--app-text-secondary)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || (step === 'otp' && otp.length !== 6)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{step === 'credentials' ? 'Send OTP & Continue' : 'Verify & Sign In'}</span>
              </>
            )}
          </button>

          {step === 'otp' && (
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setOtp('');
                setErrorMsg(null);
              }}
              className="w-full py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              Back to Login
            </button>
          )}
        </form>

        {/* Switch to Sign Up */}
        <div className="mt-6 text-center text-xs" style={{ color: 'var(--app-text-dim)' }}>
          Want to register with full profile details?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold hover:underline cursor-pointer ml-1"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};
