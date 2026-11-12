import React from 'react';
import { ActiveScreen } from '../types';

interface QuickActionBlocksProps {
  onNavigate: (screen: ActiveScreen) => void;
  onOpenDepositModal: (currency: 'INR' | 'USDT') => void;
  onOpenWithdrawModal: (currency: 'INR' | 'USDT') => void;
  selectedCurrency?: 'INR' | 'USDT';
}

// 1. Professional Deposit Vault Inflow Icon
const DepositEmblem: React.FC = () => (
  <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wallet / Vault Base Tray */}
    <path
      d="M5 17.5C5 15.8431 6.34315 14.5 8 14.5H24C25.6569 14.5 27 15.8431 27 17.5V23.5C27 25.433 25.433 27 23.5 27H8.5C6.567 27 5 25.433 5 23.5V17.5Z"
      fill="white"
      fillOpacity="0.18"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Card Slot Line */}
    <path
      d="M9.5 22.5H15.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Currency Dot */}
    <circle cx="22" cy="21" r="1.75" fill="white" />
    {/* Downward Inflow Arrow */}
    <path
      d="M16 4.5V16.5M16 16.5L11.5 12M16 16.5L20.5 12"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 2. Professional Withdraw Fast Settlement Outflow Icon
const WithdrawEmblem: React.FC = () => (
  <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bank / Card Settlement Base */}
    <path
      d="M5 18C5 16.3431 6.34315 15 8 15H24C25.6569 15 27 16.3431 27 18V23.5C27 25.433 25.433 27 23.5 27H8.5C6.567 27 5 25.433 5 23.5V18Z"
      fill="white"
      fillOpacity="0.18"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Settlement Ledger Line */}
    <path
      d="M9.5 22.5H16.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="22" cy="21" r="1.75" fill="white" />
    {/* Upward Outflow Arrow */}
    <path
      d="M16 16.5V4.5M16 4.5L11.5 9M16 4.5L20.5 9"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 3. Professional VIP Subscription Crown & Diamond Crest Icon
const SubscriptionEmblem: React.FC = () => (
  <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Royal Crown Body */}
    <path
      d="M5.5 22.5L4 10.5L10.5 15L16 7.5L21.5 15L28 10.5L26.5 22.5H5.5Z"
      fill="white"
      fillOpacity="0.22"
      stroke="white"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Crown Base Bar */}
    <path
      d="M6.5 26H25.5"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    {/* Center Gem */}
    <circle cx="16" cy="17.5" r="1.8" fill="white" />
    <circle cx="16" cy="4.5" r="1.3" fill="white" />
  </svg>
);

// 4. Professional Commission Growth & Yield Emblem Icon
const CommissionEmblem: React.FC = () => (
  <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Rising Yield Bars */}
    <rect x="5" y="19" width="4.5" height="7.5" rx="1.5" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="1.6" />
    <rect x="12" y="14.5" width="4.5" height="12" rx="1.5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.6" />
    <rect x="19" y="10" width="4.5" height="16.5" rx="1.5" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.6" />
    {/* Upward Growth Trend Curve & Arrowhead */}
    <path
      d="M6.5 13.5L13 8.5L17.5 11L25.5 4.5"
      stroke="white"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 4.5H25.5V9"
      stroke="white"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Percentage Badge Dot */}
    <circle cx="26" cy="23.5" r="2.2" fill="white" />
  </svg>
);

export const QuickActionBlocks: React.FC<QuickActionBlocksProps> = ({
  onNavigate,
  onOpenDepositModal,
  onOpenWithdrawModal,
  selectedCurrency = 'INR',
}) => {
  // 4 Core Blocks: Deposit (USDT & INR), Withdraw (USDT & INR), Subscription, Commission
  const actionBlocks = [
    {
      id: 'deposit',
      title: 'Deposit',
      subtitle: 'USDT & INR',
      Emblem: DepositEmblem,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      shadow: 'shadow-emerald-500/25 group-hover:shadow-emerald-500/40',
      onClick: () => onOpenDepositModal(selectedCurrency),
    },
    {
      id: 'withdraw',
      title: 'Withdraw',
      subtitle: 'USDT & INR',
      Emblem: WithdrawEmblem,
      gradient: 'from-cyan-500 via-sky-500 to-blue-600',
      shadow: 'shadow-sky-500/25 group-hover:shadow-sky-500/40',
      onClick: () => onOpenWithdrawModal(selectedCurrency),
    },
    {
      id: 'subscription',
      title: 'Subscription',
      subtitle: 'VIP Plans',
      Emblem: SubscriptionEmblem,
      gradient: 'from-amber-400 via-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/25 group-hover:shadow-amber-500/40',
      onClick: () => onNavigate('plans'),
    },
    {
      id: 'commission',
      title: 'Commission',
      subtitle: '3 Comm. Types',
      Emblem: CommissionEmblem,
      gradient: 'from-indigo-500 via-purple-500 to-violet-600',
      shadow: 'shadow-purple-500/25 group-hover:shadow-purple-500/40',
      onClick: () => onNavigate('commission'),
    },
  ];

  return (
    <div className="w-full px-4 py-2.5">
      <div className="grid grid-cols-4 gap-2">
        {actionBlocks.map((block) => {
          const { Emblem } = block;
          return (
            <button
              key={block.id}
              onClick={block.onClick}
              className="flex flex-col items-center group cursor-pointer p-1.5 rounded-2xl hover:bg-teal-900/10 active:scale-95 transition-all text-center focus:outline-none"
            >
              {/* Elevated Multi-Layer Professional Fintech Icon Container */}
              <div
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${block.gradient} flex items-center justify-center text-white shadow-lg ${block.shadow} ring-1 ring-white/25 group-hover:scale-105 transition-all duration-200 mb-2 shrink-0 overflow-hidden`}
              >
                {/* Subtle Gloss Top Highlight */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                <Emblem />
              </div>

              <span
                className="text-xs font-bold leading-tight whitespace-nowrap transition-colors"
                style={{ color: 'var(--app-text-primary)' }}
              >
                {block.title}
              </span>

              <span
                className="text-[10px] font-medium leading-tight whitespace-nowrap mt-0.5"
                style={{ color: 'var(--app-text-dim)' }}
              >
                {block.subtitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
