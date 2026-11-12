import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { ApiService } from '../../services/apiService';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  onSuccess: (email: string) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBackToLogin,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    setIsSendingOtp(true);

    try {
      await ApiService.sendForgotPasswordOtp(email);
      setIsOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isOtpSent) {
      setErrorMsg('Please request an OTP first by clicking "Send OTP".');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification OTP code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await ApiService.resetPasswordWithOtp({
        email,
        otp: otpCode,
        newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(email);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Check OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto transition-colors duration-250">
      {/* Top-Left Back Navigation */}
      <div className="w-full flex items-center justify-start pt-1 pb-2 shrink-0">
        <button
          onClick={onBackToLogin}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{
            backgroundColor: 'var(--app-surface-subtle)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-secondary)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center py-2">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-emerald-400 items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <KeyRound className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="font-heading font-black text-2xl tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Reset Password
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-dim)' }}>
            Enter your email to receive a 6-digit password reset code
          </p>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/20 dark:bg-red-950/60 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Success Banner */}
        {isSuccess ? (
          <div 
            className="p-6 rounded-2xl border text-center space-y-3"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h2 className="font-heading font-bold text-lg" style={{ color: 'var(--app-text-primary)' }}>
              Password Reset Successful!
            </h2>
            <p className="text-xs" style={{ color: 'var(--app-text-dim)' }}>
              Your password has been updated. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Email field with Send OTP button */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
                Registered Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
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

                <button
                  type="button"
                  disabled={isSendingOtp || countdown > 0 || !email}
                  onClick={handleSendOtp}
                  className="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {isSendingOtp ? 'Sending...' : countdown > 0 ? `${countdown}s` : isOtpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>
            </div>

            {/* OTP Code Input */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 839215"
                className="w-full rounded-xl px-4 py-2.5 text-center font-mono text-base tracking-widest focus:outline-none border"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono focus:outline-none border"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-500 dark:text-teal-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
