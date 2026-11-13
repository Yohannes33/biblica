import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, RotateCcw, ArrowRight, Check, Award, Square } from 'lucide-react';
import type { Verse, VerseProgress } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { analyzeVerseTokens, getBlankIndicesForLevel, STOP_WORDS } from '../../utils/difficulty';
import { useSpeech } from '../../utils/useSpeech';
import { ProgressBar } from '../ui/Progress';
import { useRevealOnShow } from '../../utils/useRevealOnShow';

interface FillBlankModeProps {
  verse: Verse;
  progress?: VerseProgress;
  soundEnabled: boolean;
  onCorrect: (xp: number) => void;
  onNextVerse: () => void;
}

type DifficultyLevel = 1 | 2 | 3 | 4;

const STAGES: { lvl: DifficultyLevel; label: string; hint: string }[] = [
  { lvl: 1, label: 'Key words', hint: 'A few key words hidden' },
  { lvl: 2, label: 'Half', hint: 'Half the words hidden' },
  { lvl: 3, label: 'Most', hint: 'Most words hidden' },
  { lvl: 4, label: 'All', hint: 'Recite every word' },
];

const stageXp = (level: DifficultyLevel) => (level === 4 ? 60 : level * 15);

export const FillBlankMode: React.FC<FillBlankModeProps> = ({ verse, soundEnabled, onCorrect, onNextVerse }) => {
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [currentBlankIdx, setCurrentBlankIdx] = useState<number>(0);
  const [filledWords, setFilledWords] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const speech = useSpeech();
  const completeRef = useRevealOnShow<HTMLElement>(isCompleted);

  const analyzedTokens = useMemo(() => analyzeVerseTokens(verse.text), [verse.text]);
  const blankIndices = useMemo(() => getBlankIndicesForLevel(analyzedTokens, level), [analyzedTokens, level]);

  useEffect(() => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  }, [verse.id, level]);

  const { stop: stopSpeech } = speech;
  useEffect(() => stopSpeech(), [verse.id, stopSpeech]);

  const activeTokenIndex = blankIndices[currentBlankIdx];
  const targetToken = activeTokenIndex !== undefined ? analyzedTokens[activeTokenIndex] : null;
  const targetWord = targetToken ? targetToken.cleanWord : '';

  const options = useMemo(() => {
    if (!targetWord) return [];

    const isTargetStopWord = STOP_WORDS.has(targetWord.toLowerCase());

    const otherWords = analyzedTokens
      .filter((t) => t.cleanWord.toLowerCase() !== targetWord.toLowerCase())
      .filter((t) => (isTargetStopWord ? t.isStopWord : !t.isStopWord))
      .map((t) => t.cleanWord);

    const theologicalDistractors = [
      'everlasting', 'righteousness', 'salvation', 'strengtheneth',
      'understanding', 'supplication', 'commanded', 'courage', 'shepherd',
      'believeth', 'pastures', 'mercies', 'redeemed', 'covenant', 'glory',
    ];

    const fillerDistractors = ['that', 'with', 'unto', 'from', 'shall', 'which', 'upon', 'into'];
    const chosenPool = isTargetStopWord ? fillerDistractors : theologicalDistractors;

    const uniqueSet = new Set<string>();
    uniqueSet.add(targetWord);

    const candidates = [...otherWords, ...chosenPool].sort(() => Math.random() - 0.5);
    for (const word of candidates) {
      if (uniqueSet.size >= 4) break;
      if (word.toLowerCase() !== targetWord.toLowerCase()) {
        uniqueSet.add(word);
      }
    }

    return Array.from(uniqueSet).sort(() => Math.random() - 0.5);
  }, [targetWord, analyzedTokens]);

  const handleSelectWord = (word: string) => {
    if (isCompleted || activeTokenIndex === undefined) return;

    if (word.toLowerCase() === targetWord.toLowerCase()) {
      playSound.correct(soundEnabled);
      setFilledWords((prev) => ({ ...prev, [activeTokenIndex]: targetWord }));
      setWrongWord(null);

      const nextBlankIdx = currentBlankIdx + 1;
      if (nextBlankIdx >= blankIndices.length) {
        setIsCompleted(true);
        playSound.celebrate(soundEnabled);
        fireCelebrationConfetti();
        onCorrect(stageXp(level));
      } else {
        setCurrentBlankIdx(nextBlankIdx);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setWrongWord(word);
      setTimeout(() => setWrongWord(null), 600);
    }
  };

  const handleReset = () => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  };

  const filledCount = Object.keys(filledWords).length;
  const stage = STAGES[level - 1];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      {/* Stage picker */}
      <section aria-label="Difficulty stage">
        <div className="segmented" role="group" aria-label="Stage">
          {STAGES.map((st) => (
            <button
              key={st.lvl}
              type="button"
              aria-pressed={level === st.lvl}
              onClick={() => setLevel(st.lvl)}
              className="flex items-center justify-center gap-1"
            >
              {level > st.lvl && <Check className="h-3.5 w-3.5 text-brand-ink" strokeWidth={3} aria-hidden="true" />}
              {st.label}
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-sm text-ink-3">
          <span className="font-display font-extrabold text-ink-2">Stage {level} of 4</span> · {stage.hint}
        </p>
      </section>

      {/* The verse */}
      <article className="card p-5 sm:p-7" aria-label={`${verse.reference}, fill in the blanks`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <ProgressBar
            value={blankIndices.length ? (filledCount / blankIndices.length) * 100 : 0}
            label="Blanks filled"
            className="flex-1"
          />
          <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">
            {filledCount}/{blankIndices.length}
          </span>
          <div className="flex items-center gap-1.5">
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.toggle(verse.text)}
                className="icon-btn"
                aria-pressed={speech.isSpeaking}
                aria-label={speech.isSpeaking ? 'Stop reading' : 'Read verse aloud'}
                title={speech.isSpeaking ? 'Stop reading' : 'Read verse aloud'}
              >
                {speech.isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <button type="button" onClick={handleReset} className="icon-btn" aria-label="Restart stage" title="Restart stage">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="font-scripture text-[1.375rem] leading-[2.1] text-ink sm:text-2xl sm:leading-[2.1]">
          {analyzedTokens.map((token, idx) => {
            const isBlank = blankIndices.includes(idx);
            const isCurrent = idx === activeTokenIndex && !isCompleted;
            const isFilled = filledWords[idx] !== undefined;
            const sep = idx < analyzedTokens.length - 1 ? ' ' : '';

            if (!isBlank) return <React.Fragment key={token.index}>{token.fullToken}{sep}</React.Fragment>;

            if (isFilled) {
              return (
                <React.Fragment key={token.index}>
                  <span className="animate-pop inline-block rounded-lg bg-brand-soft px-1.5 leading-normal font-semibold text-brand-ink">
                    {filledWords[idx]}
                  </span>
                  {token.punctuation}
                  {sep}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={token.index}>
                <span
                  className={`inline-block min-w-[3.25rem] rounded-lg px-1.5 text-center align-baseline leading-normal ${
                    isCurrent
                      ? 'animate-slot border-2 border-brand bg-brand-soft font-semibold text-brand-ink'
                      : 'border-2 border-dashed border-line-strong text-ink-3'
                  }`}
                >
                  <span className="sr-only">{isCurrent ? 'current blank' : 'blank'}</span>
                  <span aria-hidden="true">{'\u00a0'}</span>
                </span>
                {token.punctuation}
                {sep}
              </React.Fragment>
            );
          })}
        </p>
      </article>

      {(speech.error || speech.hint) && (
        <p role="status" className="animate-rise rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-2">
          {speech.error || speech.hint}
        </p>
      )}

      {/* Answer area */}
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
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {level === 4 ? 'Verse mastered!' : `Stage ${level} complete!`}
            </h2>
            <p className="mt-1 text-ink-2">
              {level === 4 ? 'You recited every word from memory.' : 'Ready to hide a few more words?'}
            </p>
            <p className="pill mt-3 bg-gold px-3 text-base text-[oklch(0.28_0.06_70)]">+{stageXp(level)} XP</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => (level < 4 ? setLevel((level + 1) as DifficultyLevel) : handleReset())}
              className="btn btn-primary flex-1"
            >
              {level < 4 ? 'Next stage' : 'Practice again'}
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button type="button" onClick={onNextVerse} className="btn btn-secondary flex-1">
              Next verse
            </button>
          </div>
        </section>
      ) : (
        <section aria-label="Word choices">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-extrabold text-ink-2">Pick the missing word</h2>
            <span className="pill bg-gold-soft text-gold-ink" title="Earned when you finish this stage">
              +{stageXp(level)} XP<span className="sr-only"> when you finish this stage</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, i) => (
              <button
                key={`${option}-${i}`}
                type="button"
                onClick={() => handleSelectWord(option)}
                className={`tile min-h-14 px-3 py-3 font-display text-lg font-bold ${
                  wrongWord === option ? 'tile-wrong animate-shake' : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
