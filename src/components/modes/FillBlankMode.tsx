import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, CheckCircle2, RotateCcw, ChevronRight, Award, Zap, Sparkles, HelpCircle, Eye, EyeOff } from 'lucide-react';
import type { Verse, VerseProgress } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { analyzeVerseTokens, getBlankIndicesForLevel, STOP_WORDS } from '../../utils/difficulty';

interface FillBlankModeProps {
  verse: Verse;
  progress?: VerseProgress;
  soundEnabled: boolean;
  onCorrect: (xp: number) => void;
  onNextVerse: () => void;
}

type DifficultyLevel = 1 | 2 | 3 | 4;

export const FillBlankMode: React.FC<FillBlankModeProps> = ({
  verse,
  soundEnabled,
  onCorrect,
  onNextVerse,
}) => {
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [currentBlankIdx, setCurrentBlankIdx] = useState<number>(0);
  const [filledWords, setFilledWords] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showFirstLetterCues, setShowFirstLetterCues] = useState<boolean>(true);

  // Analyze tokens with smart linguistic & theological difficulty scoring
  const analyzedTokens = useMemo(() => {
    return analyzeVerseTokens(verse.text);
  }, [verse.text]);

  // Determine blank indices based on selected level
  const blankIndices = useMemo(() => {
    return getBlankIndicesForLevel(analyzedTokens, level);
  }, [analyzedTokens, level]);

  // Reset state on verse or level change
  useEffect(() => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  }, [verse.id, level]);

  // Text-to-speech
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Active blank target
  const activeTokenIndex = blankIndices[currentBlankIdx];
  const targetToken = activeTokenIndex !== undefined ? analyzedTokens[activeTokenIndex] : null;
  const targetWord = targetToken ? targetToken.cleanWord : '';

  // Smart distractors matching difficulty
  const options = useMemo(() => {
    if (!targetWord) return [];

    const isTargetStopWord = STOP_WORDS.has(targetWord.toLowerCase());

    // Pool of candidate words from the verse
    const otherWords = analyzedTokens
      .filter((t) => t.cleanWord.toLowerCase() !== targetWord.toLowerCase())
      .filter((t) => isTargetStopWord ? t.isStopWord : !t.isStopWord)
      .map((t) => t.cleanWord);

    // Contextual fallback distractors
    const theologicalDistractors = [
      'everlasting', 'righteousness', 'salvation', 'strengtheneth',
      'understanding', 'supplication', 'commanded', 'courage', 'shepherd',
      'believeth', 'pastures', 'mercies', 'redeemed', 'covenant', 'glory'
    ];

    const fillerDistractors = ['that', 'with', 'unto', 'from', 'shall', 'which', 'upon', 'into'];

    const chosenPool = isTargetStopWord ? fillerDistractors : theologicalDistractors;

    const uniqueSet = new Set<string>();
    uniqueSet.add(targetWord);

    const candidates = [...otherWords, ...chosenPool].sort(() => Math.random() - 0.5);
    for (const word of candidates) {
      if (uniqueSet.size >= 4) break;
      if (word.toLowerCase() !== targetWord.toLowerCase()) {
        uniqueSet.add(word);
      }
    }

    return Array.from(uniqueSet).sort(() => Math.random() - 0.5);
  }, [targetWord, analyzedTokens]);

  const handleSelectWord = (word: string) => {
    if (isCompleted || activeTokenIndex === undefined) return;

    if (word.toLowerCase() === targetWord.toLowerCase()) {
      playSound.correct(soundEnabled);
      setFilledWords((prev) => ({ ...prev, [activeTokenIndex]: targetWord }));
      setWrongWord(null);

      const nextBlankIdx = currentBlankIdx + 1;
      if (nextBlankIdx >= blankIndices.length) {
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        const earnedXP = level === 4 ? 60 : level * 15;
        onCorrect(earnedXP);
      } else {
        setCurrentBlankIdx(nextBlankIdx);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setWrongWord(word);
      setTimeout(() => setWrongWord(null), 600);
    }
  };

  const handleReset = () => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-28">
      {/* Apple-style Top Header Bar */}
      <div className="apple-card p-4 sm:p-5 rounded-3xl flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-widest font-bold text-amber-400/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {verse.category}
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-2 mt-0.5">
            {verse.reference}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
              {verse.translation}
            </span>
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {level === 4 && (
            <button
              onClick={() => setShowFirstLetterCues(!showFirstLetterCues)}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-amber-300 btn-press"
              title={showFirstLetterCues ? 'Hide First-Letter Cues' : 'Show First-Letter Cues'}
            >
              {showFirstLetterCues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleSpeak}
            className={`p-2.5 rounded-2xl border transition-all btn-press ${
              isSpeaking
                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-slate-200'
            }`}
            title="Listen to verse"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 btn-press"
            title="Restart verse"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Apple Segmented Control for Difficulty Levels */}
      <div className="apple-glass p-1 rounded-2xl flex items-center">
        {[
          { lvl: 1, title: 'Keywords (25%)', badge: 'Smart' },
          { lvl: 2, title: 'Intermediate (50%)', badge: '' },
          { lvl: 3, title: 'Advanced (75%)', badge: '' },
          { lvl: 4, title: 'Master (100%)', badge: '100%' },
        ].map((item) => {
          const isActive = level === item.lvl;
          return (
            <button
              key={item.lvl}
              onClick={() => setLevel(item.lvl as DifficultyLevel)}
              className={`flex-1 py-2 px-1 text-xs font-semibold rounded-xl transition-all btn-press text-center flex items-center justify-center gap-1 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-extrabold hidden sm:inline ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-400/20 text-amber-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Scripture Memorization Canvas (Apple Books Editorial Feel) */}
      <div className="apple-card p-7 sm:p-9 rounded-3xl min-h-[240px] flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative background watermarks */}
        <div className="absolute right-4 top-4 text-white/[0.02] text-8xl font-serif pointer-events-none select-none">
          ✝
        </div>

        {/* Verse text with blanks */}
        <div className="text-xl sm:text-2xl leading-[1.8] font-scripture text-slate-100 flex flex-wrap items-baseline gap-x-2 gap-y-3 relative z-10">
          {analyzedTokens.map((token, idx) => {
            const isBlank = blankIndices.includes(idx);
            const isCurrent = idx === activeTokenIndex;
            const isFilled = filledWords[idx] !== undefined;

            if (!isBlank) {
              return (
                <span key={token.index} className="text-slate-200">
                  {token.fullToken}
                </span>
              );
            }

            if (isFilled) {
              return (
                <span
                  key={token.index}
                  className="inline-flex items-center font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-xl border border-emerald-500/20 shadow-sm"
                >
                  {filledWords[idx]}
                  {token.punctuation}
                </span>
              );
            }

            if (isCurrent) {
              // Active blank with first-letter cue option
              const cue =
                level === 4 && showFirstLetterCues
                  ? `${token.cleanWord[0]}${'_'.repeat(Math.max(2, token.cleanWord.length - 1))}`
                  : '_____';

              return (
                <span
                  key={token.index}
                  className="inline-flex items-center font-bold px-3 py-0.5 rounded-xl bg-blue-500/20 border-2 border-blue-400 text-blue-300 shadow-md shadow-blue-500/20 animate-pulse tracking-wider"
                >
                  <span>{cue}</span>
                  {token.punctuation}
                </span>
              );
            }

            // Future blanks
            const cue =
              level === 4 && showFirstLetterCues
                ? `${token.cleanWord[0]}...`
                : '____';

            return (
              <span
                key={token.index}
                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 text-sm font-sans"
              >
                {cue}
                {token.punctuation}
              </span>
            );
          })}
        </div>

        {/* Progress Footer */}
        <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 relative z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="tabular-nums font-medium">
              Blank {Math.min(currentBlankIdx + 1, blankIndices.length)} of {blankIndices.length}
            </span>
          </div>
          <div className="w-32 sm:w-44 bg-white/[0.08] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(filledWords).length / blankIndices.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Completion Banner or Tactical Word Bank */}
      {isCompleted ? (
        <div className="apple-card border-emerald-500/30 p-7 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {level === 4 ? '100% Mastery Achieved!' : 'Stage Complete!'}
            </h3>
            <p className="text-slate-300 text-sm mt-1 max-w-md">
              {level === 4
                ? 'Flawless scripture recitation! You have memorized this entire passage.'
                : 'Excellent recall on key words without relying on fillers.'}
            </p>
            <div className="mt-2 text-xs font-bold text-amber-300">
              +{level === 4 ? 60 : level * 15} XP Earned
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2">
            <button
              onClick={() => {
                if (level < 4) {
                  setLevel((level + 1) as DifficultyLevel);
                } else {
                  handleReset();
                }
              }}
              className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 btn-press"
            >
              <span>{level < 4 ? 'Advance to Next Level' : 'Practice Again'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNextVerse}
              className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-100 font-semibold text-sm border border-white/[0.1] flex items-center justify-center gap-2 btn-press"
            >
              <span>Next Verse</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              {level === 1 ? 'Target key word:' : 'Choose the next word:'}
            </span>
            <span className="text-xs text-blue-400 font-medium tabular-nums">
              +{level * 5} XP
            </span>
          </div>

          {/* Tactical Word Bank Choices */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {options.map((option, i) => {
              const isWrong = wrongWord === option;
              return (
                <button
                  key={`${option}-${i}`}
                  onClick={() => handleSelectWord(option)}
                  className={`py-3.5 px-4 rounded-2xl text-base font-semibold transition-all btn-press select-none ${
                    isWrong
                      ? 'bg-rose-500/80 text-white border border-rose-400 animate-shake'
                      : 'apple-glass hover:bg-white/[0.1] hover:border-blue-400/50 text-slate-100'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
