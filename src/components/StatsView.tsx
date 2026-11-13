import React from 'react';
import type { UserProfile, UserStats, Verse, VerseProgress } from '../types/verse';
import { Flame, Award, Zap, CheckCircle2, BookOpen, Layers, Trophy, Lock, Settings, Sprout, Cloud, PenLine, Puzzle } from 'lucide-react';
import { getLevelProgress, getLevelTitle } from '../utils/level';
import { ProgressBar, Ring } from './ui/Progress';
import { Avatar } from './ui/Avatar';

interface StatsViewProps {
  stats: UserStats;
  profile: UserProfile;
  isSignedIn: boolean;
  canSignIn: boolean;
  verses: Verse[];
  progressMap: Record<string, VerseProgress>;
  onOpenSettings: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, profile, isSignedIn, canSignIn, verses, progressMap, onOpenSettings }) => {
  const progressValues = Object.values(progressMap);
  const masteredCount = progressValues.filter((p) => p.masteryScore >= 80).length;
  const learningCount = progressValues.filter((p) => p.masteryScore > 0 && p.masteryScore < 80).length;
  const level = getLevelProgress(stats.xp, stats.level);

  const badges = [
    { title: 'First Flame', desc: 'Keep a 1-day streak', unlocked: stats.streakDays >= 1, icon: Flame, tone: 'bg-flame text-white' },
    { title: 'Verse Scribe', desc: 'Master your first verse', unlocked: masteredCount >= 1, icon: CheckCircle2, tone: 'bg-brand text-on-brand' },
    { title: 'Word Master', desc: 'Finish 5 fill-in stages', unlocked: (stats.clozeCompleted || 0) >= 5, icon: Zap, tone: 'bg-teal text-white' },
    { title: 'Rising Star', desc: 'Reach level 3', unlocked: stats.level >= 3, icon: Award, tone: 'bg-gold text-[oklch(0.3_0.06_70)]' },
  ];
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const rows = [
    { label: 'Day streak', value: stats.streakDays, icon: Flame, chip: 'bg-flame-soft text-flame-ink' },
    { label: 'Verses mastered', value: masteredCount, icon: CheckCircle2, chip: 'bg-brand-soft text-brand-ink' },
    { label: 'Still learning', value: learningCount, icon: Sprout, chip: 'bg-teal-soft text-teal-ink' },
    { label: 'Verses in library', value: verses.length, icon: BookOpen, chip: 'bg-surface-2 text-ink-2' },
    { label: 'Fill-in stages', value: stats.clozeCompleted || 0, icon: PenLine, chip: 'bg-surface-2 text-ink-2' },
    { label: 'Scrambles solved', value: stats.scramblesCompleted || 0, icon: Puzzle, chip: 'bg-surface-2 text-ink-2' },
    { label: 'Cards reviewed', value: stats.cardsReviewed || 0, icon: Layers, chip: 'bg-surface-2 text-ink-2' },
    { label: 'Trivia rounds', value: stats.quizzesCompleted || 0, icon: Trophy, chip: 'bg-surface-2 text-ink-2' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-4">
      {/* Profile + level */}
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <Avatar seed={profile.avatarSeed || 'biblica'} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-extrabold">{profile.name}</h2>
            <p className="truncate text-sm text-ink-3">{getLevelTitle(stats.level)}</p>
          </div>
          <button type="button" onClick={onOpenSettings} className="btn btn-sm btn-secondary">
            <Settings className="h-[18px] w-[18px]" strokeWidth={2.25} />
            Settings
          </button>
        </div>

        {canSignIn && !isSignedIn && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
              <Cloud className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-extrabold">Save your streak</span>
              <span className="block text-sm text-ink-3">Sign in to sync across devices</span>
            </span>
            <span className="font-display text-sm font-extrabold text-brand-ink">Sign in</span>
          </button>
        )}

        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gold-soft p-4">
          <Ring value={level.percent} size={72} stroke={7} tone="gold">
            <span className="flex flex-col items-center leading-none">
              <span className="text-[0.6875rem] font-bold text-gold-ink">LEVEL</span>
              <span className="font-display text-2xl font-extrabold tabular-nums">{stats.level}</span>
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold tabular-nums">{stats.xp.toLocaleString()} XP</p>
            <p className="text-sm text-ink-2">
              <span className="font-semibold tabular-nums">{level.toNext}</span> XP to level {stats.level + 1}
            </p>
            <ProgressBar value={level.percent} tone="gold" label={`Progress to level ${stats.level + 1}`} className="mt-2" />
          </div>
        </div>
      </section>

      {/* Badges */}
      <section aria-labelledby="badges-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="badges-heading" className="section-label">
            Badges
          </h2>
          <span className="section-label tabular-nums">
            {unlockedCount} of {badges.length}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => {
            const Icon = b.unlocked ? b.icon : Lock;
            return (
              <li
                key={b.title}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
                  b.unlocked ? 'border-line bg-surface' : 'border-dashed border-line-strong'
                }`}
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full ${
                    b.unlocked ? `${b.tone} animate-pop shadow-[0_4px_0_oklch(0_0_0/0.15)]` : 'bg-surface-2 text-ink-3'
                  }`}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="font-display text-[0.9375rem] leading-tight font-extrabold">{b.title}</span>
                <span className="text-[0.8125rem] leading-snug text-ink-3">
                  <span className="sr-only">{b.unlocked ? 'Unlocked. ' : 'Locked. '}</span>
                  {b.desc}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Stats */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="section-label">
          Your stats
        </h2>
        <dl className="group-list">
          {rows.map(({ label, value, icon: Icon, chip }) => (
            <div key={label} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${chip}`} aria-hidden="true">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <dt className="flex-1 font-medium">{label}</dt>
              <dd className="font-display text-lg font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};
