import React, { useState, useRef } from 'react';
import { 
  User, 
  ShieldCheck, 
  Copy, 
  Check, 
  CreditCard, 
  Smartphone, 
  Mail, 
  Calendar, 
  Award, 
  ExternalLink, 
  Settings as SettingsIcon, 
  ChevronRight,
  LogOut,
  ArrowLeft,
  Building,
  QrCode,
  Crown,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, ActiveScreen } from '../../types';
import { ApiService } from '../../services/apiService';

interface ProfileScreenProps {
  user: UserProfile;
  onNavigate: (screen: ActiveScreen) => void;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onNavigate,
  onLogout,
  onUpdateUser,
}) => {
  const currentUpi = user.bankDetails?.upiId || (user as any).upiId || '';
  const currentBep20 = user.cryptoDetails?.bep20Address || (user as any).usdtAddress || '';
  const currentAvatar = user.avatarUrl || (user as any).profilePhoto || '';

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [upiIdInput, setUpiIdInput] = useState(currentUpi);
  const [bep20Input, setBep20Input] = useState(currentBep20);

  // Keep input fields automatically synced whenever user profile updates from database
  React.useEffect(() => {
    if (!isEditingBank) {
      setUpiIdInput(currentUpi);
      setBep20Input(currentBep20);
    }
  }, [currentUpi, currentBep20, isEditingBank]);

  // Cloudinary Profile Photo Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  const handlePhotoUploadClick = () => {
    if (isUploadingPhoto) return;
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can reselect the same file
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
      setTimeout(() => setPhotoError(null), 5000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File too large. Maximum size is 5MB.');
      setTimeout(() => setPhotoError(null), 5000);
      return;
    }

    setPhotoError(null);
    setPhotoSuccess(null);
    setIsUploadingPhoto(true);

    try {
      const res = await ApiService.uploadProfilePhoto(file);
      if (res.photo) {
        onUpdateUser({
          ...user,
          avatarUrl: res.photo,
          profilePhoto: res.photo,
        });
        setPhotoSuccess('Profile picture updated successfully via Cloudinary!');
        setTimeout(() => setPhotoSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error('Cloudinary photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo to Cloudinary');
      setTimeout(() => setPhotoError(null), 6000);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const referralLink = `https://www.alienpay.in/?ref=${user.referralCode}`;

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSavePaymentMethods = async () => {
    const cleanUpi = upiIdInput.trim();
    const cleanBep20 = bep20Input.trim();
    const updatedUser: UserProfile = {
      ...user,
      bankDetails: {
        ...(user.bankDetails || {
          accountHolder: user.fullName,
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          upiId: '',
        }),
        upiId: cleanUpi,
      },
      cryptoDetails: {
        bep20Address: cleanBep20,
      },
    };
    onUpdateUser(updatedUser);
    setIsEditingBank(false);
    try {
      const res = await ApiService.updatePayoutAccounts({
        userId: user.id,
        email: user.email,
        upiId: cleanUpi,
        bep20Address: cleanBep20,
      });
      if (res?.user) {
        onUpdateUser(res.user);
      }
    } catch (err) {
      console.error('Failed to update payout accounts:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-8 transition-colors duration-250">
      {/* Top Section Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border-subtle)',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: 'var(--app-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
          User Profile
        </h1>

        <button
          onClick={() => onNavigate('settings')}
          className="p-1.5 rounded-lg cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          title="Account Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* User Identity Card */}
        <div 
          className="rounded-2xl p-4 border shadow-xl relative overflow-hidden transition-colors duration-250"
          style={{
            background: 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text-primary)',
            boxShadow: '0 10px 25px -5px var(--app-shadow)',
          }}
        >
          <div className="flex items-center gap-3.5">
            {/* Avatar with Cloudinary Photo Upload */}
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoFileChange}
                className="hidden"
              />
              <div 
                onClick={handlePhotoUploadClick}
                className="w-16 h-16 rounded-full border-2 border-cyan-400 p-0.5 shadow-lg shadow-cyan-500/20 cursor-pointer overflow-hidden relative group/avatar"
                style={{ backgroundColor: 'var(--app-surface-highlight)' }}
                title="Click to choose profile picture via Cloudinary"
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={user.fullName}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-teal-600 dark:text-cyan-200">
                    <User className="w-8 h-8" />
                  </div>
                )}

                {/* Dark Hover/Uploading Overlay */}
                <div className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-opacity ${
                  isUploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'
                }`}>
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white drop-shadow" />
                  )}
                </div>
              </div>

              {/* Camera Upload Badge */}
              <button
                type="button"
                onClick={handlePhotoUploadClick}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-slate-900 transition-transform active:scale-90 cursor-pointer"
                title="Upload Photo (Cloudinary)"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                ) : (
                  <Camera className="w-3 h-3 stroke-[2.5]" />
                )}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading font-bold text-lg truncate" style={{ color: 'var(--app-text-primary)' }}>
                  {user.fullName}
                </h2>
                {user.planStatus === 'active' || (user.activePlanId && user.planStatus !== 'inactive') ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3 text-amber-500 fill-current" />
                    <span>{user.planName || `${user.vipTier} VIP`}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Inactive</span>
                  </span>
                )}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--app-text-dim)' }}>
                UID: <span className="font-bold" style={{ color: 'var(--app-text-primary)' }}>{user.alienPayId}</span>
              </div>
              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--app-text-muted)' }}>
                <Mail className="w-3 h-3 text-teal-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Photo Upload Status Messages */}
          {photoSuccess && (
            <div className="mt-3 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{photoSuccess}</span>
            </div>
          )}
          {photoError && (
            <div className="mt-3 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{photoError}</span>
            </div>
          )}

          {/* Member Since & KYC Verified Footer */}
          <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium" style={{ color: 'var(--app-text-dim)' }}>
                Member since {user.joinedDate}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wide shadow-xs">
                <ShieldCheck className="w-3 h-3 text-emerald-500 fill-emerald-500/20" />
                <span>KYC Verified</span>
              </span>
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'var(--app-text-dim)' }}>
              Status: <span className="text-emerald-500 font-semibold">Active</span>
            </span>
          </div>
        </div>

        {/* Bound Payout Accounts (UPI & USDT Address) */}
        <div 
          className="rounded-2xl p-4 border transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <CreditCard className="w-4 h-4 text-teal-500 dark:text-cyan-400" />
              <span>Bound Payout Accounts</span>
            </h3>
            <button
              onClick={() => setIsEditingBank(!isEditingBank)}
              className="text-xs font-semibold cursor-pointer"
              style={{ color: 'var(--app-text-secondary)' }}
            >
              {isEditingBank ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditingBank ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--app-text-muted)' }}>UPI ID (INR Withdrawals)</label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  USDT BEP-20 Wallet Address (BNB Smart Chain)
                </label>
                <input
                  type="text"
                  value={bep20Input}
                  onChange={(e) => setBep20Input(e.target.value)}
                  placeholder="0x... (BEP-20 address on BNB Smart Chain)"
                  className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--app-text-dim)' }}>
                  Strictly BEP-20 network on Binance Smart Chain (not TRC20).
                </p>
              </div>

              <button
                onClick={handleSavePaymentMethods}
                className="w-full py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                Save Payout Accounts
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {/* UPI */}
              <div 
                className="p-2.5 rounded-xl border flex items-center justify-between transition-colors duration-250"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                }}
              >
                <div>
                  <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Default UPI ID</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--app-text-primary)' }}>
                    {currentUpi || 'Not Linked'}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Instant INR / UPI
                </span>
              </div>

              {/* USDT BEP-20 Address */}
              <div 
                className="p-2.5 rounded-xl border flex items-center justify-between transition-colors duration-250"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                }}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>USDT BEP-20 Address (BSC)</span>
                  <span className="font-mono font-semibold text-[11px] truncate block" style={{ color: 'var(--app-text-primary)' }}>
                    {currentBep20 || 'Not Linked'}
                  </span>
                </div>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full shrink-0 border font-bold"
                  style={{
                    backgroundColor: 'var(--app-surface-highlight)',
                    borderColor: 'var(--app-border-subtle)',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  BEP-20
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Referral & Invite Affiliate Card */}
        <div 
          className="rounded-2xl p-4 border shadow-md transition-colors duration-250"
          style={{
            background: 'linear-gradient(to right, var(--app-surface), var(--app-surface-subtle))',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>
              Affiliate Invitation
            </h3>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
              Earn 10% Bonus
            </span>
          </div>

          <p className="text-xs mb-3" style={{ color: 'var(--app-text-dim)' }}>
            Share your referral code with partners to receive recurring deposit commissions.
          </p>

          {/* Referral Code Row */}
          <div 
            className="rounded-xl p-2.5 border flex items-center justify-between mb-2 transition-colors duration-250"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div>
              <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>My Referral Code</span>
              <span className="font-mono text-sm font-extrabold tracking-wider text-teal-600 dark:text-cyan-300">
                {user.referralCode}
              </span>
            </div>

            <button
              onClick={() => copyToClipboard(user.referralCode, 'code')}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Referral Link Row */}
          <div 
            className="rounded-xl p-2.5 border flex items-center justify-between transition-colors duration-250"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="min-w-0 pr-2">
              <span className="text-[10px] block" style={{ color: 'var(--app-text-dim)' }}>Invite Link</span>
              <span className="font-mono text-[11px] truncate block" style={{ color: 'var(--app-text-muted)' }}>
                {referralLink}
              </span>
            </div>

            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Quick Menu Links */}
        <div 
          className="rounded-2xl overflow-hidden border divide-y text-xs transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <button
            onClick={() => onNavigate('plans')}
            className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--app-text-primary)' }}
          >
            <span>My Investment Plan Details</span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--app-text-secondary)' }} />
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--app-text-primary)' }}
          >
            <span>Security & API Configuration</span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--app-text-secondary)' }} />
          </button>

          <button
            onClick={() => onNavigate('support')}
            className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--app-text-primary)' }}
          >
            <span>Customer Care & Ticket Support</span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--app-text-secondary)' }} />
          </button>
        </div>

        {/* Logout button */}
        <button
          onClick={() => onLogout()}
          className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of AlienPay</span>
        </button>
      </div>
    </div>
  );
};
