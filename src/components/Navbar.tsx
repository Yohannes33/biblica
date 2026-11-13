import React from 'react';
import { Flame, Sparkles, Volume2, VolumeX, Sun, Moon, User } from 'lucide-react';
import type { UserStats, UserProfile } from '../types/verse';

interface NavbarProps {
  stats: UserStats;
  profile: UserProfile;
  onToggleSound: () => void;
  onOpenLibrary: () => void;
  onOpenAccount: () => void;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  profile,
  onToggleSound,
  onOpenLibrary,
  onOpenAccount,
  onToggleTheme,
}) => {
  const isLight = stats.theme === 'light';

  return (
    <header className="sticky top-0 z-40 w-full theme-card border-b px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Clean Logo & Title (No PWA badge) */}
        <div 
          onClick={onOpenLibrary}
          className="flex items-center gap-2.5 cursor-pointer group btn-press"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 p-0.5 shadow-md flex items-center justify-center">
            <img 
              src="/pwa-192x192.svg" 
              alt="Biblica" 
              className="w-full h-full object-contain filter drop-shadow-sm" 
            />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-wider text-slate-900 dark:text-white">
              BIBLICA
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Scripture Memory
            </p>
          </div>
        </div>

        {/* Action Controls & Gamification */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Chip */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-xs tabular-nums shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{stats.streakDays}d</span>
          </div>

          {/* XP Chip */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 font-bold text-xs tabular-nums shadow-sm">
            <Sparkles className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
            <span>{stats.xp} XP</span>
          </div>

          {/* 1-Click Brightness / Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Light and Dark Theme"
            className="p-2 rounded-xl theme-subtle text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white btn-press"
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-2 rounded-xl theme-subtle text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white btn-press"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Account Profile Pill */}
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-500 btn-press"
            title="Open Account"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="hidden sm:inline">{profile.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
