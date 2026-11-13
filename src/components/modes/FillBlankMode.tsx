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

  const analyzedTokens = useMemo(() => {
    return analyzeVerseTokens(verse.text);
  }, [verse.text]);

  const blankIndices = useMemo(() => {
    return getBlankIndicesForLevel(analyzedTokens, level);
  }, [analyzedTokens, level]);

  useEffect(() => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  }, [verse.id, level]);

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

  const activeTokenIndex = blankIndices[currentBlankIdx];
  const targetToken = activeTokenIndex !== undefined ? analyzedTokens[activeTokenIndex] : null;
  const targetWord = targetToken ? targetToken.cleanWord : '';

  const options = useMemo(() => {
    if (!targetWord) return [];

    const isTargetStopWord = STOP_WORDS.has(targetWord.toLowerCase());

    const otherWords = analyzedTokens
      .filter((t) => t.cleanWord.toLowerCase() !== targetWord.toLowerCase())
      .filter((t) => isTargetStopWord ? t.isStopWord : !t.isStopWord)
      .map((t) => t.cleanWord);

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

  const stages = [
    { lvl: 1, label: 'Keywords', sub: '25% Blanks' },
    { lvl: 2, label: 'Standard', sub: '50% Blanks' },
    { lvl: 3, label: 'Advanced', sub: '75% Blanks' },
    { lvl: 4, label: 'Mastery', sub: '100% Recite' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-28">
      {/* Milestone Pipeline Tracker */}
      <div className="theme-card rounded-3xl p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
            Memorization Stage
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            Level {level} of 4
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stages.map((st) => {
            const isActive = level === st.lvl;
            const isPassed = level > st.lvl;

            return (
              <button
                key={st.lvl}
                onClick={() => setLevel(st.lvl as DifficultyLevel)}
                className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center transition-all btn-press text-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : isPassed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'theme-subtle text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  <span className="text-xs font-bold">{st.label}</span>
                </div>
                <span className={`text-[9px] mt-0.5 font-medium ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {st.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Scripture Header */}
      <div className="theme-card rounded-3xl p-5 sm:p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {verse.category}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {verse.translation}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 text-slate-900 dark:text-white">
            {verse.reference}
          </h2>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {level === 4 && (
            <button
              onClick={() => setShowFirstLetterCues(!showFirstLetterCues)}
              className="p-3 rounded-2xl theme-subtle text-amber-500 hover:text-amber-600 btn-press"
              title={showFirstLetterCues ? 'Hide First-Letter Cues' : 'Show First-Letter Cues'}
            >
              {showFirstLetterCues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleSpeak}
            className={`p-3 rounded-2xl border transition-all btn-press ${
              isSpeaking
                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                : 'theme-subtle text-slate-600 dark:text-slate-200'
            }`}
            title="Read verse aloud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-3 rounded-2xl theme-subtle text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 btn-press"
            title="Restart current stage"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scripture Memorization Canvas */}
      <div className="theme-card p-6 sm:p-8 rounded-3xl min-h-[220px] flex flex-col justify-between">
        <div className="text-xl sm:text-2xl leading-[1.8] font-scripture text-slate-800 dark:text-slate-100 flex flex-wrap items-baseline gap-x-2 gap-y-3">
          {analyzedTokens.map((token, idx) => {
            const isBlank = blankIndices.includes(idx);
            const isCurrent = idx === activeTokenIndex;
            const isFilled = filledWords[idx] !== undefined;

            if (!isBlank) {
              return (
                <span key={token.index}>
                  {token.fullToken}
                </span>
              );
            }

            if (isFilled) {
              return (
                <span
                  key={token.index}
                  className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-xl border border-emerald-500/20 shadow-sm"
                >
                  {filledWords[idx]}
                  {token.punctuation}
                </span>
              );
            }

            if (isCurrent) {
              const cue =
                level === 4 && showFirstLetterCues
                  ? `${token.cleanWord[0]}${'_'.repeat(Math.max(2, token.cleanWord.length - 1))}`
                  : '_____';

              return (
                <span
                  key={token.index}
                  className="inline-flex items-center font-bold px-3 py-0.5 rounded-xl bg-blue-500/20 border-2 border-blue-500 text-blue-600 dark:text-blue-300 shadow-md animate-pulse tracking-wider"
                >
                  <span>{cue}</span>
                  {token.punctuation}
                </span>
              );
            }

            const cue =
              level === 4 && showFirstLetterCues
                ? `${token.cleanWord[0]}...`
                : '____';

            return (
              <span
                key={token.index}
                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/[0.05] border border-inherit text-slate-400 text-sm font-sans"
              >
                {cue}
                {token.punctuation}
              </span>
            );
          })}
        </div>

        {/* Progress footer */}
        <div className="mt-8 pt-4 border-t border-inherit flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="tabular-nums font-semibold">
              Blank {Math.min(currentBlankIdx + 1, blankIndices.length)} of {blankIndices.length}
            </span>
          </div>
          <div className="w-36 sm:w-48 bg-slate-200 dark:bg-white/[0.08] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(filledWords).length / blankIndices.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Completion Banner or Word Bank Choices */}
      {isCompleted ? (
        <div className="theme-card border-emerald-500/40 p-7 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">
              {level === 4 ? '100% Mastery Achieved!' : 'Stage Complete!'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 max-w-md">
              {level === 4
                ? 'Flawless recitation! You have permanently committed this verse to memory.'
                : 'Excellent recall on key difficult words without fillers.'}
            </p>
            <div className="mt-2 text-xs font-bold text-amber-500">
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
              className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 btn-press"
            >
              <span>{level < 4 ? 'Next Stage' : 'Practice Again'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNextVerse}
              className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl theme-subtle text-slate-700 dark:text-slate-200 font-semibold text-sm border flex items-center justify-center gap-2 btn-press"
            >
              <span>Next Scripture</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              {level === 1 ? 'Target difficult key word:' : 'Tap the next word:'}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
              +{level * 5} XP
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {options.map((option, i) => {
              const isWrong = wrongWord === option;
              return (
                <button
                  key={`${option}-${i}`}
                  onClick={() => handleSelectWord(option)}
                  className={`py-3.5 px-4 rounded-2xl text-base font-bold transition-all btn-press select-none shadow-sm ${
                    isWrong
                      ? 'bg-rose-500 text-white border border-rose-400 animate-shake'
                      : 'theme-card hover:border-blue-500 text-slate-800 dark:text-slate-100'
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
