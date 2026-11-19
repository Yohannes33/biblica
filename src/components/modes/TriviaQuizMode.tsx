import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Trophy, RotateCcw, Check, X, Play } from 'lucide-react';
import type { Verse } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { Ring } from '../ui/Progress';
import { languageOf } from '../../data/translations';
import { useT } from '../../i18n';

interface TriviaQuizModeProps {
  verses: Verse[];
  soundEnabled: boolean;
  onFinishQuiz: (score: number, xp: number) => void;
}

interface Question {
  type: 'match-ref' | 'complete-verse';
  quote: string;
  correctAnswer: string;
  options: string[];
  verseReference: string;
  lang: 'en' | 'am';
}

type QuizPhase = 'ready' | 'playing' | 'finished';

const QUESTION_COUNT = 5;
const TIME_LIMIT = 15;

export const TriviaQuizMode: React.FC<TriviaQuizModeProps> = ({ verses, soundEnabled, onFinishQuiz }) => {
  const [phase, setPhase] = useState<QuizPhase>('ready');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const advanceTimerRef = useRef<number | null>(null);
  const t = useT();
  // Answer markers: A–D in English, ሀ ለ ሐ መ in Amharic.
  const letters = Array.from(t('trivia.letters'));

  const generateQuestions = useCallback(() => {
    if (verses.length < 4) return [];
    const pool = [...verses].sort(() => Math.random() - 0.5);
    const selectedVerses = pool.slice(0, QUESTION_COUNT);

    return selectedVerses.map((target, idx): Question => {
      // Wrong answers come from verses in the target's language, so an Amharic
      // question isn't answered by spotting the one Amharic choice.
      const lang = languageOf(target.translation);
      const others = verses.filter((v) => v.id !== target.id);
      const sameLanguage = others.filter((v) => languageOf(v.translation) === lang);
      const decoys = sameLanguage.length >= 3 ? sameLanguage : others;
      if (idx % 2 === 0) {
        const otherRefs = decoys
          .map((v) => v.reference)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        return {
          type: 'match-ref',
          quote: target.text,
          correctAnswer: target.reference,
          options: [target.reference, ...otherRefs].sort(() => Math.random() - 0.5),
          verseReference: target.reference,
          lang,
        };
      }

      const words = target.text.split(' ');
      const cutPoint = Math.max(3, Math.floor(words.length * 0.6));
      const endingPart = words.slice(cutPoint).join(' ');
      const distractors = decoys
        .map((v) => {
          const dw = v.text.split(' ');
          return dw.slice(Math.max(1, Math.floor(dw.length * 0.5))).join(' ');
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      return {
        type: 'complete-verse',
        quote: `${words.slice(0, cutPoint).join(' ')}…`,
        correctAnswer: endingPart,
        options: [endingPart, ...distractors].sort(() => Math.random() - 0.5),
        verseReference: target.reference,
        lang,
      };
    });
  }, [verses]);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

  // Reset to the start screen if the verse library changes (e.g. translation switch)
  // so questions never go stale and the countdown never starts behind a modal.
  useEffect(() => {
    clearAdvanceTimer();
    setPhase('ready');
    setQuestions([]);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setCombo(1);
    setTimeLeft(TIME_LIMIT);
    setTotalXpEarned(0);
    setResults([]);
  }, [verses, clearAdvanceTimer]);

  const startQuiz = useCallback(() => {
    const nextQuestions = generateQuestions();
    if (nextQuestions.length === 0) return;
    clearAdvanceTimer();
    setQuestions(nextQuestions);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setCombo(1);
    setTimeLeft(TIME_LIMIT);
    setTotalXpEarned(0);
    setResults([]);
    setPhase('playing');
  }, [generateQuestions, clearAdvanceTimer]);

  const currentQ = questions[currentIdx];

  // Totals are passed in explicitly: state set in the same tick as this call
  // has not been committed yet, so reading `score` here would miss the last answer.
  const advance = useCallback(
    (finalScore: number, finalXp: number) => {
      clearAdvanceTimer();
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        if (currentIdx + 1 >= questions.length) {
          setPhase('finished');
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
    [clearAdvanceTimer, currentIdx, onFinishQuiz, questions.length, soundEnabled]
  );

  const handleTimeOut = useCallback(() => {
    playSound.incorrect(soundEnabled);
    setSelectedAnswer('__TIMEOUT__');
    setCombo(1);
    setResults((r) => [...r, false]);
    advance(score, totalXpEarned);
  }, [advance, score, soundEnabled, totalXpEarned]);

  useEffect(() => {
    if (phase !== 'playing' || selectedAnswer !== null) return;
    if (timeLeft <= 0) {
      handleTimeOut();
      return;
    }
    const timer = window.setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase, timeLeft, selectedAnswer, handleTimeOut]);

  const handleAnswer = (option: string) => {
    if (phase !== 'playing' || selectedAnswer !== null || !currentQ) return;
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
        {t('trivia.needVerses')}
      </div>
    );
  }

  if (phase === 'ready') {
    const roundSize = Math.min(QUESTION_COUNT, verses.length);
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
        <section className="card animate-rise flex flex-col items-center gap-5 p-6 text-center sm:p-8">
          <span className="animate-pop grid h-20 w-20 place-items-center rounded-full bg-brand text-[var(--on-brand)] shadow-[0_5px_0_var(--brand-edge)]">
            <Zap className="h-10 w-10" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">{t('trivia.readyTitle')}</h2>
            <p className="mt-1.5 max-w-sm text-ink-2">{t('trivia.readyBody')}</p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-ink-3">{t('trivia.questionsLabel')}</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums">{roundSize}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-ink-3">{t('trivia.perQuestionLabel')}</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums">
                {t('trivia.secondsShort', { n: TIME_LIMIT })}
              </dd>
            </div>
          </dl>
          <button type="button" onClick={startQuiz} className="btn btn-primary w-full">
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            {t('trivia.start')}
          </button>
        </section>
      </div>
    );
  }

  const isGameOver = phase === 'finished';

  if (!currentQ && !isGameOver) {
    return <div className="py-20 text-center text-ink-3">{t('trivia.preparing')}</div>;
  }

  const correctCount = results.filter(Boolean).length;
  const timeLow = timeLeft <= 4;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      {/* Status strip */}
      <div className="flex items-center gap-3">
        <ol className="flex flex-1 gap-1.5" aria-label={t('trivia.questionOf', { n: Math.min(currentIdx + 1, questions.length), total: questions.length })}>
          {questions.map((_, i) => {
            const r = results[i];
            const cls =
              r === true ? 'bg-brand' : r === false ? 'bg-danger' : i === currentIdx && !isGameOver ? 'bg-brand/35' : 'bg-surface-3';
            return <li key={i} className={`h-2.5 flex-1 rounded-full transition-colors ${cls}`} />;
          })}
        </ol>
        <span
          className={`pill transition-colors ${combo > 1 ? 'bg-gold text-[oklch(0.28_0.06_70)]' : 'bg-surface-2 text-ink-2'}`}
          aria-label={t('trivia.combo', { x: combo.toFixed(1) })}
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
              {correctCount === questions.length ? t('trivia.perfect') : correctCount >= 3 ? t('trivia.great') : t('trivia.complete')}
            </h2>
            <p className="mt-1 text-ink-2">
              {t('trivia.correctOf', { correct: correctCount, total: questions.length })}
            </p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-ink-3">{t('trivia.score')}</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums">{score}</dd>
            </div>
            <div className="rounded-2xl bg-gold-soft p-4">
              <dt className="text-sm text-gold-ink">{t('trivia.xpEarned')}</dt>
              <dd className="font-display text-3xl font-extrabold text-gold-ink tabular-nums">+{totalXpEarned}</dd>
            </div>
          </dl>
          <button type="button" onClick={startQuiz} className="btn btn-primary w-full">
            <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
            {t('trivia.playAgain')}
          </button>
        </section>
      ) : (
        <>
          <article className="card p-5 sm:p-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold">
                {currentQ.type === 'match-ref'
                  ? t('trivia.whichVerse')
                  : // The reference is in the verse's language, which can differ from the interface's.
                    t('trivia.finish')
                      .split(/(\{reference\})/)
                      .map((piece, i) => (i % 2 ? <span key={i} lang={currentQ.lang}>{currentQ.verseReference}</span> : piece))}
              </h2>
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">{t('trivia.points', { n: score })}</span>
                <Ring value={(timeLeft / TIME_LIMIT) * 100} size={44} stroke={4} tone={timeLow ? 'danger' : 'brand'}>
                  <span
                    className={`font-display text-sm font-extrabold tabular-nums ${timeLow ? 'text-danger-ink' : ''}`}
                    role="timer"
                    aria-label={t('trivia.secondsLeft', { n: timeLeft })}
                  >
                    {timeLeft}
                  </span>
                </Ring>
              </div>
            </div>
            <p lang={currentQ.lang} className="font-scripture text-xl leading-relaxed sm:text-[1.375rem]">
              “{currentQ.quote}”
            </p>
          </article>

          <div className="flex flex-col gap-3" role="group" aria-label={t('trivia.answers')}>
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
                      letters[idx]
                    )}
                  </span>
                  <span
                    lang={currentQ.lang}
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
              {t('trivia.timeUp')}
            </p>
          )}
        </>
      )}
    </div>
  );
};
