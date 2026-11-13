import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Lightbulb, Award, ArrowRight } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { ProgressBar } from '../ui/Progress';
import { useRevealOnShow } from '../../utils/useRevealOnShow';

interface WordScrambleModeProps {
  verse: Verse;
  soundEnabled: boolean;
  onCorrect: (xp: number) => void;
  onNextVerse: () => void;
}

interface TileItem {
  id: string;
  originalIndex: number;
  word: string;
}

const SCRAMBLE_XP = 35;
// Hints are a boost, not a walkthrough: a small budget per verse, topped up
// by placing words correctly on your own.
const HINTS_PER_VERSE = 3;
const STREAK_FOR_HINT = 5;
const MAX_HINTS = 5;

export const WordScrambleMode: React.FC<WordScrambleModeProps> = ({ verse, soundEnabled, onCorrect, onNextVerse }) => {
  const [selectedTiles, setSelectedTiles] = useState<TileItem[]>([]);
  const [availableTiles, setAvailableTiles] = useState<TileItem[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongTileId, setWrongTileId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_VERSE);
  const [streak, setStreak] = useState(0);
  const [earnedFlash, setEarnedFlash] = useState(false);
  const completeRef = useRevealOnShow<HTMLElement>(isCompleted);

  const words = useMemo(() => verse.text.split(/\s+/).filter(Boolean), [verse.text]);

  const setupPuzzle = () => {
    const tiles: TileItem[] = words.map((w, index) => ({ id: `${index}-${w}`, originalIndex: index, word: w }));
    setAvailableTiles([...tiles].sort(() => Math.random() - 0.5));
    setSelectedTiles([]);
    setIsCompleted(false);
    setHintIndex(null);
    setHintsLeft(HINTS_PER_VERSE);
    setStreak(0);
    setEarnedFlash(false);
  };

  const takeHint = () => {
    if (hintsLeft <= 0 || hintIndex !== null || isCompleted) return;
    setHintsLeft((n) => n - 1);
    setHintIndex(selectedTiles.length);
  };

  useEffect(() => {
    setupPuzzle();
  }, [verse.id]);

  const handleTileClick = (tile: TileItem) => {
    if (isCompleted) return;

    if (tile.originalIndex === selectedTiles.length) {
      playSound.correct(soundEnabled);
      const newSelected = [...selectedTiles, tile];
      setSelectedTiles(newSelected);
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setWrongTileId(null);
      // A word found with a hint doesn't count toward earning the next one.
      if (hintIndex === null) {
        const next = streak + 1;
        if (next >= STREAK_FOR_HINT) {
          setStreak(0);
          if (hintsLeft < MAX_HINTS) {
            setHintsLeft((n) => Math.min(MAX_HINTS, n + 1));
            setEarnedFlash(true);
            window.setTimeout(() => setEarnedFlash(false), 1800);
          }
        } else {
          setStreak(next);
        }
      }
      setHintIndex(null);

      if (newSelected.length === words.length) {
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        onCorrect(SCRAMBLE_XP);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setStreak(0);
      setWrongTileId(tile.id);
      setTimeout(() => setWrongTileId(null), 600);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Rebuild the verse</h2>
          <p className="text-sm text-ink-3" aria-live="polite">
            {isCompleted
              ? 'Tap the words in order.'
              : hintsLeft >= MAX_HINTS
                ? 'Tap the words in order.'
                : `${STREAK_FOR_HINT - streak} in a row earns a hint`}
          </p>
        </div>
        <button
          type="button"
          onClick={takeHint}
          disabled={isCompleted || hintsLeft <= 0 || hintIndex !== null}
          className="btn btn-sm btn-secondary relative"
          aria-label={`Hint, ${hintsLeft} left`}
        >
          <Lightbulb className="h-[18px] w-[18px] text-gold-ink" strokeWidth={2.5} />
          Hint
          <span
            className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[0.8125rem] tabular-nums ${
              hintsLeft > 0 ? 'bg-gold text-[oklch(0.28_0.06_70)]' : 'bg-surface-3 text-ink-3'
            } ${earnedFlash ? 'animate-pop' : ''}`}
            aria-hidden="true"
          >
            {hintsLeft}
          </span>
        </button>
        <button type="button" onClick={setupPuzzle} className="icon-btn" aria-label="Shuffle and restart" title="Restart">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Floats over the page so the word tiles never shift under a finger. */}
      {earnedFlash && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+4.75rem)] z-40 flex justify-center">
          <p role="status" className="animate-pop rounded-full bg-gold px-4 py-1.5 font-display font-extrabold text-[oklch(0.28_0.06_70)] shadow-lg">
            +1 hint earned!
          </p>
        </div>
      )}

      {/* Built sentence */}
      <article className="card flex min-h-44 flex-col p-5 sm:p-6" aria-label={`${verse.reference}, words placed so far`}>
        <div className="mb-4 flex items-center gap-3">
          <ProgressBar value={(selectedTiles.length / words.length) * 100} label="Words placed" className="flex-1" />
          <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">
            {selectedTiles.length}/{words.length}
          </span>
        </div>
        {selectedTiles.length === 0 ? (
          <p className="my-auto text-center text-ink-3">
            Start with the first word of <span className="font-semibold text-ink-2">{verse.reference}</span>
          </p>
        ) : (
          <p className="font-scripture text-xl leading-[1.9] sm:text-2xl" aria-live="polite">
            {selectedTiles.map((tile, i) => (
              <React.Fragment key={tile.id}>
                <span className={i === selectedTiles.length - 1 ? 'animate-pop inline-block' : ''}>{tile.word}</span>{' '}
              </React.Fragment>
            ))}
            {!isCompleted && (
              <span className="animate-slot inline-block h-7 w-12 translate-y-1 rounded-lg border-2 border-brand bg-brand-soft" aria-hidden="true" />
            )}
          </p>
        )}
      </article>

      {isCompleted ? (
        <section
          ref={completeRef}
          className="card animate-rise flex scroll-mb-[calc(var(--tabbar-h)+var(--safe-bottom)+1rem)] flex-col items-center gap-4 border-gold bg-gold-soft p-6 text-center"
          aria-live="polite"
        >
          <span className="animate-pop grid h-16 w-16 place-items-center rounded-full bg-gold text-[oklch(0.3_0.06_70)] shadow-[0_4px_0_var(--gold-edge)]">
            <Award className="h-9 w-9" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Verse rebuilt!</h2>
            <p className="mt-1 text-ink-2">Every word in the right place.</p>
            <p className="pill mt-3 bg-gold px-3 text-base text-[oklch(0.28_0.06_70)]">+{SCRAMBLE_XP} XP</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onNextVerse} className="btn btn-primary flex-1">
              Next verse
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button type="button" onClick={setupPuzzle} className="btn btn-secondary flex-1">
              Play again
            </button>
          </div>
        </section>
      ) : (
        <section aria-label="Scrambled words" className="flex flex-wrap gap-2.5">
          {availableTiles.map((tile) => {
            const isWrong = wrongTileId === tile.id;
            const isHint = hintIndex === tile.originalIndex;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleTileClick(tile)}
                className={`tile min-h-12 px-4 py-2 font-display text-[1.0625rem] font-bold ${
                  isWrong ? 'tile-wrong animate-shake' : isHint ? 'tile-hint animate-pop' : ''
                }`}
              >
                {tile.word}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
};
