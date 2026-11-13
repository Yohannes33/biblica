import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Trophy, RotateCcw, Check, X } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { Ring } from '../ui/Progress';

interface TriviaQuizModeProps {
  verses: Verse[];
  soundEnabled: boolean;
  onFinishQuiz: (score: number, xp: number) => void;
}

interface Question {
  type: 'match-ref' | 'complete-verse';
  ask: string;
  quote: string;
  correctAnswer: string;
  options: string[];
  verseReference: string;
}

const QUESTION_COUNT = 5;
const TIME_LIMIT = 15;
const LETTERS = ['A', 'B', 'C', 'D'];

export const TriviaQuizMode: React.FC<TriviaQuizModeProps> = ({ verses, soundEnabled, onFinishQuiz }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const generateQuestions = useCallback(() => {
    if (verses.length < 4) return [];
    const pool = [...verses].sort(() => Math.random() - 0.5);
    const selectedVerses = pool.slice(0, QUESTION_COUNT);

    return selectedVerses.map((target, idx): Question => {
      if (idx % 2 === 0) {
        const otherRefs = verses
          .filter((v) => v.id !== target.id)
          .map((v) => v.reference)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        return {
          type: 'match-ref',
          ask: 'Which verse is this?',
          quote: target.text,
          correctAnswer: target.reference,
          options: [target.reference, ...otherRefs].sort(() => Math.random() - 0.5),
          verseReference: target.reference,
        };
      }

      const words = target.text.split(' ');
      const cutPoint = Math.max(3, Math.floor(words.length * 0.6));
      const endingPart = words.slice(cutPoint).join(' ');
      const distractors = verses
        .filter((v) => v.id !== target.id)
        .map((v) => {
          const dw = v.text.split(' ');
          return dw.slice(Math.max(1, Math.floor(dw.length * 0.5))).join(' ');
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      return {
        type: 'complete-verse',
        ask: `Finish ${target.reference}`,
        quote: `${words.slice(0, cutPoint).join(' ')}…`,
        correctAnswer: endingPart,
        options: [endingPart, ...distractors].sort(() => Math.random() - 0.5),
        verseReference: target.reference,
      };
    });
  }, [verses]);

  const startQuiz = useCallback(() => {
    setQuestions(generateQuestions());
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setCombo(1);
    setTimeLeft(TIME_LIMIT);
    setIsGameOver(false);
    setTotalXpEarned(0);
    setResults([]);
  }, [generateQuestions]);

  useEffect(() => {
    startQuiz();
  }, [startQuiz]);

  const currentQ = questions[currentIdx];

  // Totals are passed in explicitly: state set in the same tick as this call
  // has not been committed yet, so reading `score` here would miss the last answer.
  const advance = useCallback(
    (finalScore: number, finalXp: number) => {
      setTimeout(() => {
        if (currentIdx + 1 >= questions.length) {
          setIsGameOver(true);
          if (finalScore > 200) {
            playSound.celebrate(soundEnabled);
            fireCelebrationConfetti();
          }
          onFinishQuiz(finalScore, finalXp);
        } else {
          setCurrentIdx((prev) => prev + 1);
          setSelectedAnswer(null);
          setTimeLeft(TIME_LIMIT);
        }
      }, 1300);
    },
    [currentIdx, onFinishQuiz, questions.length, soundEnabled]
  );

  const handleTimeOut = useCallback(() => {
    playSound.incorrect(soundEnabled);
    setSelectedAnswer('__TIMEOUT__');
    setCombo(1);
    setResults((r) => [...r, false]);
    advance(score, totalXpEarned);
  }, [advance, score, soundEnabled, totalXpEarned]);

  useEffect(() => {
    if (isGameOver || selectedAnswer !== null) return;
    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, selectedAnswer, handleTimeOut]);

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null || isGameOver) return;
    setSelectedAnswer(option);
    const isCorrect = option === currentQ.correctAnswer;
    let nextScore = score;
    let nextXp = totalXpEarned;

    if (isCorrect) {
      playSound.correct(soundEnabled);
      nextScore += Math.round(100 * combo);
      nextXp += Math.round(10 * combo);
      setScore(nextScore);
      setTotalXpEarned(nextXp);
      setCombo((prev) => Math.min(3, prev + 0.5));
    } else {
      playSound.incorrect(soundEnabled);
      setCombo(1);
    }
    setResults((r) => [...r, isCorrect]);
    advance(nextScore, nextXp);
  };

  if (verses.length < 4) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 text-center text-ink-2">
        Trivia needs at least 4 verses in your library. Add a few more to play.
      </div>
    );
  }

  if (!currentQ && !isGameOver) {
    return <div className="py-20 text-center text-ink-3">Getting questions ready…</div>;
  }

  const correctCount = results.filter(Boolean).length;
  const timeLow = timeLeft <= 4;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      {/* Status strip */}
      <div className="flex items-center gap-3">
        <ol className="flex flex-1 gap-1.5" aria-label={`Question ${Math.min(currentIdx + 1, questions.length)} of ${questions.length}`}>
          {questions.map((_, i) => {
            const r = results[i];
            const cls =
              r === true ? 'bg-brand' : r === false ? 'bg-danger' : i === currentIdx && !isGameOver ? 'bg-brand/35' : 'bg-surface-3';
            return <li key={i} className={`h-2.5 flex-1 rounded-full transition-colors ${cls}`} />;
          })}
        </ol>
        <span
          className={`pill transition-colors ${combo > 1 ? 'bg-gold text-[oklch(0.28_0.06_70)]' : 'bg-surface-2 text-ink-2'}`}
          aria-label={`Combo ${combo.toFixed(1)} times`}
        >
          <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />×{combo.toFixed(1)}
        </span>
      </div>

      {isGameOver ? (
        <section className="card animate-rise flex flex-col items-center gap-5 p-6 text-center sm:p-8" aria-live="polite">
          <span className="animate-pop grid h-20 w-20 place-items-center rounded-full bg-gold text-[oklch(0.3_0.06_70)] shadow-[0_5px_0_var(--gold-edge)]">
            <Trophy className="h-10 w-10" strokeWidth={2.25} />
          </span>
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {correctCount === questions.length ? 'Perfect round!' : correctCount >= 3 ? 'Great round!' : 'Round complete'}
            </h2>
            <p className="mt-1 text-ink-2">
              {correctCount} of {questions.length} correct
            </p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-ink-3">Score</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums">{score}</dd>
            </div>
            <div className="rounded-2xl bg-gold-soft p-4">
              <dt className="text-sm text-gold-ink">XP earned</dt>
              <dd className="font-display text-3xl font-extrabold text-gold-ink tabular-nums">+{totalXpEarned}</dd>
            </div>
          </dl>
          <button type="button" onClick={startQuiz} className="btn btn-primary w-full">
            <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
            Play another round
          </button>
        </section>
      ) : (
        <>
          <article className="card p-5 sm:p-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold">{currentQ.ask}</h2>
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">{score} pts</span>
                <Ring value={(timeLeft / TIME_LIMIT) * 100} size={44} stroke={4} tone={timeLow ? 'danger' : 'brand'}>
                  <span
                    className={`font-display text-sm font-extrabold tabular-nums ${timeLow ? 'text-danger-ink' : ''}`}
                    role="timer"
                    aria-label={`${timeLeft} seconds left`}
                  >
                    {timeLeft}
                  </span>
                </Ring>
              </div>
            </div>
            <p className="font-scripture text-xl leading-relaxed sm:text-[1.375rem]">“{currentQ.quote}”</p>
          </article>

          <div className="flex flex-col gap-3" role="group" aria-label="Answers">
            {currentQ.options.map((option, idx) => {
              const hasAnswered = selectedAnswer !== null;
              const isCorrectAnswer = option === currentQ.correctAnswer;
              const isSelected = selectedAnswer === option;
              const state = !hasAnswered
                ? ''
                : isCorrectAnswer
                  ? 'tile-correct animate-pop'
                  : isSelected
                    ? 'tile-wrong animate-shake'
                    : 'opacity-45';
              return (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(option)}
                  className={`tile flex min-h-14 items-center gap-3 p-3 text-left ${state}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-extrabold ${
                      hasAnswered && (isCorrectAnswer || isSelected) ? 'bg-white/25' : 'bg-surface-2 text-ink-2'
                    }`}
                    aria-hidden="true"
                  >
                    {hasAnswered && isCorrectAnswer ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : hasAnswered && isSelected ? (
                      <X className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      LETTERS[idx]
                    )}
                  </span>
                  <span
                    className={
                      currentQ.type === 'match-ref'
                        ? 'font-display text-lg font-bold'
                        : 'font-scripture text-[1.0625rem] leading-snug'
                    }
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedAnswer === '__TIMEOUT__' && (
            <p className="text-center font-display font-extrabold text-danger-ink" role="status">
              Time’s up!
            </p>
          )}
        </>
      )}
    </div>
  );
};
