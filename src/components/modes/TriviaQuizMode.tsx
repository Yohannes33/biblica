import React, { useState, useEffect, useCallback } from 'react';
import { Timer, Zap, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';

interface TriviaQuizModeProps {
  verses: Verse[];
  soundEnabled: boolean;
  onFinishQuiz: (score: number, xp: number) => void;
}

interface Question {
  type: 'match-ref' | 'complete-verse';
  prompt: string;
  correctAnswer: string;
  options: string[];
  verseReference: string;
}

const QUESTION_COUNT = 5;
const TIME_LIMIT = 15;

export const TriviaQuizMode: React.FC<TriviaQuizModeProps> = ({
  verses,
  soundEnabled,
  onFinishQuiz,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isGameOver, setIsGameOver] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);

  const generateQuestions = useCallback(() => {
    if (verses.length < 4) return [];
    const pool = [...verses].sort(() => Math.random() - 0.5);
    const selectedVerses = pool.slice(0, QUESTION_COUNT);

    const generated: Question[] = selectedVerses.map((target, idx) => {
      const isRefMatch = idx % 2 === 0;

      if (isRefMatch) {
        const otherRefs = verses
          .filter((v) => v.id !== target.id)
          .map((v) => v.reference)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const options = [target.reference, ...otherRefs].sort(() => Math.random() - 0.5);

        return {
          type: 'match-ref',
          prompt: `Which scripture reference says:\n"${target.text}"?`,
          correctAnswer: target.reference,
          options,
          verseReference: target.reference,
        };
      } else {
        const words = target.text.split(' ');
        const cutPoint = Math.max(3, Math.floor(words.length * 0.6));
        const leadingPart = words.slice(0, cutPoint).join(' ');
        const endingPart = words.slice(cutPoint).join(' ');

        const distractors = verses
          .filter((v) => v.id !== target.id)
          .map((v) => {
            const dw = v.text.split(' ');
            return dw.slice(Math.max(1, Math.floor(dw.length * 0.5))).join(' ');
          })
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [endingPart, ...distractors].sort(() => Math.random() - 0.5);

        return {
          type: 'complete-verse',
          prompt: `Complete ${target.reference}:\n"${leadingPart}..."`,
          correctAnswer: endingPart,
          options,
          verseReference: target.reference,
        };
      }
    });

    return generated;
  }, [verses]);

  const startQuiz = useCallback(() => {
    const qList = generateQuestions();
    setQuestions(qList);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setCombo(1);
    setTimeLeft(TIME_LIMIT);
    setIsGameOver(false);
    setTotalXpEarned(0);
  }, [generateQuestions]);

  useEffect(() => {
    startQuiz();
  }, [startQuiz]);

  const currentQ = questions[currentIdx];

  const handleTimeOut = useCallback(() => {
    playSound.incorrect(soundEnabled);
    setSelectedAnswer('__TIMEOUT__');
    setCombo(1);

    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        setIsGameOver(true);
        onFinishQuiz(score, totalXpEarned);
      } else {
        setCurrentIdx((prev) => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(TIME_LIMIT);
      }
    }, 1200);
  }, [currentIdx, onFinishQuiz, questions.length, score, soundEnabled, totalXpEarned]);

  useEffect(() => {
    if (isGameOver || selectedAnswer !== null) return;

    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, selectedAnswer, handleTimeOut]);

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null || isGameOver) return;

    setSelectedAnswer(option);
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      playSound.correct(soundEnabled);
      const earnedPoints = Math.round(100 * combo);
      const earnedXp = Math.round(10 * combo);
      setScore((prev) => prev + earnedPoints);
      setTotalXpEarned((prev) => prev + earnedXp);
      setCombo((prev) => Math.min(3, prev + 0.5));
    } else {
      playSound.incorrect(soundEnabled);
      setCombo(1);
    }

    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        setIsGameOver(true);
        if (score > 200) {
          playSound.celebrate(soundEnabled);
          fireCelebrationConfetti();
        }
        onFinishQuiz(score, totalXpEarned);
      } else {
        setCurrentIdx((prev) => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(TIME_LIMIT);
      }
    }, 1300);
  };

  if (!currentQ && !isGameOver) {
    return (
      <div className="text-center py-20 text-slate-400 font-medium">
        Loading trivia questions...
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 p-4 sm:p-6 pb-28">
      {/* Header */}
      <div className="theme-card p-4 sm:p-5 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs tabular-nums border border-blue-500/20">
            Q {currentIdx + 1} / {questions.length}
          </div>
          <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 tabular-nums">
            <Zap className="w-3.5 h-3.5 fill-amber-500" />
            <span>{combo.toFixed(1)}x Combo</span>
          </div>
        </div>

        {/* Timer display */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1 font-mono font-bold text-sm px-3 py-1 rounded-xl border tabular-nums ${
              timeLeft <= 4
                ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse'
                : 'theme-subtle text-slate-600 dark:text-slate-300'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
          <div className="font-extrabold text-base tabular-nums text-slate-900 dark:text-white">
            {score} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
        </div>
      </div>

      {isGameOver ? (
        /* Results Screen */
        <div className="theme-card border-blue-500/30 p-8 sm:p-10 rounded-3xl text-center flex flex-col items-center gap-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg">
            <Trophy className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Round Complete!
            </h2>
            <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">
              You scored <span className="text-amber-500 font-bold text-lg tabular-nums">{score} pts</span> and gained{' '}
              <span className="text-blue-600 dark:text-blue-400 font-bold text-lg tabular-nums">+{totalXpEarned} XP</span>.
            </p>
          </div>

          <div className="w-full max-w-sm theme-subtle p-4 rounded-2xl text-sm flex justify-around tabular-nums">
            <div>
              <span className="text-xs text-slate-400 block">Questions</span>
              <span className="font-bold">{questions.length}</span>
            </div>
            <div className="border-l border-inherit" />
            <div>
              <span className="text-xs text-slate-400 block">Combo</span>
              <span className="font-bold text-amber-500">{combo.toFixed(1)}x</span>
            </div>
            <div className="border-l border-inherit" />
            <div>
              <span className="text-xs text-slate-400 block">XP</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">+{totalXpEarned}</span>
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center justify-center gap-2 btn-press"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Next Round</span>
          </button>
        </div>
      ) : (
        /* Active Question */
        <div className="flex flex-col gap-4">
          <div className="theme-card p-6 sm:p-8 rounded-3xl min-h-[140px] flex flex-col justify-center">
            <p className="text-base sm:text-xl font-scripture leading-relaxed whitespace-pre-line text-center">
              {currentQ.prompt}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQ.correctAnswer;
              const hasAnswered = selectedAnswer !== null;

              let btnStyle = 'theme-card hover:border-blue-500';

              if (hasAnswered) {
                if (isCorrectAnswer) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-400 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-600 text-white border-rose-400 font-bold';
                } else {
                  btnStyle = 'opacity-40 theme-subtle text-slate-400';
                }
              }

              return (
                <button
                  key={`${option}-${idx}`}
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(option)}
                  className={`p-4 rounded-2xl border text-sm sm:text-base text-left transition-all flex items-center justify-between gap-3 btn-press ${btnStyle}`}
                >
                  <span className="leading-snug">{option}</span>
                  {hasAnswered && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                  )}
                  {hasAnswered && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
