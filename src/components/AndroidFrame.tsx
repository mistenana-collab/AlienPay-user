import React, { useState, useEffect, useRef } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2, Minimize2, MessageSquare, ChevronDown, ChevronUp, X } from 'lucide-react';

export interface SmsHeadUpNotification {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  truecallerPopup?: {
    bankName: string;
    amountFormatted: string;
    accountLast4: string;
    timeFormatted: string;
  };
}

interface AndroidFrameProps {
  children: React.ReactNode;
  onBackPress?: () => void;
  onHomePress?: () => void;
  onRecentPress?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenWebsite?: () => void;
  smsNotification?: SmsHeadUpNotification | null;
  onDismissSmsNotification?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  onBackPress,
  onHomePress,
  onRecentPress,
  theme = 'dark',
  onToggleTheme,
  onOpenWebsite,
  smsNotification,
  onDismissSmsNotification,
}) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [isNativeMobileOrApk, setIsNativeMobileOrApk] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isAndroidWebView = /;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua) || /AlienPayAPK/i.test(ua);
    const hasApkParam = window.location.search.includes('apk=1') || window.location.search.includes('native=1');
    const isSmallMobileScreen = window.innerWidth < 640;
    return isAndroidWebView || hasApkParam || isSmallMobileScreen;
  });
  const [currentTime, setCurrentTime] = useState('12:51');
  const [renderedSms, setRenderedSms] = useState<SmsHeadUpNotification | null>(null);
  const [smsAnimStage, setSmsAnimStage] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [isSmsExpanded, setIsSmsExpanded] = useState(false);
  const [isTruecallerDismissed, setIsTruecallerDismissed] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Unlock AudioContext on first user interaction so 10-second timer notifications play reliably on mobile/WebView
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      } catch {
        // ignore audio errors
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Realistic Android SMS / Google Messages two-tone bell chime + subtle vibration
  const playSmsNotificationSound = () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([70, 45, 110]);
      }
    } catch {
      // ignore vibration errors
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      const playBellTone = (freq: number, startTime: number, duration: number, peakGain: number) => {
        // Main sine body
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);

        // Soft harmonic overtone for realistic mobile bell/chime timbre
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, startTime);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.18, startTime);

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(gainNode);
        osc2.connect(overtoneGain);
        overtoneGain.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.02);
        osc2.stop(startTime + duration + 0.02);
      };

      // Note 1: Crisp D6 (1174.66 Hz) -> Note 2: Bright A6 (1760.00 Hz) classic Android message chime
      playBellTone(1174.66, now, 0.22, 0.28);
      playBellTone(1760.0, now + 0.115, 0.45, 0.34);
    } catch {
      // ignore if audio blocked
    }
  };

  const scheduleAutoDismiss = (delayMs: number) => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

    exitTimerRef.current = setTimeout(() => {
      setSmsAnimStage('exiting');
    }, delayMs);

    removeTimerRef.current = setTimeout(() => {
      setRenderedSms(null);
      setSmsAnimStage('hidden');
      setIsSmsExpanded(false);
      setIsTruecallerDismissed(false);
      onDismissSmsNotification?.();
    }, delayMs + 380);
  };

  useEffect(() => {
    if (!smsNotification) {
      return;
    }
    setRenderedSms(smsNotification);
    setIsSmsExpanded(false);
    setIsTruecallerDismissed(false);
    setSmsAnimStage('hidden');

    playSmsNotificationSound();

    const enterTimer = setTimeout(() => {
      setSmsAnimStage('visible');
    }, 20);

    scheduleAutoDismiss(smsNotification.truecallerPopup ? 6800 : 5200);

    return () => {
      clearTimeout(enterTimer);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, [smsNotification?.id]);

  const handleManualDismissSms = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    setSmsAnimStage('exiting');
    setTimeout(() => {
      setRenderedSms(null);
      setSmsAnimStage('hidden');
      setIsSmsExpanded(false);
      onDismissSmsNotification?.();
    }, 350);
  };

  const handleToggleExpandSms = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSmsExpanded((prev) => {
      const next = !prev;
      scheduleAutoDismiss(next ? 7500 : 4000);
      return next;
    });
  };

  const renderTopSmsBanner = (isFixedMobile: boolean) => {
    if (!renderedSms) return null;
    const isVisible = smsAnimStage === 'visible';
    return (
      <div
        onClick={handleManualDismissSms}
        role="status"
        aria-live="polite"
        className={`${
          isFixedMobile ? 'fixed top-2 left-2.5 right-2.5' : 'absolute top-9 left-2.5 right-2.5'
        } z-[120] cursor-pointer select-none transition-all duration-350 ease-in-out ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100'
            : '-translate-y-14 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="rounded-2xl bg-white text-slate-900 px-3.5 py-2.5 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.22)] border border-slate-200/95 flex items-start gap-2.5">
          {/* Normal Phone Message App Icon */}
          <div className="w-9 h-9 rounded-full bg-[#1A73E8] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white fill-current"
              aria-hidden="true"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
            </svg>
          </div>

          {/* Notification Content (1 line by default, expands on down-arrow tap) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <MessageSquare className="w-3 h-3 text-[#1A73E8] fill-[#1A73E8]" />
                <span>Messages</span>
                <span>·</span>
                <span>now</span>
              </div>

              {/* Real Android Notification Down-Arrow Expand Button */}
              <button
                type="button"
                onClick={handleToggleExpandSms}
                aria-label={isSmsExpanded ? 'Collapse notification' : 'Expand notification'}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                {isSmsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>
            </div>

            <div className="font-bold text-[12.5px] text-slate-900 tracking-tight leading-tight">
              {renderedSms.sender}
            </div>

            <div
              className={`text-[11.5px] text-slate-700 mt-0.5 ${
                isSmsExpanded
                  ? 'leading-relaxed whitespace-normal break-words'
                  : 'leading-snug truncate'
              }`}
            >
              {renderedSms.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDismissTruecaller = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTruecallerDismissed(true);
  };

  const renderTruecallerPopup = (isFixedMobile: boolean) => {
    if (!renderedSms || !renderedSms.truecallerPopup || isTruecallerDismissed) return null;
    const isVisible = smsAnimStage === 'visible';
    const tc = renderedSms.truecallerPopup;

    return (
      <div
        role="dialog"
        aria-label="Truecaller SMS Notification"
        className={`${
          isFixedMobile ? 'fixed top-[102px] left-2.5 right-2.5' : 'absolute top-[118px] left-2.5 right-2.5'
        } z-[119] select-none transition-all duration-350 ease-out ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="rounded-[18px] bg-[#0087FF] px-2.5 pt-2 pb-2.5 shadow-[0_20px_48px_-8px_rgba(0,68,148,0.45)] border border-[#1E96FF]">
          {/* Truecaller Top Blue Header */}
          <div className="flex items-center justify-between px-2 pb-2 pt-0.5 text-white">
            {/* Truecaller Wordmark Logo */}
            <div className="flex items-center">
              <span
                className="text-[19px] font-extrabold tracking-[-0.03em] leading-none text-white"
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                truecaller
              </span>
            </div>

            {/* Center SMS - Time */}
            <div className="text-[13.5px] font-normal tracking-normal text-white/95">
              SMS -{tc.timeFormatted}
            </div>

            {/* Right Close X Button */}
            <button
              type="button"
              onClick={handleDismissTruecaller}
              aria-label="Close Truecaller popup"
              className="text-white/90 hover:text-white active:scale-95 transition-transform p-0.5 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Inner White Card */}
          <div className="bg-white rounded-[14px] overflow-hidden shadow-sm">
            <div className="px-4 pt-3.5 pb-4">
              {/* Row 1: Bandhan Bank Red Sphere & Diya Flame Logo + Bank Name */}
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-11 h-11" aria-hidden="true">
                    <defs>
                      <radialGradient id="bandhanSphereGrad" cx="65%" cy="40%" r="65%">
                        <stop offset="0%" stopColor="#E62420" />
                        <stop offset="58%" stopColor="#C11A17" />
                        <stop offset="100%" stopColor="#8A110F" />
                      </radialGradient>
                      <linearGradient id="bandhanBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#9E1512" />
                        <stop offset="50%" stopColor="#EE3124" />
                        <stop offset="100%" stopColor="#9E1512" />
                      </linearGradient>
                    </defs>
                    {/* Main Red Circle */}
                    <circle cx="50" cy="50" r="46" fill="url(#bandhanSphereGrad)" />
                    {/* Subtle Highlight Arc at Bottom of Sphere */}
                    <path
                      d="M 18 76 Q 50 92 82 76 Q 50 98 18 76 Z"
                      fill="url(#bandhanBottomRim)"
                      opacity="0.9"
                    />
                    {/* White Diya Flame Cutout (Bandhan Bank signature emblem) */}
                    <path
                      d="M 46 8 C 31 21, 28 45, 45 64 C 60 46, 59 22, 46 8 Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>

                <span className="text-[19px] font-normal text-[#3C4043] tracking-normal leading-snug">
                  {tc.bankName}
                </span>
              </div>

              {/* Row 2: Green Credited Amount (+ ₹21,000) */}
              <div className="mt-2.5 pl-1 text-[18.5px] font-bold text-[#1D9D48] tracking-tight leading-snug">
                {tc.amountFormatted}
              </div>

              {/* Row 3: Credited to Account 3324 */}
              <div className="mt-1 pl-0.5 text-[15.5px] font-normal text-[#2D3134] leading-snug">
                Credited to Account {tc.accountLast4}
              </div>
            </div>

            {/* Bottom Action Bar: MARK AS READ */}
            <button
              type="button"
              onClick={handleDismissTruecaller}
              className="w-full bg-[#EAF4FE] hover:bg-[#DCEBFA] active:bg-[#CFE4F8] transition-colors py-3 px-4 text-center cursor-pointer border-t border-[#E1EEF9]"
            >
              <span className="text-[15px] font-normal tracking-[0.03em] text-[#175B9E] uppercase">
                MARK AS READ
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const checkViewport = () => {
      const ua = navigator.userAgent || '';
      const isAndroidWebView = /;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua) || /AlienPayAPK/i.test(ua);
      const hasApkParam = window.location.search.includes('apk=1') || window.location.search.includes('native=1');
      setIsNativeMobileOrApk(isAndroidWebView || hasApkParam || window.innerWidth < 640);
    };
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // When running inside a real Android APK / WebView or mobile phone screen, render edge-to-edge without fake phone chrome
  if (isNativeMobileOrApk) {
    return (
      <div
        className="w-full h-[100dvh] flex flex-col overflow-y-auto overflow-x-hidden relative font-sans transition-colors duration-250"
        style={{
          background: 'linear-gradient(to bottom, var(--app-bg-gradient-top), var(--app-bg-gradient-mid), var(--app-bg-gradient-bot))',
          color: 'var(--app-text-primary)',
        }}
      >
        {renderTopSmsBanner(true)}
        {renderTruecallerPopup(true)}
        {children}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-start p-0 md:py-6 md:px-4 font-sans transition-colors duration-250"
      style={{ backgroundColor: 'var(--app-bg-canvas)', color: 'var(--app-text-primary)' }}
    >
      {/* Top Device Mode Toolbar */}
      <aside 
        aria-label="Device Controls" 
        className="w-full max-w-5xl flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl backdrop-blur-md text-xs border transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-muted)'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide" style={{ color: 'var(--app-text-primary)' }}>AlienPay Android App</span>
          <span className="hidden sm:inline" style={{ color: 'var(--app-text-dim)' }}>· Material Design 3</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenWebsite && (
            <button
              type="button"
              onClick={onOpenWebsite}
              className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 whitespace-nowrap"
              title="Open alienpay.in Official Website"
            >
              <span>alienpay.in Website</span>
            </button>
          )}

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer border"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
            </button>
          )}

          <button
            onClick={() => setIsPhoneFrame(true)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
              isPhoneFrame
                ? 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Preview inside realistic Android smartphone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Device Frame</span>
          </button>

          <button
            onClick={() => setIsPhoneFrame(false)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
              !isPhoneFrame
                ? 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Preview full screen view"
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>Full Canvas</span>
          </button>
        </div>
      </aside>

      {/* Frame Container */}
      <div
        className={`w-full transition-all duration-300 flex justify-center ${
          isPhoneFrame ? 'max-w-[425px]' : 'max-w-2xl'
        }`}
      >
        <div
          className={`w-full shadow-2xl relative flex flex-col overflow-hidden transition-all duration-300 ${
            isPhoneFrame
              ? 'rounded-[44px] border-[10px] min-h-[880px] max-h-[920px]'
              : 'rounded-2xl border min-h-[800px]'
          }`}
          style={{
            borderColor: 'var(--app-device-chassis)',
            backgroundColor: 'var(--app-bg-main)',
            boxShadow: '0 25px 50px -12px var(--app-shadow)',
          }}
        >
          {/* Android Status Bar (Always present in mobile frame) */}
          <div 
            className="w-full px-6 pt-3 pb-2 flex items-center justify-between text-xs font-medium select-none z-30 shrink-0 border-b border-black/5 dark:border-transparent transition-colors duration-250"
            style={{ 
              backgroundColor: 'var(--app-status-bar-bg)', 
              color: 'var(--app-status-bar-text)' 
            }}
          >
            {/* Left: Time, SIM and SMS Notification Indicator */}
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{currentTime}</span>
              <span 
                className="text-[10px] px-1 py-0.2 rounded font-bold"
                style={{ 
                  backgroundColor: 'var(--app-surface-highlight)', 
                  color: 'var(--app-text-secondary)' 
                }}
              >
                Jio
              </span>
              {renderedSms && (
                <MessageSquare className="w-3.5 h-3.5 text-[#1A73E8] fill-[#1A73E8] animate-pulse" />
              )}
            </div>

            {/* Camera Punch-hole Cutout (Pixel / Galaxy style) */}
            <div className="w-3.5 h-3.5 bg-black rounded-full border border-teal-900/40 shadow-inner flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-950 rounded-full"></div>
            </div>

            {/* Right: Connectivity and Battery */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-tighter">4G</span>
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--app-text-primary)' }}>
                <BatteryMedium className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>91%</span>
              </div>
            </div>
          </div>

          {/* Heads-up Top Bar SMS Notification */}
          {renderTopSmsBanner(false)}
          {renderTruecallerPopup(false)}

          {/* Main App Canvas Scrollable Container with CSS variable background gradient */}
          <div 
            className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative transition-colors duration-250"
            style={{
              background: 'linear-gradient(to bottom, var(--app-bg-gradient-top), var(--app-bg-gradient-mid), var(--app-bg-gradient-bot))',
              color: 'var(--app-text-primary)',
            }}
          >
            {children}
          </div>

          {/* Android Bottom Soft Navigation Bar (matching screenshot: |||   O   < ) */}
          {isPhoneFrame && (
            <div 
              className="w-full py-2.5 px-10 flex items-center justify-around border-t z-30 shrink-0 select-none transition-colors duration-250"
              style={{
                backgroundColor: 'var(--app-soft-keys-bg)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => onRecentPress?.()}
                className="p-2 opacity-60 hover:opacity-100 hover:text-cyan-500 active:scale-90 transition-all cursor-pointer"
                title="Recent Apps"
              >
                <div className="flex gap-1 items-center justify-center">
                  <div className="w-0.5 h-3.5 bg-current rounded-sm"></div>
                  <div className="w-0.5 h-3.5 bg-current rounded-sm"></div>
                  <div className="w-0.5 h-3.5 bg-current rounded-sm"></div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onHomePress?.()}
                className="p-2 opacity-60 hover:opacity-100 hover:text-cyan-500 active:scale-90 transition-all cursor-pointer"
                title="Home Button"
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current"></div>
              </button>

              <button
                type="button"
                onClick={() => onBackPress?.()}
                className="p-2 opacity-60 hover:opacity-100 hover:text-cyan-500 active:scale-90 transition-all cursor-pointer"
                title="Back Button"
              >
                <div className="w-2.5 h-2.5 border-l-2 border-b-2 border-current transform rotate-45 ml-1"></div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
