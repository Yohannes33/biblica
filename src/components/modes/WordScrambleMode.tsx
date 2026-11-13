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

  // Split words
  const words = useMemo(() => {
    return verse.text.split(/\s+/).filter(Boolean);
  }, [verse.text]);

  // Initialize and scramble
  const setupPuzzle = () => {
    const tiles: TileItem[] = words.map((w, index) => ({
      id: `${index}-${w}`,
      originalIndex: index,
      word: w,
    }));

    // Random shuffle
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
      // Correct tile!
      playSound.correct(soundEnabled);
      const newSelected = [...selectedTiles, tile];
      setSelectedTiles(newSelected);
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setWrongTileId(null);
      setHintIndex(null);

      // Check if finished
      if (newSelected.length === words.length) {
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        onCorrect(30);
      }
    } else {
      // Incorrect tile
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
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            Word Scramble
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            {verse.reference}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleHint}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 transition-colors"
            title="Hint"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
          <button
            onClick={setupPuzzle}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reconstructed Sentence Target Area */}
      <div className="min-h-[160px] sm:min-h-[190px] bg-slate-900/80 rounded-3xl p-6 border-2 border-dashed border-slate-700/80 flex flex-wrap content-start items-baseline gap-2">
        {selectedTiles.length === 0 ? (
          <div className="w-full h-full my-auto flex flex-col items-center justify-center text-slate-500 text-sm">
            <span>Tap the scrambled tiles below in the correct order to rebuild the verse.</span>
          </div>
        ) : (
          selectedTiles.map((tile) => (
            <span
              key={tile.id}
              className="inline-block px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-base sm:text-lg font-serif font-semibold animate-in zoom-in-95 duration-150"
            >
              {tile.word}
            </span>
          ))
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Assembled {selectedTiles.length} of {words.length} words
        </span>
        <span className="text-indigo-400 font-semibold">+30 XP upon completion</span>
      </div>

      {/* Available Scrambled Tiles */}
      {isCompleted ? (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 p-6 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Scramble Solved!</h3>
            <p className="text-slate-300 text-sm mt-1">
              You rebuilt the entire verse flawlessly! <span className="text-amber-300 font-bold">+30 XP</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={setupPuzzle}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              onClick={onNextVerse}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <span>Next Verse</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 p-4 bg-slate-900/40 rounded-3xl border border-slate-800/80">
          {availableTiles.map((tile) => {
            const isWrong = wrongTileId === tile.id;
            const isHint = hintIndex === tile.originalIndex;

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className={`px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all transform active:scale-95 shadow-md ${
                  isWrong
                    ? 'bg-rose-600 text-white border-2 border-rose-400 animate-shake'
                    : isHint
                    ? 'bg-amber-500/30 text-amber-200 border-2 border-amber-400 animate-bounce'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 hover:border-indigo-400'
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
