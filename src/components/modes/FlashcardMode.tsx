import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Shuffle, ChevronLeft, ChevronRight, Square, RefreshCw } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { useSpeech } from '../../utils/useSpeech';

type Rating = 'again' | 'hard' | 'good' | 'easy';

interface FlashcardModeProps {
  verses: Verse[];
  soundEnabled: boolean;
  onRate: (verseId: string, rating: Rating, xp: number) => void;
}

const RATINGS: { id: Rating; label: string; xp: number; cls: string }[] = [
  { id: 'again', label: 'Again', xp: 2, cls: 'bg-danger-soft text-danger-ink [--edge:var(--danger)]' },
  { id: 'hard', label: 'Hard', xp: 8, cls: 'bg-flame-soft text-flame-ink [--edge:var(--flame)]' },
  { id: 'good', label: 'Good', xp: 15, cls: 'bg-teal-soft text-teal-ink [--edge:var(--teal)]' },
  { id: 'easy', label: 'Easy', xp: 25, cls: 'bg-brand-soft text-brand-ink [--edge:var(--brand)]' },
];

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ verses, soundEnabled, onRate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipMode, setFlipMode] = useState<'ref-to-text' | 'text-to-ref'>('ref-to-text');
  const speech = useSpeech();
  const frontRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const flipFocus = useRef(false);

  const currentVerse = verses[currentIndex] || verses[0];

  const { stop: stopSpeech } = speech;
  useEffect(() => stopSpeech(), [currentIndex, stopSpeech]);

  // Move focus to the face that is now showing, so keyboard and screen-reader
  // users aren't left on a control that just became hidden.
  useEffect(() => {
    if (!flipFocus.current) return;
    flipFocus.current = false;
    (isFlipped ? backRef.current : frontRef.current)?.focus({ preventScroll: true });
  }, [isFlipped, currentIndex]);

  const handleFlip = () => {
    playSound.cardFlip(soundEnabled);
    flipFocus.current = true;
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
    setCurrentIndex(Math.floor(Math.random() * verses.length));
  };

  const handleRate = (rating: Rating, xp: number) => {
    if (rating === 'easy' || rating === 'good') {
      playSound.correct(soundEnabled);
      if (rating === 'easy') fireCelebrationConfetti();
    } else {
      playSound.incorrect(soundEnabled);
    }
    onRate(currentVerse.id, rating, xp);
    flipFocus.current = true;
    handleNext();
  };

  const faceBase = 'card absolute inset-0 flex flex-col p-6 backface-hidden sm:p-8';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      <div className="flex items-center gap-2">
        <div className="segmented flex-1" role="group" aria-label="Card prompt">
          <button
            type="button"
            aria-pressed={flipMode === 'ref-to-text'}
            onClick={() => {
              setFlipMode('ref-to-text');
              setIsFlipped(false);
            }}
          >
            Show reference
          </button>
          <button
            type="button"
            aria-pressed={flipMode === 'text-to-ref'}
            onClick={() => {
              setFlipMode('text-to-ref');
              setIsFlipped(false);
            }}
          >
            Show verse
          </button>
        </div>
        <button type="button" onClick={handleShuffle} className="icon-btn h-12 w-12" aria-label="Random card" title="Random card">
          <Shuffle className="h-5 w-5" />
        </button>
      </div>

      <p className="px-1 font-display text-sm font-extrabold text-ink-3 tabular-nums" aria-live="polite">
        Card {currentIndex + 1} of {verses.length}
      </p>

      {/* Flip card */}
      <div className="perspective-1000 h-[22rem] w-full sm:h-96">
        <div
          className={`transform-style-preserve-3d relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <button
            type="button"
            ref={frontRef}
            onClick={handleFlip}
            aria-hidden={isFlipped}
            tabIndex={isFlipped ? -1 : 0}
            className={`${faceBase} items-center justify-center text-center shadow-[0_6px_0_var(--line)]`}
          >
            <span className="absolute top-5 left-6 text-sm text-ink-3 sm:left-8">{currentVerse.category}</span>
            {flipMode === 'ref-to-text' ? (
              <>
                <span className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{currentVerse.reference}</span>
                <span className="pill mt-3 bg-surface-2 text-ink-2">{currentVerse.translation}</span>
                <span className="mt-6 max-w-xs text-ink-2">Say the verse from memory, then flip to check.</span>
              </>
            ) : (
              <>
                <span className="max-h-48 overflow-y-auto font-scripture text-xl leading-relaxed sm:text-2xl">
                  {currentVerse.text}
                </span>
                <span className="mt-6 text-ink-2">Which verse is this?</span>
              </>
            )}
            <span className="absolute bottom-5 flex items-center gap-1.5 font-display text-sm font-extrabold text-brand-ink">
              <RefreshCw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Tap to flip
            </span>
          </button>

          {/* Back */}
          <div
            ref={backRef}
            tabIndex={-1}
            role="region"
            aria-label={`Answer: ${currentVerse.reference}`}
            aria-hidden={!isFlipped}
            onClick={(e) => {
              // Tapping the card (not its speaker button) flips it back.
              if (!(e.target as HTMLElement).closest('button')) handleFlip();
            }}
            className={`${faceBase} rotate-y-180 cursor-pointer border-2 border-brand outline-none`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold">{currentVerse.reference}</p>
                <p className="text-sm text-ink-3">{currentVerse.translation}</p>
              </div>
              {speech.supported && (
                <button
                  type="button"
                  tabIndex={isFlipped ? 0 : -1}
                  onClick={() => speech.toggle(currentVerse.text)}
                  className="icon-btn"
                  aria-pressed={speech.isSpeaking}
                  aria-label={speech.isSpeaking ? 'Stop reading' : 'Read verse aloud'}
                >
                  {speech.isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}
            </div>
            <p className="my-auto max-h-56 overflow-y-auto py-3 text-center font-scripture text-xl leading-relaxed sm:text-2xl">
              {currentVerse.text}
            </p>
            <p className="text-center text-sm text-ink-3">How well did you remember it?</p>
          </div>
        </div>
      </div>

      {isFlipped ? (
        <div className="animate-rise grid grid-cols-4 gap-2" role="group" aria-label="Rate your recall">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRate(r.id, r.xp)}
              className={`btn flex-col gap-0 px-1 ${r.cls}`}
            >
              <span>{r.label}</span>
              <span className="text-xs font-bold opacity-80">+{r.xp} XP</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={handlePrev} className="btn btn-secondary w-14 px-0" aria-label="Previous card">
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={handleFlip} className="btn btn-primary flex-1">
            Flip card
          </button>
          <button type="button" onClick={handleNext} className="btn btn-secondary w-14 px-0" aria-label="Next card">
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};
