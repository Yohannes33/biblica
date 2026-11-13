import React, { useState } from 'react';
import { 
  Rotate3d, 
  Volume2, 
  Shuffle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';

interface FlashcardModeProps {
  verses: Verse[];
  soundEnabled: boolean;
  onRate: (verseId: string, rating: 'again' | 'hard' | 'good' | 'easy', xp: number) => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  verses,
  soundEnabled,
  onRate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipMode, setFlipMode] = useState<'ref-to-text' | 'text-to-ref'>('ref-to-text');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentVerse = verses[currentIndex] || verses[0];

  const handleFlip = () => {
    playSound.cardFlip(soundEnabled);
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % verses.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + verses.length) % verses.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const randomIndex = Math.floor(Math.random() * verses.length);
    setCurrentIndex(randomIndex);
  };

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const xpMap = { again: 2, hard: 8, good: 15, easy: 25 };
    const xp = xpMap[rating];

    if (rating === 'easy' || rating === 'good') {
      playSound.correct(soundEnabled);
      if (rating === 'easy') {
        fireCelebrationConfetti();
      }
    } else {
      playSound.incorrect(soundEnabled);
    }

    onRate(currentVerse.id, rating, xp);
    handleNext();
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentVerse.text);
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 sm:p-6 pb-28">
      {/* Top Controls */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFlipMode(flipMode === 'ref-to-text' ? 'text-to-ref' : 'ref-to-text');
              setIsFlipped(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-card font-semibold btn-press"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {flipMode === 'ref-to-text' ? 'Prompt: Reference' : 'Prompt: Scripture'}
            </span>
          </button>
          <button
            onClick={handleShuffle}
            className="p-2 rounded-xl theme-card text-slate-600 dark:text-slate-300 btn-press"
            title="Random Card"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="font-bold tabular-nums">
          Card {currentIndex + 1} of {verses.length}
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer select-none group"
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-7 sm:p-9 flex flex-col justify-between theme-card shadow-xl group-hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {currentVerse.category}
              </span>
              <span className="text-xs font-medium text-slate-400">
                Tap to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              {flipMode === 'ref-to-text' ? (
                <div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {currentVerse.reference}
                  </h3>
                  <p className="text-xs text-amber-500 mt-2 font-bold">
                    Translation: {currentVerse.translation}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 italic font-scripture">
                    Can you recite the passage from memory?
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg sm:text-2xl font-scripture leading-relaxed italic">
                    "{currentVerse.text}"
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-4 font-bold uppercase tracking-wider">
                    Which verse reference is this?
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-inherit pt-3">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <Rotate3d className="w-4 h-4" />
                <span>Tap to reveal answer</span>
              </div>
              <div className="flex items-center gap-1.5">
                {currentVerse.tags?.map((t) => (
                  <span key={t} className="text-[10px] text-slate-400">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl p-7 sm:p-9 flex flex-col justify-between theme-card border-blue-500/40 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>{currentVerse.reference}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {currentVerse.translation}
                </span>
              </h4>
              <button
                onClick={handleSpeak}
                className={`p-2 rounded-xl border transition-all btn-press ${
                  isSpeaking
                    ? 'bg-blue-600 text-white animate-pulse border-blue-400'
                    : 'theme-subtle text-slate-600 dark:text-slate-300'
                }`}
                title="Read aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto py-2 overflow-y-auto max-h-[190px]">
              <p className="text-lg sm:text-2xl font-scripture leading-relaxed text-center">
                "{currentVerse.text}"
              </p>
            </div>

            <div className="text-center text-xs text-slate-400 border-t border-inherit pt-2 font-medium">
              Rate your recall to adjust your spaced repetition schedule:
            </div>
          </div>
        </div>
      </div>

      {/* Spaced Repetition Buttons */}
      {isFlipped ? (
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleRate('again')}
            className="py-3 px-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Again</span>
            <span className="text-[10px] font-normal tabular-nums">+2 XP</span>
          </button>
          <button
            onClick={() => handleRate('hard')}
            className="py-3 px-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Hard</span>
            <span className="text-[10px] font-normal tabular-nums">+8 XP</span>
          </button>
          <button
            onClick={() => handleRate('good')}
            className="py-3 px-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Good</span>
            <span className="text-[10px] font-normal tabular-nums">+15 XP</span>
          </button>
          <button
            onClick={() => handleRate('easy')}
            className="py-3 px-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span className="flex items-center gap-1">
              Easy <Sparkles className="w-3 h-3 text-emerald-500" />
            </span>
            <span className="text-[10px] font-normal tabular-nums">+25 XP</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            className="flex-1 py-3.5 px-4 rounded-2xl theme-card font-semibold text-sm flex items-center justify-center gap-2 btn-press"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={handleFlip}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 btn-press"
          >
            <Rotate3d className="w-4 h-4" />
            <span>Flip Card</span>
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 px-4 rounded-2xl theme-card font-semibold text-sm flex items-center justify-center gap-2 btn-press"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
