import React from 'react';
import { Trophy, Flame, Sparkles, CheckCircle2, BookmarkCheck, Award, Zap } from 'lucide-react';
import type { UserStats, Verse, VerseProgress } from '../types/verse';

interface StatsViewProps {
  stats: UserStats;
  verses: Verse[];
  progressMap: Record<string, VerseProgress>;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, verses, progressMap }) => {
  let masteredCount = 0;
  let learningCount = 0;

  verses.forEach((v) => {
    const p = progressMap[v.id];
    if (p) {
      if (p.masteryScore >= 80) masteredCount += 1;
      else if (p.masteryScore >= 20) learningCount += 1;
    }
  });

  const getLevelTitle = (lvl: number) => {
    if (lvl >= 10) return 'Disciple of the Word';
    if (lvl >= 7) return 'Scripture Scholar';
    if (lvl >= 5) return 'Verse Defender';
    if (lvl >= 3) return 'Scripture Seeker';
    return 'Devoted Reader';
  };

  const nextLevelXp = Math.pow(stats.level, 2) * 40;
  const currentLevelBaseXp = Math.pow(stats.level - 1, 2) * 40;
  const xpInCurrentLevel = Math.max(0, stats.xp - currentLevelBaseXp);
  const xpNeededForNext = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  const badges = [
    {
      title: 'First Word',
      desc: 'Memorized your first scripture verse',
      unlocked: stats.xp >= 10,
      icon: Sparkles,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Daily Devotion',
      desc: 'Maintained a 3-day continuous practice streak',
      unlocked: stats.streakDays >= 3,
      icon: Flame,
      color: 'from-amber-400 to-amber-600',
    },
    {
      title: 'Scripture Scholar',
      desc: 'Earned 100+ XP in Bible trivia quizzes',
      unlocked: stats.xp >= 100,
      icon: Trophy,
      color: 'from-emerald-400 to-teal-500',
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
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 sm:p-6 pb-28">
      {/* Apple Activity / Level Hero Card */}
      <div className="apple-card p-7 sm:p-9 rounded-3xl relative overflow-hidden border border-white/[0.1]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Circular Badge Ring */}
          <div className="w-22 h-22 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-xl shadow-blue-600/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0a0d14] rounded-3xl flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-amber-400">Level</span>
              <span className="text-3xl font-extrabold text-white tabular-nums">{stats.level}</span>
            </div>
          </div>

          <div className="flex-1 w-full">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
              Personal Scripture Journey
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              {getLevelTitle(stats.level)}
            </h2>
            <p className="text-xs text-slate-400 mt-1 tabular-nums">
              {stats.xp} Total XP &bull; {stats.streakDays} Day Continuous Streak
            </p>

            {/* Level progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium tabular-nums">
                <span>Progress to Level {stats.level + 1}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/[0.08] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Apple-style Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="apple-card p-4 rounded-2xl flex flex-col items-center text-center">
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400 mb-1" />
          <span className="text-2xl font-bold text-white tabular-nums">{stats.streakDays}</span>
          <span className="text-xs text-slate-400">Day Streak</span>
        </div>

        <div className="apple-card p-4 rounded-2xl flex flex-col items-center text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
          <span className="text-2xl font-bold text-white tabular-nums">{masteredCount}</span>
          <span className="text-xs text-slate-400">Mastered</span>
        </div>

        <div className="apple-card p-4 rounded-2xl flex flex-col items-center text-center">
          <BookmarkCheck className="w-5 h-5 text-blue-400 mb-1" />
          <span className="text-2xl font-bold text-white tabular-nums">{learningCount}</span>
          <span className="text-xs text-slate-400">Learning</span>
        </div>

        <div className="apple-card p-4 rounded-2xl flex flex-col items-center text-center">
          <Zap className="w-5 h-5 text-amber-400 mb-1" />
          <span className="text-2xl font-bold text-white tabular-nums">{verses.length}</span>
          <span className="text-xs text-slate-400">In Deck</span>
        </div>
      </div>

      {/* Badges Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
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
                    ? 'apple-card border-white/[0.08] shadow-md'
                    : 'bg-black/30 border-white/[0.04] opacity-40'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${b.color} flex items-center justify-center text-white shrink-0 shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{b.title}</h4>
                    {b.unlocked && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
