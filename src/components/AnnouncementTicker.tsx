import React, { useState } from 'react';
import { Megaphone, X, ChevronRight } from 'lucide-react';

interface AnnouncementTickerProps {
  onPlanClick?: () => void;
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({ onPlanClick }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="w-full px-4 pt-3 pb-1">
      <div className="w-full bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-700/90 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-md shadow-orange-950/30 border border-amber-400/30 overflow-hidden relative group">
        {/* Left icon and message */}
        <div 
          onClick={() => onPlanClick?.()}
          className="flex-1 flex items-center gap-2 overflow-hidden cursor-pointer mr-2"
        >
          <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-3.5 h-3.5 text-amber-200" />
          </div>
          
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <span className="text-xs font-semibold tracking-tight text-amber-50">
              📢 To activate your AlienPay panel, select a VIP Subscription Plan below!
            </span>
          </div>
        </div>

        {/* Right CTA / Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPlanClick?.()}
            className="text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-pointer transition-colors"
          >
            <span>Activate</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-white/70 hover:text-white rounded-md cursor-pointer transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
