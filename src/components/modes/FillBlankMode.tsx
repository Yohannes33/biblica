import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, CheckCircle2, RotateCcw, ChevronRight, Award, Zap, HelpCircle } from 'lucide-react';
import type { Verse, VerseProgress } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';

interface FillBlankModeProps {
  verse: Verse;
  progress?: VerseProgress;
  soundEnabled: boolean;
  onCorrect: (xp: number) => void;
  onNextVerse: () => void;
}

type DifficultyStage = 1 | 2 | 3 | 4;

export const FillBlankMode: React.FC<FillBlankModeProps> = ({
  verse,
  soundEnabled,
  onCorrect,
  onNextVerse,
}) => {
  const [stage, setStage] = useState<DifficultyStage>(2); // 1: 25% blanks, 2: 50% blanks, 3: 75% blanks, 4: 100% blanks
  const [currentBlankIdx, setCurrentBlankIdx] = useState<number>(0);
  const [filledWords, setFilledWords] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Split verse words cleanly keeping punctuation separate
  const tokenizedWords = useMemo(() => {
    const rawTokens = verse.text.split(/\s+/);
    return rawTokens.map((raw, index) => {
      // separate punctuation like commas, periods, semicolons
      const match = raw.match(/^([a-zA-Z0-9'’]+)([^a-zA-Z0-9'’]*)$/);
      if (match) {
        return {
          id: index,
          cleanWord: match[1],
          punctuation: match[2] || '',
          fullToken: raw,
        };
      }
      return {
        id: index,
        cleanWord: raw,
        punctuation: '',
        fullToken: raw,
      };
    });
  }, [verse.text]);

  // Determine which words should be blanked out based on stage
  const blankIndices = useMemo(() => {
    const indices: number[] = [];
    const step = stage === 1 ? 4 : stage === 2 ? 3 : stage === 3 ? 2 : 1;
    
    tokenizedWords.forEach((token, idx) => {
      // Don't blank tiny words like "a", "I" in stage 1 or 2
      if (stage < 3 && token.cleanWord.length <= 1) return;
      if (idx % step === 0 || (stage === 4)) {
        indices.push(idx);
      }
    });

    // Ensure at least 2 blanks
    if (indices.length < 2 && tokenizedWords.length >= 2) {
      return [0, Math.floor(tokenizedWords.length / 2)];
    }
    return indices;
  }, [tokenizedWords, stage]);

  // Reset when verse or stage changes
  useEffect(() => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  }, [verse.id, stage]);

  // Read aloud verse
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Generate word choices for current blank
  const activeTokenIndex = blankIndices[currentBlankIdx];
  const targetWord = activeTokenIndex !== undefined ? tokenizedWords[activeTokenIndex]?.cleanWord : '';

  const options = useMemo(() => {
    if (!targetWord) return [];

    // Distractors from other words in the verse or common biblical words
    const otherWords = tokenizedWords
      .map((t) => t.cleanWord)
      .filter((w) => w.toLowerCase() !== targetWord.toLowerCase());

    const fallbackDistractors = [
      'God', 'Lord', 'grace', 'truth', 'faith', 'life', 'heart', 'peace', 'spirit', 'light', 'love', 'hope', 'righteousness'
    ];

    const uniqueSet = new Set<string>();
    uniqueSet.add(targetWord);

    // Shuffle and pick 3 unique distractors
    const pool = [...otherWords, ...fallbackDistractors].sort(() => Math.random() - 0.5);
    for (const dist of pool) {
      if (uniqueSet.size >= 4) break;
      if (dist.toLowerCase() !== targetWord.toLowerCase()) {
        uniqueSet.add(dist);
      }
    }

    return Array.from(uniqueSet).sort(() => Math.random() - 0.5);
  }, [targetWord, tokenizedWords]);

  const handleSelectWord = (word: string) => {
    if (isCompleted || activeTokenIndex === undefined) return;

    if (word.toLowerCase() === targetWord.toLowerCase()) {
      playSound.correct(soundEnabled);
      setFilledWords((prev) => ({ ...prev, [activeTokenIndex]: targetWord }));
      setWrongWord(null);

      const nextBlankIdx = currentBlankIdx + 1;
      if (nextBlankIdx >= blankIndices.length) {
        // Verse completed!
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        const earnedXP = stage * 10;
        onCorrect(earnedXP);
      } else {
        setCurrentBlankIdx(nextBlankIdx);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setWrongWord(word);
      setTimeout(() => setWrongWord(null), 800);
    }
  };

  const handleReset = () => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-24">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            {verse.category}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            {verse.reference}
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {verse.translation}
            </span>
          </h2>
        </div>

        {/* Action icons: Audio recitation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeak}
            className={`p-2.5 rounded-xl border transition-all ${
              isSpeaking
                ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Read verse aloud"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Restart this stage"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Difficulty Stage Selector */}
      <div className="flex items-center justify-between bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 ml-2 hidden sm:inline">
          Difficulty:
        </span>
        <div className="grid grid-cols-4 gap-1 flex-1 sm:flex-initial">
          {[
            { lvl: 1, label: 'Gentle (25%)' },
            { lvl: 2, label: 'Standard (33%)' },
            { lvl: 3, label: 'Advanced (50%)' },
            { lvl: 4, label: 'Master (100%)' },
          ].map((item) => (
            <button
              key={item.lvl}
              onClick={() => setStage(item.lvl as DifficultyStage)}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                stage === item.lvl
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scripture Display Area (Interactive Fill) */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-2xl shadow-black/40 min-h-[220px] flex flex-col justify-center">
        {/* Leading verse text with blank slots */}
        <div className="text-lg sm:text-2xl leading-relaxed text-slate-200 font-serif tracking-wide flex flex-wrap items-baseline gap-x-2 gap-y-3">
          {tokenizedWords.map((token, idx) => {
            const isBlank = blankIndices.includes(idx);
            const isCurrent = idx === activeTokenIndex;
            const isFilled = filledWords[idx] !== undefined;

            if (!isBlank) {
              return (
                <span key={token.id} className="text-slate-200 font-normal">
                  {token.fullToken}
                </span>
              );
            }

            if (isFilled) {
              return (
                <span
                  key={token.id}
                  className="inline-flex items-center font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 transition-all animate-in fade-in zoom-in-95 duration-200"
                >
                  {filledWords[idx]}
                  {token.punctuation}
                </span>
              );
            }

            if (isCurrent) {
              return (
                <span
                  key={token.id}
                  className="inline-flex items-center font-bold px-3 py-1 rounded-xl bg-indigo-500/20 border-2 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/20 animate-pulse"
                >
                  <span className="opacity-40">___</span>
                  {token.punctuation}
                </span>
              );
            }

            // Future blanks
            return (
              <span
                key={token.id}
                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-500 text-base"
              >
                ____
                {token.punctuation}
              </span>
            );
          })}
        </div>

        {/* Progress bar inside the verse box */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Blank {Math.min(currentBlankIdx + 1, blankIndices.length)} of {blankIndices.length}
            </span>
          </div>
          <div className="w-32 sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(filledWords).length / blankIndices.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Completion Banner or Word Bank Options */}
      {isCompleted ? (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 p-6 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Verse Memorized!</h3>
            <p className="text-slate-300 text-sm mt-1">
              You earned <span className="text-amber-300 font-bold">+{stage * 10} XP</span> for mastering this stage.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                if (stage < 4) {
                  setStage((stage + 1) as DifficultyStage);
                } else {
                  handleReset();
                }
              }}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>{stage < 4 ? 'Try Next Stage' : 'Practice Again'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNextVerse}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Next Verse</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              Tap the word that leads next:
            </span>
            <span className="text-xs text-indigo-400 font-medium">+{stage * 2} XP per hit</span>
          </div>

          {/* Word Choices Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {options.map((option, i) => {
              const isWrong = wrongWord === option;
              return (
                <button
                  key={`${option}-${i}`}
                  onClick={() => handleSelectWord(option)}
                  className={`py-3.5 px-4 rounded-2xl text-base font-bold transition-all transform active:scale-95 select-none ${
                    isWrong
                      ? 'bg-rose-600/80 text-white border-2 border-rose-400 animate-shake'
                      : 'bg-slate-800 hover:bg-indigo-950/60 hover:border-indigo-500/50 text-slate-100 border border-slate-700/80 shadow-md'
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
