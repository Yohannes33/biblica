import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Lightbulb, Award, ArrowRight } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { ProgressBar } from '../ui/Progress';
import { useRevealOnShow } from '../../utils/useRevealOnShow';
import { languageOf } from '../../data/translations';
import { useT } from '../../i18n';
import { usePassageVerses, type PassageVerse } from '../../utils/usePassageVerses';
import { PassageLoading, PassageSteps, VerseDone } from './PassageSteps';

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

export const WordScrambleMode: React.FC<WordScrambleModeProps> = (props) => {
  const passage = usePassageVerses(props.verse);
  if (passage.loading) return <PassageLoading />;
  return <ScramblePassage {...props} verses={passage.verses} />;
};

const shuffledTiles = (text: string): TileItem[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, index) => ({ id: `${index}-${w}`, originalIndex: index, word: w }))
    .sort(() => Math.random() - 0.5);

/**
 * A passage of several verses is rebuilt one verse at a time: only the current
 * verse's words are scrambled. Hints carry over from verse to verse, and XP
 * comes once, after the last verse.
 */
const ScramblePassage: React.FC<WordScrambleModeProps & { verses: PassageVerse[] }> = ({
  verse,
  verses,
  soundEnabled,
  onCorrect,
  onNextVerse,
}) => {
  // Which verse of the passage, tagged with the wording it belongs to, so a
  // new wording starts from the first verse in the same render.
  const [step, setStep] = useState({ run: '', idx: 0 });
  const [selectedTiles, setSelectedTiles] = useState<TileItem[]>([]);
  const [availableTiles, setAvailableTiles] = useState<TileItem[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongTileId, setWrongTileId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_VERSE);
  const [streak, setStreak] = useState(0);
  const [earnedFlash, setEarnedFlash] = useState(false);
  const completeRef = useRevealOnShow<HTMLElement>(isCompleted);
  const t = useT();

  const run = verses.map((v) => v.text).join('\n');
  const verseIdx = step.run === run ? Math.min(step.idx, verses.length - 1) : 0;
  const isPassage = verses.length > 1;
  const current = verses[verseIdx];
  const isLastVerse = verseIdx === verses.length - 1;
  const lang = languageOf(verse.translation);

  const words = useMemo(() => current.text.split(/\s+/).filter(Boolean), [current.text]);

  const startVerse = (idx: number) => {
    setStep({ run, idx });
    setAvailableTiles(shuffledTiles(verses[idx].text));
    setSelectedTiles([]);
    setIsCompleted(false);
    setHintIndex(null);
    setWrongTileId(null);
  };

  // Restart and Play again go back to the passage's first verse with a fresh hint budget.
  const setupPuzzle = () => {
    startVerse(0);
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
  }, [verse.id, run]); // the wording changes when the default translation does

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
        if (isLastVerse) {
          playSound.celebrate(soundEnabled);
          fireCelebrationConfetti();
          onCorrect(SCRAMBLE_XP);
        }
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
          <h2 className="font-display text-xl font-extrabold tracking-tight">{t('scramble.title')}</h2>
          <p className="text-sm text-ink-3" aria-live="polite">
            {isCompleted
              ? t('scramble.tapInOrder')
              : hintsLeft >= MAX_HINTS
                ? t('scramble.tapInOrder')
                : t('scramble.streakForHint', { n: STREAK_FOR_HINT - streak })}
          </p>
        </div>
        <button
          type="button"
          onClick={takeHint}
          disabled={isCompleted || hintsLeft <= 0 || hintIndex !== null}
          className="btn btn-sm btn-secondary relative"
          aria-label={t('scramble.hintLabel', { n: hintsLeft })}
        >
          <Lightbulb className="h-[18px] w-[18px] text-gold-ink" strokeWidth={2.5} />
          {t('scramble.hint')}
          <span
            className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[0.8125rem] tabular-nums ${
              hintsLeft > 0 ? 'bg-gold text-[oklch(0.28_0.06_70)]' : 'bg-surface-3 text-ink-3'
            } ${earnedFlash ? 'animate-pop' : ''}`}
            aria-hidden="true"
          >
            {hintsLeft}
          </span>
        </button>
        <button type="button" onClick={setupPuzzle} className="icon-btn" aria-label={t('scramble.restartLabel')} title={t('scramble.restart')}>
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Floats over the page so the word tiles never shift under a finger. */}
      {earnedFlash && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+4.75rem)] z-40 flex justify-center">
          <p role="status" className="animate-pop rounded-full bg-gold px-4 py-1.5 font-display font-extrabold text-[oklch(0.28_0.06_70)] shadow-lg">
            {t('scramble.hintEarned')}
          </p>
        </div>
      )}

      {/* Built sentence */}
      <article className="card flex min-h-44 flex-col p-5 sm:p-6" aria-label={t('scramble.verseLabel', { reference: current.reference })}>
        {isPassage && <PassageSteps index={verseIdx} total={verses.length} reference={current.reference} lang={lang} />}
        <div className="mb-4 flex items-center gap-3">
          <ProgressBar value={(selectedTiles.length / words.length) * 100} label={t('scramble.wordsPlaced')} className="flex-1" />
          <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">
            {selectedTiles.length}/{words.length}
          </span>
        </div>
        {selectedTiles.length === 0 ? (
          <p className="my-auto text-center text-ink-3">
            {t('scramble.startBefore')}
            <span lang={lang} className="font-semibold text-ink-2">
              {current.reference}
            </span>
            {t('scramble.startAfter')}
          </p>
        ) : (
          <p lang={lang} className="font-scripture text-xl leading-[1.9] sm:text-2xl" aria-live="polite">
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

      {isCompleted && !isLastVerse ? (
        <VerseDone key={verseIdx} index={verseIdx} total={verses.length} onNext={() => startVerse(verseIdx + 1)} />
      ) : isCompleted ? (
        <section
          ref={completeRef}
          className="card animate-rise flex scroll-mb-[calc(var(--tabbar-h)+var(--safe-bottom)+1rem)] flex-col items-center gap-4 border-gold bg-gold-soft p-6 text-center"
          aria-live="polite"
        >
          <span className="animate-pop grid h-16 w-16 place-items-center rounded-full bg-gold text-[oklch(0.3_0.06_70)] shadow-[0_4px_0_var(--gold-edge)]">
            <Award className="h-9 w-9" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{t('scramble.rebuilt')}</h2>
            <p className="mt-1 text-ink-2">{t('scramble.rebuiltBody')}</p>
            <p className="pill mt-3 bg-gold px-3 text-base text-[oklch(0.28_0.06_70)]">{t('scramble.xp', { n: SCRAMBLE_XP })}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onNextVerse} className="btn btn-primary flex-1">
              {t('scramble.nextVerse')}
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button type="button" onClick={setupPuzzle} className="btn btn-secondary flex-1">
              {t('scramble.playAgain')}
            </button>
          </div>
        </section>
      ) : (
        <section aria-label={t('scramble.words')} className="flex flex-wrap gap-2.5">
          {availableTiles.map((tile) => {
            const isWrong = wrongTileId === tile.id;
            const isHint = hintIndex === tile.originalIndex;
            return (
              <button
                key={tile.id}
                type="button"
                lang={lang}
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
