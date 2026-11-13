import React from 'react';
import { Trophy, Flame, Sparkles, CheckCircle2, BookmarkCheck, Award, Zap } from 'lucide-react';
import type { UserStats, Verse, VerseProgress } from '../types/verse';

interface StatsViewProps {
  stats: UserStats;
  verses: Verse[];
  progressMap: Record<string, VerseProgress>;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, verses, progressMap }) => {
  // Compute mastered count
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
      title: 'First Step',
      desc: 'Memorized your first verse',
      unlocked: stats.xp >= 10,
      icon: Sparkles,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Daily Devotion',
      desc: 'Active 3 days streak',
      unlocked: stats.streakDays >= 3,
      icon: Flame,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Trivia Master',
      desc: 'Earned 100+ XP in Trivia',
      unlocked: stats.xp >= 100,
      icon: Trophy,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Word Weaver',
      desc: 'Completed Cloze Stage 4',
      unlocked: stats.level >= 3,
      icon: Award,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 sm:p-6 pb-24">
      {/* Level Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-400 p-0.5 shadow-xl shadow-indigo-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-xs uppercase font-extrabold text-amber-300">Level</span>
              <span className="text-3xl font-black text-white">{stats.level}</span>
            </div>
          </div>

          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Your Memory Journey
            </span>
            <h2 className="text-2xl font-black text-white mt-0.5">
              {getLevelTitle(stats.level)}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {stats.xp} Total XP &bull; {stats.streakDays} Day Continuous Streak
            </p>

            {/* Level progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>Progress to Level {stats.level + 1}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <Flame className="w-6 h-6 text-amber-400 fill-amber-400 mb-1" />
          <span className="text-2xl font-black text-white">{stats.streakDays}</span>
          <span className="text-xs text-slate-400">Day Streak</span>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
          <span className="text-2xl font-black text-white">{masteredCount}</span>
          <span className="text-xs text-slate-400">Mastered Verses</span>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <BookmarkCheck className="w-6 h-6 text-indigo-400 mb-1" />
          <span className="text-2xl font-black text-white">{learningCount}</span>
          <span className="text-xs text-slate-400">In Progress</span>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
          <Zap className="w-6 h-6 text-purple-400 mb-1" />
          <span className="text-2xl font-black text-white">{verses.length}</span>
          <span className="text-xs text-slate-400">Total in Deck</span>
        </div>
      </div>

      {/* Badges & Achievements */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Achievements</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  b.unlocked
                    ? 'bg-slate-900/90 border-slate-800 shadow-md'
                    : 'bg-slate-950/40 border-slate-900 opacity-40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${b.color} flex items-center justify-center text-white shrink-0 shadow-lg`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{b.title}</h4>
                    {b.unlocked ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                        Locked
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
