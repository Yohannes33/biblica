import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Lightbulb, Award, ChevronRight } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';

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

export const WordScrambleMode: React.FC<WordScrambleModeProps> = ({
  verse,
  soundEnabled,
  onCorrect,
  onNextVerse,
}) => {
  const [selectedTiles, setSelectedTiles] = useState<TileItem[]>([]);
  const [availableTiles, setAvailableTiles] = useState<TileItem[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongTileId, setWrongTileId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  const words = useMemo(() => {
    return verse.text.split(/\s+/).filter(Boolean);
  }, [verse.text]);

  const setupPuzzle = () => {
    const tiles: TileItem[] = words.map((w, index) => ({
      id: `${index}-${w}`,
      originalIndex: index,
      word: w,
    }));

    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    setAvailableTiles(shuffled);
    setSelectedTiles([]);
    setIsCompleted(false);
    setHintIndex(null);
  };

  useEffect(() => {
    setupPuzzle();
  }, [verse.id]);

  const handleTileClick = (tile: TileItem) => {
    if (isCompleted) return;

    const expectedIndex = selectedTiles.length;
    if (tile.originalIndex === expectedIndex) {
      playSound.correct(soundEnabled);
      const newSelected = [...selectedTiles, tile];
      setSelectedTiles(newSelected);
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setWrongTileId(null);
      setHintIndex(null);

      if (newSelected.length === words.length) {
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        onCorrect(35);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setWrongTileId(tile.id);
      setTimeout(() => setWrongTileId(null), 600);
    }
  };

  const handleHint = () => {
    const nextExpectedIndex = selectedTiles.length;
    setHintIndex(nextExpectedIndex);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-28">
      {/* Header */}
      <div className="theme-card p-4 sm:p-5 rounded-3xl flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
            Word Scramble
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {verse.reference}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleHint}
            className="p-2.5 rounded-2xl theme-subtle text-amber-500 hover:text-amber-600 btn-press"
            title="Hint"
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          <button
            onClick={setupPuzzle}
            className="p-2.5 rounded-2xl theme-subtle text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 btn-press"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Rebuilt Sentence */}
      <div className="min-h-[160px] sm:min-h-[190px] theme-card rounded-3xl p-6 sm:p-8 flex flex-wrap content-start items-baseline gap-2">
        {selectedTiles.length === 0 ? (
          <div className="w-full h-full my-auto flex flex-col items-center justify-center text-slate-400 text-sm font-medium">
            <span>Tap the scrambled scripture tokens below in order</span>
          </div>
        ) : (
          selectedTiles.map((tile) => (
            <span
              key={tile.id}
              className="inline-block px-3 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-base sm:text-lg font-scripture font-semibold animate-in zoom-in-95 duration-150"
            >
              {tile.word}
            </span>
          ))
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="tabular-nums font-medium">
          Assembled {selectedTiles.length} of {words.length} tokens
        </span>
        <span className="text-blue-600 dark:text-blue-400 font-bold tabular-nums">+35 XP</span>
      </div>

      {/* Scrambled Chips */}
      {isCompleted ? (
        <div className="theme-card border-emerald-500/30 p-7 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Verse Rebuilt Flawlessly!</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
              You pieced every word together into scripture.
            </p>
            <div className="mt-2 text-xs font-bold text-amber-500">+35 XP Earned</div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={setupPuzzle}
              className="px-6 py-3.5 rounded-2xl theme-subtle font-semibold text-sm border flex items-center gap-2 btn-press"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              onClick={onNextVerse}
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center gap-2 btn-press"
            >
              <span>Next Verse</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 p-4 theme-card rounded-3xl">
          {availableTiles.map((tile) => {
            const isWrong = wrongTileId === tile.id;
            const isHint = hintIndex === tile.originalIndex;

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className={`px-3.5 py-2 rounded-xl text-sm sm:text-base font-medium transition-all btn-press shadow-sm ${
                  isWrong
                    ? 'bg-rose-500 text-white border border-rose-400 animate-shake'
                    : isHint
                    ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400 animate-pulse font-bold'
                    : 'theme-subtle hover:border-blue-500'
                }`}
              >
                {tile.word}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
