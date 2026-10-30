import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Headphones, 
  Send, 
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Users,
  Clock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Bot
} from 'lucide-react';
import { ActiveScreen, SupportConfig, TelegramSupportAgent } from '../../types';
import { ApiService } from '../../services/apiService';

interface SupportScreenProps {
  onNavigate: (screen: ActiveScreen) => void;
}

// Telegram brand icon component
const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

const DEFAULT_SUPPORT: SupportConfig = {
  telegramChannelName: 'AlienPay Official Community & Updates',
  telegramChannelUsername: 'AlienPayOfficial',
  telegramChannelUrl: 'https://t.me/AlienPayOfficial',
  channelSubscribersCount: '24.8K+ Members',
  announcementNotice: 'Welcome to AlienPay 24/7 Official Helpdesk. Our dedicated support agents are online 24/7 on Telegram. We have removed WhatsApp VIP Desk—please only connect with official handles below.',
  agents: [
    {
      id: 'agent-1',
      name: 'Agent Rohit · INR & UPI Desk',
      role: 'Deposit Approvals, UPI & Bank UTR Verification',
      username: '@AlienPay_Support1',
      link: 'https://t.me/AlienPay_Support1',
      isOnline: true,
      avatarText: 'D1',
    },
    {
      id: 'agent-2',
      name: 'Agent Alex · Crypto & Blockchain Desk',
      role: 'BEP-20 USDT Deposit & Gas Verification',
      username: '@AlienPay_Support2',
      link: 'https://t.me/AlienPay_Support2',
      isOnline: true,
      avatarText: 'D2',
    },
    {
      id: 'agent-3',
      name: 'Agent Priya · VIP Relations Desk',
      role: 'Silver, Gold & Diamond Plans & Daily Dividends',
      username: '@AlienPay_VIPSupport',
      link: 'https://t.me/AlienPay_VIPSupport',
      isOnline: true,
      avatarText: 'VIP',
    },
    {
      id: 'agent-4',
      name: 'Agent David · Priority Escalation Desk',
      role: 'Withdrawal Settlements & 24/7 Supervisor Desk',
      username: '@AlienPay_Escalation',
      link: 'https://t.me/AlienPay_Escalation',
      isOnline: true,
      avatarText: 'ESC',
    },
  ],
};

const FAQ_ITEMS = [
  {
    q: 'How do I submit an INR deposit UTR number?',
    a: 'Transfer funds via UPI ID or Bank Account shown on Deposit screen, then enter the exact 12-digit UTR/Reference number on the Deposit Screen. Our Desk #1 verifies and credits within 5–15 minutes.',
  },
  {
    q: 'How fast are USDT (BEP-20) deposits credited?',
    a: 'USDT deposits are auto-detected by our blockchain scanner after 1 BSC network confirmation. Your wallet balance is automatically credited without manual approval.',
  },
  {
    q: 'How does the 1% daily dividend on VIP plans work?',
    a: 'Silver VIP (400 USDT / ₹40,000) earns 4 USDT daily. Gold Pro VIP (800 USDT / ₹80,000) earns 8 USDT daily. Diamond VIP (1,800 USDT / ₹180,000) earns 18 USDT daily. Security deposits can be withdrawn anytime.',
  },
  {
    q: 'What is the turnaround time for withdrawals?',
    a: 'Withdrawal requests are processed manually by our compliance team to your verified Bank Account or BEP-20 address within 10 to 30 minutes.',
  },
];

export const SupportScreen: React.FC<SupportScreenProps> = ({ onNavigate }) => {
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(DEFAULT_SUPPORT);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // In-app interactive quick assistant state
  const [messages, setMessages] = useState<{ sender: 'user' | 'agent'; text: string; time: string }[]>([
    {
      sender: 'agent',
      text: 'Hello! Welcome to AlienPay 24/7 Official Helpdesk. You can reach our 4 dedicated Telegram customer support desks directly below, or ask quick questions right here.',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');

  // Load support configuration from backend
  useEffect(() => {
    let isMounted = true;
    ApiService.getSupportConfig()
      .then((cfg) => {
        if (isMounted && cfg) {
          setSupportConfig(cfg);
        }
      })
      .catch((err) => {
        console.warn('Using default support config:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setInputText('');

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let reply = 'Thank you for reaching out! For instant 1-on-1 account resolution, please click any of our 4 official Telegram Customer Support Desks listed above.';
      if (lower.includes('deposit') || lower.includes('inr') || lower.includes('utr')) {
        reply = 'For INR deposit verification: Please click Desk #1 (Agent Rohit - INR & UPI Desk) on Telegram with your 12-digit UTR receipt for priority fast-track approval.';
      } else if (lower.includes('crypto') || lower.includes('usdt') || lower.includes('bep20') || lower.includes('wallet')) {
        reply = 'For USDT BEP-20 deposit questions: Please connect with Desk #2 (Agent Alex - Crypto Desk) on Telegram with your TX Hash.';
      } else if (lower.includes('withdraw') || lower.includes('payout')) {
        reply = 'Withdrawals are audited & approved manually by compliance. If you need urgent status check, message Desk #4 (Priority Escalation) on Telegram with your AlienPay UID.';
      } else if (lower.includes('plan') || lower.includes('vip') || lower.includes('silver') || lower.includes('gold') || lower.includes('diamond')) {
        reply = 'For VIP membership & 1% daily dividend questions: Contact Desk #3 (VIP Relations Desk) on Telegram for tier activation details.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  const channelUrl = supportConfig.telegramChannelUrl || `https://t.me/${supportConfig.telegramChannelUsername.replace(/^@/, '')}`;
  const agents = supportConfig.agents && supportConfig.agents.length > 0 ? supportConfig.agents : DEFAULT_SUPPORT.agents;

  return (
    <div className="flex-1 shrink-0 flex flex-col pb-8 transition-colors duration-250">
      {/* Top Header */}
      <div 
        className="px-4 py-3.5 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md transition-colors duration-250 shadow-sm"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border-subtle)',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-800/20 transition-colors"
          style={{ color: 'var(--app-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <h1 className="font-heading font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-cyan-400">
            <Headphones className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            <span>24/7 AlienPay Helpdesk</span>
          </h1>
        </div>

        <div className="w-16 flex justify-end">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold">
            24/7 VIP
          </span>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full space-y-4">
        {/* ==================================================================== */}
        {/* HERO CARD: OFFICIAL TELEGRAM CHANNEL */}
        {/* ==================================================================== */}
        <div 
          className="relative overflow-hidden rounded-3xl p-5 border shadow-xl bg-gradient-to-br from-sky-50 via-cyan-50/70 to-white dark:from-[#0088cc]/25 dark:via-slate-900/80 dark:to-slate-950 border-sky-300/80 dark:border-[#0088cc]/40 transition-all"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/20 dark:bg-[#0088cc]/25 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-[#0088cc]/30 shrink-0">
                  <TelegramIcon className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-heading font-black text-sm sm:text-base text-slate-950 dark:text-white">
                      {supportConfig.telegramChannelName || 'AlienPay Official Channel'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0088cc] text-white dark:bg-cyan-400 dark:text-slate-950 shadow-sm">
                      <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                    <span className="text-sky-700 dark:text-cyan-300 font-bold">
                      @{supportConfig.telegramChannelUsername?.replace(/^@/, '') || 'AlienPayOfficial'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-bold">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-sans font-bold">
                      {supportConfig.channelSubscribersCount || '24.8K+ Members'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
              Join the official AlienPay Telegram community for real-time deposit confirmations, daily dividend announcements, new VIP tier perks, and system updates.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[170px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0ea5e9] hover:from-[#0099e6] hover:to-[#38bdf8] text-white font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#0088cc]/30 transition-transform active:scale-95"
              >
                <TelegramIcon className="w-4 h-4 fill-white" />
                <span>Join Official Channel</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={() => handleCopy(channelUrl, 'channel')}
                className="py-2.5 px-3.5 rounded-xl border border-sky-300/80 bg-white hover:bg-sky-50/80 text-sky-800 dark:border-cyan-500/40 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {copiedKey === 'channel' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* DEDICATED 24/7 CUSTOMER SUPPORT DESKS (3-4 TELEGRAM IDS) */}
        {/* ==================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-heading font-bold text-sm tracking-tight flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span>Direct Telegram Customer Support Desks</span>
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                Select a dedicated support desk below for instant 1-on-1 assistance
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              24/7 Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent, idx) => {
              const handle = agent.username ? (agent.username.startsWith('@') ? agent.username : `@${agent.username}`) : `@AlienPay_Support${idx + 1}`;
              const cleanUsername = handle.replace(/^@/, '');
              const directLink = agent.link || `https://t.me/${cleanUsername}`;

              // Accent color variations
              const deskColor = idx === 0 ? 'text-teal-400 border-teal-500/30 bg-teal-500/5' :
                                idx === 1 ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' :
                                idx === 2 ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' :
                                            'text-purple-400 border-purple-500/30 bg-purple-500/5';

              const avatarBg = idx === 0 ? 'from-teal-500 to-emerald-600' :
                               idx === 1 ? 'from-cyan-500 to-blue-600' :
                               idx === 2 ? 'from-amber-500 to-orange-600' :
                                           'from-purple-500 to-indigo-600';

              return (
                <div
                  key={agent.id || idx}
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between space-y-3 relative group ${deskColor}`}
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar with Online Pulse */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${avatarBg} text-white font-heading font-black text-xs flex items-center justify-center shadow-md`}>
                          {agent.avatarText || `D${idx + 1}`}
                        </div>
                        {agent.isOnline !== false && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-sm"></span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-heading font-bold text-xs sm:text-sm" style={{ color: 'var(--app-text-primary)' }}>
                            {agent.name}
                          </span>
                        </div>
                        <p className="text-[10.5px] leading-tight" style={{ color: 'var(--app-text-dim)' }}>
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-md bg-[#0088cc]/15 text-[#38bdf8] border border-[#0088cc]/30 shrink-0 font-bold">
                      Desk #{idx + 1}
                    </span>
                  </div>

                  {/* Handle & Quick Copy */}
                  <div 
                    className="p-2 rounded-xl flex items-center justify-between text-xs font-mono border"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <span className="text-sky-700 dark:text-cyan-400 font-bold flex items-center gap-1 truncate">
                      <TelegramIcon className="w-3.5 h-3.5 text-[#0088cc] shrink-0" />
                      <span>{handle}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(handle, agent.id || `agent-${idx}`)}
                      className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/30 text-[10px] text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors font-medium"
                      title="Copy Telegram ID"
                    >
                      {copiedKey === (agent.id || `agent-${idx}`) ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-sans font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="font-sans">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Primary Direct Chat Button */}
                  <a
                    href={directLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <TelegramIcon className="w-4 h-4 fill-white" />
                    <span>Chat on Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Warning notice */}
        <div 
          className="p-3 rounded-2xl border flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-300/90 bg-amber-500/10 border-amber-500/40 dark:border-amber-500/30"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-900 dark:text-amber-300 block">Security & Fraud Prevention Notice</span>
            <span className="text-amber-900 dark:text-amber-200/90">
              AlienPay customer support representatives will <strong className="font-black text-amber-950 dark:text-amber-200">NEVER</strong> ask for your password, private keys, or seed phrase. WhatsApp VIP Desk has been decommissioned. Only interact with the verified Telegram handles listed above.
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* INTERACTIVE IN-APP LIVE ASSISTANT & FAQ */}
        {/* ==================================================================== */}
        <div 
          className="rounded-3xl border overflow-hidden p-4 space-y-3.5 shadow-sm"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                Instant In-App Assistant & Quick Answers
              </h3>
            </div>
            <span className="text-[10px] text-sky-700 dark:text-cyan-400 font-mono font-bold bg-sky-100 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full border border-sky-200 dark:border-cyan-500/20">
              Automated Guide
            </span>
          </div>

          {/* Quick FAQ Pills */}
          <div className="space-y-2">
            <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
              Frequently Asked Support Topics:
            </span>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div 
                  key={idx}
                  className="rounded-xl border overflow-hidden transition-all text-xs"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-2.5 text-left font-bold text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-cyan-300"
                  >
                    <span>{item.q}</span>
                    <ChevronRight 
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-90 text-sky-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} 
                    />
                  </button>
                  {activeFaq === idx && (
                    <div 
                      className="px-3 pb-3 text-xs leading-relaxed pt-2 border-t font-medium text-slate-800 dark:text-slate-100 bg-sky-50/50 dark:bg-slate-900/40"
                      style={{ borderColor: 'var(--app-border-subtle)' }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mini Interactive Chat */}
          <div 
            className="rounded-2xl border p-3 flex flex-col space-y-2.5"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#0088cc] text-white font-medium rounded-br-none shadow-sm'
                        : 'border rounded-bl-none shadow-xs text-slate-900 dark:text-slate-100 font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] mt-0.5 px-1 text-slate-500 dark:text-slate-400">
                    {m.time}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="pt-2 border-t flex gap-2" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about deposits, withdrawals, or plans..."
                className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0ea5e9] hover:from-[#0099e6] hover:to-[#38bdf8] text-white font-bold cursor-pointer transition-all shadow-md active:scale-95"
                title="Send Question"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
