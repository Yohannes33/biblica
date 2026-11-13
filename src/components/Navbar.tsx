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
    <header className="sticky top-0 z-40 w-full bg-[#080c14]/80 backdrop-blur-2xl border-b border-white/[0.07] px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* App Logo & Brand Identity */}
        <div 
          onClick={onOpenLibrary}
          className="flex items-center gap-3 cursor-pointer group btn-press"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-md shadow-blue-600/20 group-hover:shadow-blue-500/30 transition-all">
            <div className="w-full h-full bg-[#0a0f1d] rounded-2xl p-1.5 flex items-center justify-center">
              <img 
                src="/pwa-192x192.svg" 
                alt="Biblica Logo" 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-wider text-white">
                BIBLICA
              </span>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Scripture Memory</p>
          </div>
        </div>

        {/* Glanceable Gamification Balance & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Day Streak Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs tabular-nums shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{stats.streakDays}d streak</span>
          </div>

          {/* XP Balance Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-xs tabular-nums shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            <span>{stats.xp} XP</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-blue-600 text-white font-extrabold">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-slate-300 btn-press"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Install Button */}
          {canInstall && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 btn-press"
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
