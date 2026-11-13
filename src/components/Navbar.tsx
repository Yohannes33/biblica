import React from 'react';
import { BookOpen, ChevronDown, Flame, Shuffle } from 'lucide-react';
import type { UserStats, Verse } from '../types/verse';
import { getLevelProgress } from '../utils/level';
import { Ring } from './ui/Progress';

interface NavbarProps {
  stats: UserStats;
  verse: Verse;
  title?: string; // replaces the verse picker on screens that aren't about one verse
  onOpenLibrary: () => void;
  onShuffle: () => void;
  onOpenProgress: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ stats, verse, title, onOpenLibrary, onShuffle, onOpenProgress }) => {
  const level = getLevelProgress(stats.xp, stats.level);

  return (
    <header className="material-bar sticky top-0 z-30 border-b border-line pt-safe">
      <div className="mx-auto flex h-16 w-full max-w-xl items-center gap-2 px-4">
        {title ? (
          <h1 className="min-w-0 flex-1 truncate font-display text-[1.375rem] font-extrabold tracking-tight">{title}</h1>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="-ml-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl py-1.5 pr-2 pl-1.5 text-left transition-colors hover:bg-surface-2"
              aria-label={`Current verse ${verse.reference}. Open library`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
                <BookOpen className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1">
                  <span className="truncate font-display text-[1.0625rem] leading-tight font-extrabold">{verse.reference}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.5} />
                </span>
                <span className="block truncate text-[0.8125rem] leading-tight text-ink-3">
                  {verse.translation} · {verse.category}
                </span>
              </span>
            </button>
            <button type="button" onClick={onShuffle} className="icon-btn" aria-label="Random verse" title="Random verse">
              <Shuffle className="h-5 w-5" />
            </button>
          </>
        )}

        <span
          role="img"
          className="pill h-10 bg-flame-soft px-3 text-[0.9375rem] text-flame-ink"
          aria-label={`${stats.streakDays} day streak`}
          title={`${stats.streakDays} day streak`}
        >
          <Flame className="h-[18px] w-[18px] fill-flame text-flame" aria-hidden="true" />
          <span aria-hidden="true">{stats.streakDays}</span>
        </span>

        <button
          type="button"
          onClick={onOpenProgress}
          className="rounded-full transition-transform active:scale-95"
          aria-label={`Level ${stats.level}, ${stats.xp} XP, ${level.toNext} XP to level ${stats.level + 1}. Open progress`}
        >
          <Ring value={level.percent} size={44} stroke={4} tone="gold">
            <span className="font-display text-[0.9375rem] font-extrabold tabular-nums">{stats.level}</span>
          </Ring>
        </button>
      </div>
    </header>
  );
};
