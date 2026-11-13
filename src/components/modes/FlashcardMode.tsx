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
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFlipMode(flipMode === 'ref-to-text' ? 'text-to-ref' : 'ref-to-text');
              setIsFlipped(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl apple-card text-slate-300 hover:text-white btn-press"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {flipMode === 'ref-to-text' ? 'Prompt: Reference' : 'Prompt: Scripture'}
            </span>
          </button>
          <button
            onClick={handleShuffle}
            className="p-2 rounded-xl apple-card text-slate-300 hover:text-white btn-press"
            title="Random Card"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="font-semibold text-slate-300 tabular-nums">
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
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-7 sm:p-9 flex flex-col justify-between apple-card border-white/[0.1] shadow-2xl group-hover:border-blue-400/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                {currentVerse.category}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Tap to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              {flipMode === 'ref-to-text' ? (
                <div>
                  <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {currentVerse.reference}
                  </h3>
                  <p className="text-xs text-amber-300/80 mt-2 font-medium">
                    Translation: {currentVerse.translation}
                  </p>
                  <p className="text-sm text-slate-400 mt-4 italic font-scripture">
                    Can you recite the passage from memory?
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg sm:text-2xl font-scripture text-slate-100 leading-relaxed italic">
                    "{currentVerse.text}"
                  </p>
                  <p className="text-xs text-blue-400 mt-4 font-semibold uppercase tracking-wider">
                    Which verse reference is this?
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                <Rotate3d className="w-4 h-4" />
                <span>Tap to reveal answer</span>
              </div>
              <div className="flex items-center gap-1.5">
                {currentVerse.tags?.map((t) => (
                  <span key={t} className="text-[10px] text-slate-500">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl p-7 sm:p-9 flex flex-col justify-between apple-card border-blue-400/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{currentVerse.reference}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  {currentVerse.translation}
                </span>
              </h4>
              <button
                onClick={handleSpeak}
                className={`p-2 rounded-xl border transition-all btn-press ${
                  isSpeaking
                    ? 'bg-blue-600 text-white animate-pulse border-blue-400'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border-white/[0.08]'
                }`}
                title="Read aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto py-2 overflow-y-auto max-h-[190px]">
              <p className="text-lg sm:text-2xl font-scripture text-slate-100 leading-relaxed text-center">
                "{currentVerse.text}"
              </p>
            </div>

            <div className="text-center text-xs text-slate-400 border-t border-white/[0.06] pt-2 font-medium">
              Rate your recall to adjust your review schedule:
            </div>
          </div>
        </div>
      </div>

      {/* Spaced Repetition Rating Buttons */}
      {isFlipped ? (
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleRate('again')}
            className="py-3 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Again</span>
            <span className="text-[10px] text-rose-400 font-normal tabular-nums">+2 XP</span>
          </button>
          <button
            onClick={() => handleRate('hard')}
            className="py-3 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Hard</span>
            <span className="text-[10px] text-amber-400 font-normal tabular-nums">+8 XP</span>
          </button>
          <button
            onClick={() => handleRate('good')}
            className="py-3 px-2 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span>Good</span>
            <span className="text-[10px] text-blue-400 font-normal tabular-nums">+15 XP</span>
          </button>
          <button
            onClick={() => handleRate('easy')}
            className="py-3 px-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex flex-col items-center gap-1 btn-press"
          >
            <span className="flex items-center gap-1">
              Easy <Sparkles className="w-3 h-3 text-emerald-400" />
            </span>
            <span className="text-[10px] text-emerald-400 font-normal tabular-nums">+25 XP</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            className="flex-1 py-3.5 px-4 rounded-2xl apple-card text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 btn-press"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={handleFlip}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 btn-press"
          >
            <Rotate3d className="w-4 h-4" />
            <span>Flip Card</span>
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 px-4 rounded-2xl apple-card text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 btn-press"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
