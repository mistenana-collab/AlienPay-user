import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  durationMs = 1700 
}) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out just before completion
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, Math.max(durationMs - 350, 800));

    // Finish splash
    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div 
      onClick={onFinish}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-350 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: 'var(--app-bg, #0b0f17)',
        color: 'var(--app-text-primary, #ffffff)',
      }}
    >
      {/* Background ambient radial glow */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none -bottom-10" />

      {/* Centered Brand Opening */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        {/* Logo Icon */}
        <div className="relative mb-4 group">
          {/* Subtle glowing ring behind icon */}
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-60 blur-md animate-pulse" />
          
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-emerald-400 flex items-center justify-center shadow-2xl shadow-cyan-500/30 text-slate-950 font-black text-3xl font-heading tracking-tight">
            AP
          </div>
        </div>

        {/* Brand Name - Standard Size in the middle */}
        <div className="flex items-center justify-center mb-1.5">
          <span 
            className="font-heading font-black text-2xl sm:text-3xl tracking-tight"
            style={{ color: 'var(--app-text-primary, #ffffff)' }}
          >
            AlienPay
          </span>
        </div>

        {/* Subtitle / Tagline */}
        <p 
          className="text-xs tracking-wide font-medium mt-1 mb-6 max-w-xs"
          style={{ color: 'var(--app-text-dim, #94a3b8)' }}
        >
          Automated Dual-Currency Settlement Gateway
        </p>

        {/* Minimal Progress Line */}
        <div className="w-36 h-1 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/40">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full animate-[shimmer_1.5s_infinite] w-full origin-left" />
        </div>

        {/* Tap to skip micro-hint */}
        <span 
          className="mt-6 text-[10px] tracking-wider uppercase opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--app-text-muted, #64748b)' }}
        >
          Tap to open
        </span>
      </div>
    </div>
  );
};
