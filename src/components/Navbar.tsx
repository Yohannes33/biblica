import React from 'react';
import { Flame, Sparkles, Volume2, VolumeX, Download } from 'lucide-react';
import type { UserStats } from '../types/verse';

interface NavbarProps {
  stats: UserStats;
  onToggleSound: () => void;
  onOpenLibrary: () => void;
  canInstall: boolean;
  onInstall: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  onToggleSound,
  onOpenLibrary,
  canInstall,
  onInstall,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full apple-glass border-b border-white/[0.08] px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* App Logo & Title */}
        <div 
          onClick={onOpenLibrary}
          className="flex items-center gap-3 cursor-pointer group btn-press"
        >
          {/* Sculpted Apple-style Logo */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#1c1f2b] to-[#0d0f15] border border-white/[0.12] p-1.5 flex items-center justify-center shadow-lg shadow-black/50 group-hover:border-amber-400/40 transition-colors">
            <img 
              src="/pwa-192x192.svg" 
              alt="Biblica Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" 
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-lg tracking-[0.08em] text-white">
                BIBLICA
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">Scripture Memory</p>
          </div>
        </div>

        {/* Gamification Stats: Streak & XP */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily Streak */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs tabular-nums">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{stats.streakDays}d</span>
          </div>

          {/* XP & Level Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold text-xs tabular-nums">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            <span>{stats.xp} XP</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-blue-600 text-white font-bold">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 btn-press"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Install PWA Button */}
          {canInstall && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 btn-press"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
