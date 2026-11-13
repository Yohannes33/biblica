import React from 'react';
import { Flame, Sparkles, Volume2, VolumeX, Download, BookOpen } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80 px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* App Logo & Title */}
        <div 
          onClick={onOpenLibrary}
          className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-indigo-200 to-amber-200 bg-clip-text text-transparent">
                BIBLICA
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Scripture Memory</p>
          </div>
        </div>

        {/* Gamification Stats: Streak & XP */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Daily Streak */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs shadow-inner">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400" />
            <span>{stats.streakDays}d streak</span>
          </div>

          {/* XP & Level Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-xs shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
            <span>{stats.xp} XP</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Install PWA Button (if browser event fired) */}
          {canInstall && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 hover:brightness-110 active:scale-95 transition-all"
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
