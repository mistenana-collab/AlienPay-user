import React, { useState } from 'react';
import { KeyRound, X, Delete, ShieldAlert } from 'lucide-react';
import { ApiService } from '../../services/apiService';

interface PinPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  correctPin?: string;
}

export const PinPromptModal: React.FC<PinPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Enter Security PIN',
  subtitle = 'Enter your 4-digit PIN to continue',
  correctPin,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setErrorMsg(null);

      // Auto verify when 4 digits reached
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const verifyPin = (inputPin: string) => {
    const isValid =
      (correctPin ? inputPin.trim() === correctPin.trim() : false) ||
      ApiService.verifySecurityPin(inputPin);
    if (isValid) {
      setTimeout(() => {
        setPin('');
        onSuccess();
      }, 200);
    } else {
      setErrorMsg('Incorrect PIN. Please try again.');
      setPin('');
    }
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
          onClick={() => {
            setPin('');
            setErrorMsg(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg cursor-pointer hover:opacity-80"
          style={{ color: 'var(--app-text-dim)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="w-10 h-10 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-md shadow-cyan-500/20">
          <KeyRound className="w-5 h-5" />
        </div>
        <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--app-text-primary)' }}>
          {title}
        </h3>
        <p className="text-xs mt-0.5 mb-4" style={{ color: 'var(--app-text-dim)' }}>
          {subtitle}
        </p>

        {/* PIN Indicator Dots */}
        <div className="flex items-center justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isFilled
                    ? 'bg-cyan-400 border-cyan-400 scale-110 shadow-sm shadow-cyan-400/50'
                    : 'border-slate-500/40 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="text-xs text-red-500 font-semibold mb-3 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Virtual Numpad */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-base font-bold font-mono">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-3 rounded-2xl border hover:bg-cyan-500/10 active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
                color: 'var(--app-text-primary)',
              }}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin('')}
            className="py-3 rounded-2xl border text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-dim)',
            }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 rounded-2xl border hover:bg-cyan-500/10 active:scale-95 transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-primary)',
            }}
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="py-3 rounded-2xl border flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
              color: 'var(--app-text-secondary)',
            }}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
