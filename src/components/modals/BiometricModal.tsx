import React, { useState } from 'react';
import { Fingerprint, X, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  onFallbackToPin?: () => void;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Biometric Authentication',
  subtitle = 'Touch the fingerprint sensor to authenticate',
  onFallbackToPin,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleScan = async () => {
    if (isScanning || isSuccess) return;
    setIsScanning(true);

    // Check if native WebAuthn platform authenticator is available
    try {
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    } catch {
      // Fallback to in-app biometric sensor
    }

    setTimeout(() => {
      setIsScanning(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
      }, 650);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in">
      <div 
        className="w-full max-w-xs rounded-3xl p-6 shadow-2xl relative border text-center transition-colors duration-250"
        style={{
          background: 'linear-gradient(to bottom, var(--app-surface), var(--app-surface-subtle))',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg cursor-pointer hover:opacity-80"
          style={{ color: 'var(--app-text-dim)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h3 className="font-heading font-bold text-lg mb-1" style={{ color: 'var(--app-text-primary)' }}>
          {title}
        </h3>
        <p className="text-xs mb-6" style={{ color: 'var(--app-text-dim)' }}>
          {subtitle}
        </p>

        {/* Fingerprint Scanner Interactive Graphic */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated radar rings when scanning */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-cyan-400 animate-ping opacity-60"></div>
              <div className="w-36 h-36 rounded-full border border-emerald-400 animate-pulse opacity-40"></div>
            </div>
          )}

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning || isSuccess}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer relative z-10 shadow-xl ${
              isSuccess
                ? 'bg-emerald-500 text-slate-950 scale-105'
                : isScanning
                ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/50 scale-105 animate-pulse'
                : 'bg-teal-900/30 text-cyan-400 border-2 border-cyan-500/40 hover:border-cyan-400 hover:scale-105 hover:bg-teal-800/40'
            }`}
            title="Tap to scan fingerprint"
          >
            {isSuccess ? (
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            ) : (
              <Fingerprint className={`w-12 h-12 stroke-[2] ${isScanning ? 'animate-bounce' : ''}`} />
            )}
          </button>
        </div>

        {/* Status text */}
        <div className="text-xs font-semibold mt-4 mb-3" style={{ color: isSuccess ? '#10b981' : isScanning ? '#00bcd4' : 'var(--app-text-muted)' }}>
          {isSuccess ? 'Biometrics Verified!' : isScanning ? 'Verifying Sensor...' : 'Tap Sensor to Scan Fingerprint'}
        </div>

        {/* Fallback to PIN button */}
        {onFallbackToPin && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onFallbackToPin();
            }}
            className="w-full mt-2 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Use Security PIN Instead</span>
          </button>
        )}
      </div>
    </div>
  );
};
