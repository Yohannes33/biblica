import React from 'react';
import type { UserStats, Verse, VerseProgress } from '../types/verse';
import { Flame, Trophy, Award, Zap, BookmarkCheck, CheckCircle2 } from 'lucide-react';

interface StatsViewProps {
  stats: UserStats;
  verses: Verse[];
  progressMap: Record<string, VerseProgress>;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, verses, progressMap }) => {
  const masteredCount = Object.values(progressMap).filter((p) => p.masteryScore >= 80).length;
  const learningCount = Object.values(progressMap).filter((p) => p.masteryScore > 0 && p.masteryScore < 80).length;

  const currentLevelXP = (stats.level - 1) * 100;
  const nextLevelXP = stats.level * 100;
  const xpIntoLevel = Math.max(0, stats.xp - currentLevelXP);
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));

  const getLevelTitle = (lvl: number) => {
    if (lvl >= 10) return 'Theological Scholar';
    if (lvl >= 7) return 'Scripture Disciple';
    if (lvl >= 5) return 'Faith Memorizer';
    if (lvl >= 3) return 'Seeker of Truth';
    return 'Devoted Pilgrim';
  };

  const badges = [
    {
      title: 'First Flame',
      desc: 'Maintained a 1-day study streak',
      unlocked: stats.streakDays >= 1,
      icon: Flame,
      color: 'from-amber-400 to-amber-600',
    },
    {
      title: 'Verse Scribe',
      desc: 'Mastered your first verse',
      unlocked: masteredCount >= 1,
      icon: CheckCircle2,
      color: 'from-emerald-400 to-emerald-600',
    },
    {
      title: 'Word Master',
      desc: 'Completed 5 cloze memorization stages',
      unlocked: (stats.clozeCompleted || 0) >= 5,
      icon: Zap,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: '100% Mastery',
      desc: 'Completed Level 4 full recitation cloze',
      unlocked: stats.level >= 3,
      icon: Award,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-28">
      {/* Activity / Level Hero Card */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Circular Level Ring */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-900 dark:bg-[#0a0d14] rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-amber-400">Level</span>
              <span className="text-2xl font-extrabold text-white tabular-nums">{stats.level}</span>
            </div>
          </div>

          <div className="flex-1 w-full">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Personal Scripture Journey
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
              {getLevelTitle(stats.level)}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums font-medium">
              {stats.xp} Total XP &bull; {stats.streakDays} Day Continuous Streak
            </p>

            {/* Level progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-semibold tabular-nums">
                <span>Progress to Level {stats.level + 1}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/[0.08] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="theme-card p-4 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <Flame className="w-5 h-5 text-amber-500 fill-amber-500 mb-1" />
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{stats.streakDays}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Day Streak</span>
        </div>

        <div className="theme-card p-4 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{masteredCount}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mastered</span>
        </div>

        <div className="theme-card p-4 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{learningCount}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Learning</span>
        </div>

        <div className="theme-card p-4 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <Zap className="w-5 h-5 text-amber-500 mb-1" />
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{verses.length}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Deck</span>
        </div>
      </div>

      {/* Badges Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Milestones & Badges</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  b.unlocked
                    ? 'theme-card shadow-sm border-inherit'
                    : 'theme-subtle opacity-50 border-inherit'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${b.color} flex items-center justify-center text-white shrink-0 shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{b.title}</h4>
                    {b.unlocked && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
