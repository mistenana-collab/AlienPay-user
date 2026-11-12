import React, { useState, useEffect, useRef } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2, Minimize2, MessageSquare, ChevronDown, ChevronUp, X } from 'lucide-react';

export interface SmsHeadUpNotification {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  truecallerPopup?: {
    variant: 'bandhan' | 'indusind' | 'airtel' | 'kotak' | 'generic';
    txType: 'credit' | 'debit';
    bankName: string;
    amountFormatted: string;
    rawAmountTwoDecimals?: string;
    accountLast4: string;
    timeFormatted: string;
    dateTimeFormatted?: string;
    recipientName?: string;
    transferMethod?: 'UPI transfer' | 'IMPS transfer';
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
  const [truecallerAnimStage, setTruecallerAnimStage] = useState<'hidden' | 'visible' | 'exiting'>('hidden');
  const [isSmsExpanded, setIsSmsExpanded] = useState(false);
  const [isTruecallerDismissed, setIsTruecallerDismissed] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tcExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tcRemoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const truecallerAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Preload both uploaded notification sounds (Message Sound + Truecaller Sound) and unlock audio on first interaction
  useEffect(() => {
    try {
      const msgAudio = new Audio('/assets/aistudio/message_sound_8b211256.mp3');
      msgAudio.preload = 'auto';
      msgAudio.volume = 1.0;
      messageAudioRef.current = msgAudio;

      const tcAudio = new Audio('/assets/aistudio/true_caller_02e19c68.mp3');
      tcAudio.preload = 'auto';
      tcAudio.volume = 1.0;
      truecallerAudioRef.current = tcAudio;
    } catch {
      // ignore audio init errors
    }

    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
          }
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
        }
        if (!audioUnlockedRef.current) {
          audioUnlockedRef.current = true;
          [messageAudioRef.current, truecallerAudioRef.current].forEach((el) => {
            if (!el) return;
            el.muted = true;
            el.play()
              .then(() => {
                el.pause();
                el.currentTime = 0;
                el.muted = false;
              })
              .catch(() => {
                el.muted = false;
                audioUnlockedRef.current = false;
              });
          });
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

  // Play the uploaded Truecaller notification sound (/assets/aistudio/true_caller_02e19c68.mp3)
  // or the uploaded Message notification sound (/assets/aistudio/message_sound_8b211256.mp3)
  const playNotificationSound = (hasTruecallerPopup: boolean) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(hasTruecallerPopup ? [85, 45, 95, 45, 130] : [70, 45, 110]);
      }
    } catch {
      // ignore vibration errors
    }

    const playSynthFallback = (isTruecallerJingle: boolean) => {
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
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, startTime);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2, startTime);

          const overtoneGain = ctx.createGain();
          overtoneGain.gain.setValueAtTime(0.22, startTime);

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

        if (isTruecallerJingle) {
          playBellTone(1270.0, now, 0.16, 0.30);
          playBellTone(800.0, now + 0.14, 0.18, 0.28);
          playBellTone(1080.0, now + 0.36, 0.20, 0.34);
          playBellTone(1320.0, now + 0.68, 0.18, 0.34);
          playBellTone(1650.0, now + 0.84, 0.42, 0.38);
        } else {
          playBellTone(1174.66, now, 0.18, 0.26);
          playBellTone(1730.0, now + 0.10, 0.38, 0.34);
        }
      } catch {
        // ignore if audio blocked
      }
    };

    const targetAudio = hasTruecallerPopup ? truecallerAudioRef.current : messageAudioRef.current;
    if (targetAudio) {
      try {
        // Pause the other audio element if it was still playing so sounds stay crisp
        const otherAudio = hasTruecallerPopup ? messageAudioRef.current : truecallerAudioRef.current;
        if (otherAudio && !otherAudio.paused) {
          otherAudio.pause();
          otherAudio.currentTime = 0;
        }

        targetAudio.muted = false;
        targetAudio.currentTime = 0;
        const playPromise = targetAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            playSynthFallback(hasTruecallerPopup);
          });
        }
        return;
      } catch {
        playSynthFallback(hasTruecallerPopup);
        return;
      }
    }

    playSynthFallback(hasTruecallerPopup);
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
      setTruecallerAnimStage('hidden');
      setIsSmsExpanded(false);
      setIsTruecallerDismissed(false);
      onDismissSmsNotification?.();
    }, delayMs + 380);
  };

  useEffect(() => {
    if (!smsNotification) {
      return;
    }
    if (tcExitTimerRef.current) clearTimeout(tcExitTimerRef.current);
    if (tcRemoveTimerRef.current) clearTimeout(tcRemoveTimerRef.current);

    const hasTc = Boolean(smsNotification.truecallerPopup);

    setRenderedSms(smsNotification);
    setIsSmsExpanded(false);
    setIsTruecallerDismissed(false);
    setSmsAnimStage('hidden');
    setTruecallerAnimStage('hidden');

    playNotificationSound(hasTc);

    const enterTimer = setTimeout(() => {
      setSmsAnimStage('visible');
      if (hasTc) {
        setTruecallerAnimStage('visible');
      }
    }, 20);

    if (hasTc) {
      // 1) Truecaller notification vanishes automatically first (at 4.2s)
      const tcVisibleDurationMs = 4200;
      const tcFadeOutDurationMs = 280;

      tcExitTimerRef.current = setTimeout(() => {
        setTruecallerAnimStage('exiting');
      }, tcVisibleDurationMs);

      tcRemoveTimerRef.current = setTimeout(() => {
        setIsTruecallerDismissed(true);
        setTruecallerAnimStage('hidden');
      }, tcVisibleDurationMs + tcFadeOutDurationMs);

      // 2) Exactly 1 second (1000ms) after Truecaller vanishes, the SMS message notification vanishes upward
      scheduleAutoDismiss(tcVisibleDurationMs + tcFadeOutDurationMs + 1000);
    } else {
      scheduleAutoDismiss(4800);
    }

    return () => {
      clearTimeout(enterTimer);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      if (tcExitTimerRef.current) clearTimeout(tcExitTimerRef.current);
      if (tcRemoveTimerRef.current) clearTimeout(tcRemoveTimerRef.current);
    };
  }, [smsNotification?.id]);

  const handleManualDismissSms = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    if (tcExitTimerRef.current) clearTimeout(tcExitTimerRef.current);
    if (tcRemoveTimerRef.current) clearTimeout(tcRemoveTimerRef.current);
    setSmsAnimStage('exiting');
    setTruecallerAnimStage('exiting');
    setTimeout(() => {
      setRenderedSms(null);
      setSmsAnimStage('hidden');
      setTruecallerAnimStage('hidden');
      setIsSmsExpanded(false);
      setIsTruecallerDismissed(false);
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
    if (tcExitTimerRef.current) clearTimeout(tcExitTimerRef.current);
    if (tcRemoveTimerRef.current) clearTimeout(tcRemoveTimerRef.current);

    setTruecallerAnimStage('exiting');
    tcRemoveTimerRef.current = setTimeout(() => {
      setIsTruecallerDismissed(true);
      setTruecallerAnimStage('hidden');
    }, 260);

    // 1 second after Truecaller vanishes, the SMS message notification vanishes as well
    scheduleAutoDismiss(260 + 1000);
  };

  const renderTruecallerPopup = (isFixedMobile: boolean) => {
    if (!renderedSms || !renderedSms.truecallerPopup || isTruecallerDismissed) return null;
    const isVisible = truecallerAnimStage === 'visible';
    const tc = renderedSms.truecallerPopup;
    const isDebit = tc.txType === 'debit';
    const isIndusInd = tc.variant === 'indusind';
    const isAirtel = tc.variant === 'airtel';
    const isBandhan = tc.variant === 'bandhan';
    const isKotak = tc.variant === 'kotak';
    const showTwoFooterButtons = isDebit || isAirtel || isKotak;

    const renderBankLogo = () => {
      if (isBandhan) {
        return (
          <img
            src="/assets/aistudio/logo_bandhan.png"
            alt="Bandhan Bank"
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        );
      }
      if (isIndusInd) {
        return (
          <img
            src="/assets/aistudio/logo_indusind.png"
            alt="IndusInd Bank"
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        );
      }
      if (isAirtel) {
        return (
          <img
            src="/assets/aistudio/logo_airtel.png"
            alt="Airtel Payments Bank"
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        );
      }
      if (isKotak) {
        return (
          <img
            src={isDebit ? '/assets/aistudio/logo_kotak.png' : '/assets/aistudio/logo_kotak_red.png'}
            alt="Kotak Mahindra Bank"
            className="w-8 h-8 rounded-full object-cover bg-white shrink-0"
          />
        );
      }
      const initials = (tc.bankName || 'BK')
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return (
        <div className="w-8 h-8 rounded-full bg-[#B91C1C] text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-sm">
          {initials}
        </div>
      );
    };

    return (
      <div
        role="dialog"
        aria-label="Truecaller SMS Notification"
        className={`${
          isFixedMobile ? 'fixed top-2 left-2.5 right-2.5' : 'absolute top-8 left-2.5 right-2.5'
        } z-[130] select-none transition-all duration-280 ease-out ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100'
            : '-translate-y-3 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="rounded-[15px] bg-[#0087FF] px-2 pt-1.5 pb-2 shadow-[0_18px_42px_-8px_rgba(0,68,148,0.48)] border border-[#1E96FF]">
          {/* Truecaller Top Blue Header */}
          <div className="flex items-center justify-between px-1.5 pb-1.5 pt-0.5 text-white">
            {/* Truecaller Wordmark Logo */}
            <div className="flex items-center">
              <span
                className="text-[16px] font-extrabold tracking-[-0.03em] leading-none text-white"
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                truecaller
              </span>
            </div>

            {/* Center SMS • Time */}
            <div className="text-[11.5px] font-normal tracking-normal text-white/95">
              {isBandhan && !isDebit ? `SMS -${tc.timeFormatted}` : `SMS • ${tc.timeFormatted}`}
            </div>

            {/* Right Close X Button */}
            <button
              type="button"
              onClick={handleDismissTruecaller}
              aria-label="Close Truecaller popup"
              className="text-white/90 hover:text-white active:scale-95 transition-transform p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Inner White Card */}
          <div className="bg-white rounded-[11px] overflow-hidden shadow-sm">
            <div className="px-3.5 pt-2.5 pb-2.5">
              {/* Row 1: Bank Logo + Bank Name */}
              <div className="flex items-center gap-2.5">
                {renderBankLogo()}
                <span className="text-[14.5px] font-normal text-[#3C4043] tracking-normal leading-snug">
                  {tc.bankName}
                </span>
              </div>

              {/* Body Content based on Credit vs Debit and Bank Variant */}
              {isDebit && isKotak ? (
                /* KOTAK MAHINDRA BANK DEBIT LAYOUT */
                <div className="mt-2 pl-0.5">
                  <div className="text-[17.5px] font-bold text-[#EA6312] tracking-tight leading-snug">
                    {tc.amountFormatted}
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#5F6368] leading-snug">
                    <span className="font-bold text-[#4A4E54]">IMPS transfer</span>{' '}
                    <span className="font-normal text-[#5F6368]">to</span>{' '}
                    <span className="font-bold text-[#4A4E54]">{tc.recipientName || 'Rafik Laskar'}</span>{' '}
                    <span className="font-normal text-[#5F6368]">from</span>{' '}
                    <span className="font-bold text-[#4A4E54]">Account {tc.accountLast4}</span>
                  </div>
                </div>
              ) : isDebit ? (
                /* DEBIT NOTIFICATION LAYOUT (Always IMPS Transfer after OTP) */
                <div className="mt-2 pl-0.5">
                  <div className="text-[17.5px] font-bold text-[#E53935] tracking-tight leading-snug">
                    {tc.amountFormatted}
                  </div>
                  <div className="mt-0.5 text-[13px] font-normal text-[#3C4043] leading-snug">
                    <span className="font-bold text-[#3C4043]">IMPS transfer</span>{' '}
                    {tc.recipientName ? (
                      <>
                        to <span className="font-bold text-[#3C4043]">{tc.recipientName}</span> from{' '}
                      </>
                    ) : (
                      '• Debited from '
                    )}
                    <span className="font-bold text-[#3C4043]">Account {tc.accountLast4}</span>
                  </div>
                  {tc.dateTimeFormatted && (
                    <div className="mt-0.5 text-[11.5px] font-normal text-[#70757A] leading-snug">
                      {tc.dateTimeFormatted}
                    </div>
                  )}
                  {isIndusInd && (
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#5F6368]">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#0087FF] fill-current shrink-0">
                        <path d="M10 3L12.2 8.8L18 11L12.2 13.2L10 19L7.8 13.2L2 11L7.8 8.8L10 3ZM18 14L19 16.5L21.5 17.5L19 18.5L18 21L17 18.5L14.5 17.5L17 16.5L18 14ZM18 3L18.8 5.2L21 6L18.8 6.8L18 9L17.2 6.8L15 6L17.2 5.2L18 3Z" />
                      </svg>
                      <span>AI summary</span>
                    </div>
                  )}
                </div>
              ) : isKotak ? (
                /* KOTAK MAHINDRA BANK CREDIT LAYOUT */
                <div className="mt-2 pl-0.5">
                  <div className="text-[17.5px] font-bold text-[#119B4C] tracking-tight leading-snug">
                    {tc.amountFormatted}
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#5F6368] leading-snug">
                    {tc.transferMethod === 'IMPS transfer' ? (
                      <>
                        <span className="font-bold text-[#4A4E54]">IMPS transfer</span>{' '}
                        <span className="font-normal text-[#5F6368]">to</span>{' '}
                        <span className="font-bold text-[#4A4E54]">Account {tc.accountLast4}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-[#4A4E54]">UPI transfer</span>{' '}
                        <span className="font-normal text-[#5F6368]">from</span>{' '}
                        <span className="font-bold text-[#4A4E54]">{tc.recipientName || 'Rafik Laskar'}</span>{' '}
                        <span className="font-normal text-[#5F6368]">to</span>{' '}
                        <span className="font-bold text-[#4A4E54]">Account {tc.accountLast4}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : isIndusInd ? (
                /* INDUSIND BANK CREDIT LAYOUT */
                <div className="mt-2 pl-0.5">
                  <div className="text-[15px] text-[#1F1F1F] leading-snug tracking-[-0.01em]">
                    <span className="font-medium">A/C </span>
                    <span className="font-extrabold">*XX{tc.accountLast4}</span>
                    <span className="font-semibold"> credited by </span>
                    <span className="font-extrabold">Rs {tc.rawAmountTwoDecimals || '2.00'}.</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#5F6368]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#0087FF] fill-current shrink-0">
                      <path d="M10 3L12.2 8.8L18 11L12.2 13.2L10 19L7.8 13.2L2 11L7.8 8.8L10 3ZM18 14L19 16.5L21.5 17.5L19 18.5L18 21L17 18.5L14.5 17.5L17 16.5L18 14ZM18 3L18.8 5.2L21 6L18.8 6.8L18 9L17.2 6.8L15 6L17.2 5.2L18 3Z" />
                    </svg>
                    <span>AI summary</span>
                  </div>
                </div>
              ) : isAirtel ? (
                /* AIRTEL PAYMENTS BANK CREDIT LAYOUT */
                <div className="mt-2 pl-0.5">
                  <div className="text-[17.5px] font-bold text-[#1B873F] tracking-tight leading-snug">
                    {tc.amountFormatted}
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#3C4043] leading-snug">
                    <span className="font-medium text-[#1F1F1F]">IMPS transfer</span>{' '}
                    <span className="font-normal text-[#5F6368]">from</span>{' '}
                    <span className="font-medium text-[#1F1F1F]">Airtel</span>{' '}
                    <span className="font-normal text-[#5F6368]">to</span>{' '}
                    <span className="font-medium text-[#1F1F1F]">Account {tc.accountLast4}</span>
                  </div>
                </div>
              ) : (
                /* BANDHAN BANK & STANDARD CREDIT LAYOUT */
                <div className="mt-2 pl-0.5">
                  <div className="text-[17px] font-bold text-[#1D9D48] tracking-tight leading-snug">
                    {tc.amountFormatted}
                  </div>
                  <div className="mt-0.5 text-[13.5px] font-normal text-[#2D3134] leading-snug">
                    Credited to Account {tc.accountLast4}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            {showTwoFooterButtons ? (
              <div className="grid grid-cols-2 bg-[#EAF4FE] border-t border-[#E1EEF9]">
                <button
                  type="button"
                  onClick={handleDismissTruecaller}
                  className="py-2.5 px-2 text-center hover:bg-[#DCEBFA] active:bg-[#CFE4F8] transition-colors cursor-pointer border-r border-[#D5E7F7]"
                >
                  <span
                    className={
                      isKotak
                        ? 'text-[13.5px] font-semibold tracking-normal text-[#0B5389]'
                        : 'text-[12px] font-medium tracking-[0.03em] text-[#175B9E] uppercase'
                    }
                  >
                    {isKotak ? 'Mark as read' : 'MARK AS READ'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissTruecaller}
                  className="py-2.5 px-2 text-center hover:bg-[#DCEBFA] active:bg-[#CFE4F8] transition-colors cursor-pointer"
                >
                  <span
                    className={
                      isKotak
                        ? 'text-[13.5px] font-semibold tracking-normal text-[#0B5389]'
                        : 'text-[12px] font-medium tracking-[0.03em] text-[#175B9E] uppercase'
                    }
                  >
                    {isKotak ? 'View profile' : 'VIEW PROFILE'}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDismissTruecaller}
                className="w-full bg-[#EAF4FE] hover:bg-[#DCEBFA] active:bg-[#CFE4F8] transition-colors py-2.5 px-4 text-center cursor-pointer border-t border-[#E1EEF9]"
              >
                <span
                  className={`text-[13.5px] tracking-[0.02em] text-[#175B9E] ${
                    isIndusInd ? 'font-semibold' : 'font-normal uppercase'
                  }`}
                >
                  {isIndusInd ? 'Mark as read' : 'MARK AS READ'}
                </span>
              </button>
            )}
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
