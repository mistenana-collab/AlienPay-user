import React from 'react';
import { Headphones, Sparkles } from 'lucide-react';
import { ActiveScreen } from '../types';

interface FloatingSupportButtonProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({
  currentScreen,
  onNavigate,
}) => {
  // If already on support screen, we can keep it as indicator or hide
  const isSupportActive = currentScreen === 'support';

  return (
    <aside 
      aria-label="Customer Support" 
      className="fixed sm:absolute bottom-20 right-3.5 z-40 pointer-events-auto select-none"
    >
      <button
        onClick={() => onNavigate('support')}
        className={`group relative flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-full shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 border ${
          isSupportActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 border-emerald-300 shadow-emerald-500/30'
            : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 border-cyan-200/60 shadow-cyan-500/35 hover:scale-105'
        }`}
        style={{
          boxShadow: '0 8px 24px -4px rgba(0, 188, 212, 0.45)',
        }}
        title="24/7 Live Customer Support"
        aria-label="Open 24/7 Live Support"
      >
        {/* Pulsing indicator ring */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950 border-2 border-emerald-300"></span>
        </span>

        {/* Headphones icon */}
        <div className="flex items-center justify-center">
          <Headphones className="w-4 h-4 stroke-[2.4]" />
        </div>

        {/* Text Label */}
        <div className="flex flex-col text-left leading-none">
          <span className="font-heading font-black text-[11px] tracking-tight text-slate-950 flex items-center gap-1">
            <span>24/7 Support</span>
          </span>
          <span className="text-[9px] font-bold text-slate-900/80 tracking-tighter">
            Instant Help
          </span>
        </div>
      </button>
    </aside>
  );
};
