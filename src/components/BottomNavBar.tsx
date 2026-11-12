import React from 'react';
import { Home, Wallet, Crown, Users, Headphones } from 'lucide-react';
import { ActiveScreen } from '../types';

interface BottomNavBarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const tabs: { id: ActiveScreen; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'plans', label: 'VIP Plans', icon: Crown },
    { id: 'refer', label: 'Team', icon: Users },
    { id: 'support', label: 'Support', icon: Headphones },
  ];

  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="sticky bottom-0 z-30 w-full backdrop-blur-md border-t pb-safe shrink-0 shadow-lg transition-colors duration-250"
      style={{
        backgroundColor: 'var(--app-nav-bg)',
        borderColor: 'var(--app-border-subtle)',
      }}
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`h-full flex flex-col items-center justify-center cursor-pointer transition-all active:scale-90 focus:outline-none`}
              style={{
                color: isActive ? 'var(--app-text-secondary)' : 'var(--app-text-dim)',
                fontWeight: isActive ? 700 : 500,
              }}
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--app-text-secondary)' }}
                  ></span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
