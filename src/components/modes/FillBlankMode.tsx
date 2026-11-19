import React, { useState, useEffect, useMemo } from 'react';
import { Volume2, RotateCcw, ArrowRight, Check, Award, Square } from 'lucide-react';
import type { Verse, VerseProgress } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { analyzeVerseTokens, getBlankIndicesForLevel, STOP_WORDS } from '../../utils/difficulty';
import { useSpeech } from '../../utils/useSpeech';
import { ProgressBar } from '../ui/Progress';
import { useRevealOnShow } from '../../utils/useRevealOnShow';
import { languageOf } from '../../data/translations';
import { useT, type StringKey } from '../../i18n';
import { usePassageVerses, type PassageVerse } from '../../utils/usePassageVerses';
import { PassageLoading, PassageSteps, VerseDone } from './PassageSteps';

interface FillBlankModeProps {
  verse: Verse;
  progress?: VerseProgress;
  soundEnabled: boolean;
  onCorrect: (xp: number) => void;
  onNextVerse: () => void;
}

type DifficultyLevel = 1 | 2 | 3 | 4;

const STAGES: { lvl: DifficultyLevel; label: StringKey; hint: StringKey }[] = [
  { lvl: 1, label: 'fill.stage.1.label', hint: 'fill.stage.1.hint' },
  { lvl: 2, label: 'fill.stage.2.label', hint: 'fill.stage.2.hint' },
  { lvl: 3, label: 'fill.stage.3.label', hint: 'fill.stage.3.hint' },
  { lvl: 4, label: 'fill.stage.4.label', hint: 'fill.stage.4.hint' },
];

const stageXp = (level: DifficultyLevel) => (level === 4 ? 60 : level * 15);

export const FillBlankMode: React.FC<FillBlankModeProps> = (props) => {
  // The stage lives out here, above the loading state: a new translation
  // can send a passage back to loading, and must not lose the stage with it.
  const [level, setLevel] = useState<DifficultyLevel>(1);
  // Start every new verse back at Stage 1 (Key words), while preserving the
  // current stage if only the translation wording (`verse.text`) changes.
  useEffect(() => {
    setLevel(1);
  }, [props.verse.id]);

  const passage = usePassageVerses(props.verse);
  if (passage.loading) return <PassageLoading />;
  return <FillBlankPassage {...props} verses={passage.verses} level={level} setLevel={setLevel} />;
};

interface FillBlankPassageProps extends FillBlankModeProps {
  verses: PassageVerse[];
  level: DifficultyLevel;
  setLevel: (level: DifficultyLevel) => void;
}

/**
 * A passage of several verses is filled in one verse at a time: blanks and
 * word choices come from the current verse only. The stage holds for the
 * whole passage, and XP comes once, after its last verse.
 */
const FillBlankPassage: React.FC<FillBlankPassageProps> = ({
  verse,
  verses,
  level,
  setLevel,
  soundEnabled,
  onCorrect,
  onNextVerse,
}) => {
  // Which verse of the passage, tagged with the run it belongs to, so a new
  // stage or wording starts from the first verse in the same render.
  const [step, setStep] = useState({ run: '', idx: 0 });
  const [currentBlankIdx, setCurrentBlankIdx] = useState<number>(0);
  const [filledWords, setFilledWords] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const t = useT();
  const speech = useSpeech();
  const completeRef = useRevealOnShow<HTMLElement>(isCompleted);

  // Changes with the stage, and with the wording when the default translation does.
  const run = `${level}|${verses.map((v) => v.text).join('\n')}`;
  const verseIdx = step.run === run ? Math.min(step.idx, verses.length - 1) : 0;
  const isPassage = verses.length > 1;
  const current = verses[verseIdx];
  const text = current.text;
  const isLastVerse = verseIdx === verses.length - 1;

  const analyzedTokens = useMemo(() => analyzeVerseTokens(text), [text]);
  // The rest of the passage, a reserve of wrong choices for a short verse.
  // A string, not the array: `verses` is a new array on every render.
  const otherVersesText = verses.filter((_, i) => i !== verseIdx).map((v) => v.text).join(' ');
  const otherVerseTokens = useMemo(() => analyzeVerseTokens(otherVersesText), [otherVersesText]);
  const lang = languageOf(verse.translation);
  const blankIndices = useMemo(() => getBlankIndicesForLevel(analyzedTokens, level), [analyzedTokens, level]);

  useEffect(() => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  }, [verse.id, text, verseIdx, level]); // text changes when the default translation does

  const { stop: stopSpeech } = speech;
  useEffect(() => stopSpeech(), [verse.id, text, stopSpeech]);

  const activeTokenIndex = blankIndices[currentBlankIdx];
  const targetToken = activeTokenIndex !== undefined ? analyzedTokens[activeTokenIndex] : null;
  const targetWord = targetToken ? targetToken.cleanWord : '';

  const options = useMemo(() => {
    if (!targetWord) return [];

    const isTargetStopWord = STOP_WORDS.has(targetWord.toLowerCase());

    const sameKind = (tokens: typeof analyzedTokens) =>
      tokens
        .filter((t) => t.cleanWord.toLowerCase() !== targetWord.toLowerCase())
        .filter((t) => (isTargetStopWord ? t.isStopWord : !t.isStopWord))
        .map((t) => t.cleanWord);
    const otherWords = sameKind(analyzedTokens);
    const passageWords = sameKind(otherVerseTokens);

    const theologicalDistractors = [
      'everlasting', 'righteousness', 'salvation', 'strengtheneth',
      'understanding', 'supplication', 'commanded', 'courage', 'shepherd',
      'believeth', 'pastures', 'mercies', 'redeemed', 'covenant', 'glory',
    ];

    const fillerDistractors = ['that', 'with', 'unto', 'from', 'shall', 'which', 'upon', 'into'];
    // The fallback pools are English: an English word among Amharic choices gives the answer away.
    const chosenPool = lang !== 'en' ? [] : isTargetStopWord ? fillerDistractors : theologicalDistractors;

    const uniqueSet = new Set<string>();
    uniqueSet.add(targetWord);

    // The rest of the passage only tops up a verse too short to give three
    // wrong choices of its own (an Amharic verse: there's no fallback pool).
    const shuffle = (words: string[]) => [...words].sort(() => Math.random() - 0.5);
    const candidates = [...shuffle([...otherWords, ...chosenPool]), ...shuffle(passageWords)];
    for (const word of candidates) {
      if (uniqueSet.size >= 4) break;
      if (word.toLowerCase() !== targetWord.toLowerCase()) {
        uniqueSet.add(word);
      }
    }

    return Array.from(uniqueSet).sort(() => Math.random() - 0.5);
  }, [targetWord, analyzedTokens, otherVerseTokens, lang]);

  const handleSelectWord = (word: string) => {
    if (isCompleted || activeTokenIndex === undefined) return;

    if (word.toLowerCase() === targetWord.toLowerCase()) {
      playSound.correct(soundEnabled);
      setFilledWords((prev) => ({ ...prev, [activeTokenIndex]: targetWord }));
      setWrongWord(null);

      const nextBlankIdx = currentBlankIdx + 1;
      if (nextBlankIdx >= blankIndices.length) {
        setIsCompleted(true);
        if (isLastVerse) {
          playSound.celebrate(soundEnabled);
          fireCelebrationConfetti();
          onCorrect(stageXp(level));
        }
      } else {
        setCurrentBlankIdx(nextBlankIdx);
      }
    } else {
      playSound.incorrect(soundEnabled);
      setWrongWord(word);
      setTimeout(() => setWrongWord(null), 600);
    }
  };

  const clearBlanks = () => {
    setCurrentBlankIdx(0);
    setFilledWords({});
    setIsCompleted(false);
    setWrongWord(null);
  };

  // Restart and Practice again go back to the passage's first verse.
  const handleReset = () => {
    setStep({ run, idx: 0 });
    clearBlanks();
  };

  // Cleared here as well as in the effect, so the finished verse's panel
  // never shows for a frame over the next verse.
  const goToVerse = (idx: number) => {
    setStep({ run, idx });
    clearBlanks();
  };

  const changeLevel = (next: DifficultyLevel) => {
    setLevel(next);
    clearBlanks();
  };

  const filledCount = Object.keys(filledWords).length;
  const stage = STAGES[level - 1];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      {/* Stage picker */}
      <section aria-label={t('fill.stagePicker')}>
        <div className="segmented" role="group" aria-label={t('fill.stageGroup')}>
          {STAGES.map((st) => (
            <button
              key={st.lvl}
              type="button"
              aria-pressed={level === st.lvl}
              onClick={() => changeLevel(st.lvl)}
              className="flex items-center justify-center gap-1"
            >
              {level > st.lvl && <Check className="h-3.5 w-3.5 text-brand-ink" strokeWidth={3} aria-hidden="true" />}
              {t(st.label)}
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-sm text-ink-3">
          <span className="font-display font-extrabold text-ink-2">{t('fill.stageOf', { level })}</span> · {t(stage.hint)}
        </p>
      </section>

      {/* The verse */}
      <article className="card p-5 sm:p-7" aria-label={t('fill.verseLabel', { reference: current.reference })}>
        {isPassage && <PassageSteps index={verseIdx} total={verses.length} reference={current.reference} lang={lang} />}
        <div className="mb-4 flex items-center justify-between gap-3">
          <ProgressBar
            value={blankIndices.length ? (filledCount / blankIndices.length) * 100 : 0}
            label={t('fill.blanksFilled')}
            className="flex-1"
          />
          <span className="font-display text-sm font-extrabold text-ink-3 tabular-nums">
            {filledCount}/{blankIndices.length}
          </span>
          <div className="flex items-center gap-1.5">
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.toggle(text, lang)}
                className="icon-btn"
                aria-pressed={speech.isSpeaking}
                aria-label={speech.isSpeaking ? t('speech.stop') : t('speech.readAloud')}
                title={speech.isSpeaking ? t('speech.stop') : t('speech.readAloud')}
              >
                {speech.isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <button type="button" onClick={handleReset} className="icon-btn" aria-label={t('fill.restart')} title={t('fill.restart')}>
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p lang={lang} className="font-scripture text-[1.375rem] leading-[2.1] text-ink sm:text-2xl sm:leading-[2.1]">
          {analyzedTokens.map((token, idx) => {
            const isBlank = blankIndices.includes(idx);
            const isCurrent = idx === activeTokenIndex && !isCompleted;
            const isFilled = filledWords[idx] !== undefined;
            const sep = idx < analyzedTokens.length - 1 ? ' ' : '';

            if (!isBlank) return <React.Fragment key={token.index}>{token.fullToken}{sep}</React.Fragment>;

            if (isFilled) {
              return (
                <React.Fragment key={token.index}>
                  {token.lead}
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
                {token.lead}
                <span
                  className={`inline-block min-w-[3.25rem] rounded-lg px-1.5 text-center align-baseline leading-normal ${
                    isCurrent
                      ? 'animate-slot border-2 border-brand bg-brand-soft font-semibold text-brand-ink'
                      : 'border-2 border-dashed border-line-strong text-ink-3'
                  }`}
                >
                  <span className="sr-only">{isCurrent ? t('fill.currentBlank') : t('fill.blank')}</span>
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
      {isCompleted && !isLastVerse ? (
        <VerseDone key={verseIdx} index={verseIdx} total={verses.length} onNext={() => goToVerse(verseIdx + 1)} />
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
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              {level === 4 ? t('fill.mastered') : t('fill.stageComplete', { level })}
            </h2>
            <p className="mt-1 text-ink-2">
              {level === 4 ? t('fill.masteredBody') : t('fill.stageCompleteBody')}
            </p>
            <p className="pill mt-3 bg-gold px-3 text-base text-[oklch(0.28_0.06_70)]">{t('fill.xp', { n: stageXp(level) })}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => (level < 4 ? changeLevel((level + 1) as DifficultyLevel) : handleReset())}
              className="btn btn-primary flex-1"
            >
              {level < 4 ? t('fill.nextStage') : t('fill.practiceAgain')}
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button type="button" onClick={onNextVerse} className="btn btn-secondary flex-1">
              {t('fill.nextVerse')}
            </button>
          </div>
        </section>
      ) : (
        <section aria-label={t('fill.wordChoices')}>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-extrabold text-ink-2">{t('fill.pickMissing')}</h2>
            <span className="pill bg-gold-soft text-gold-ink" title={t('fill.xpTitle')}>
              {t('fill.xp', { n: stageXp(level) })}<span className="sr-only">{t('fill.xpWhen')}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, i) => (
              <button
                key={`${option}-${i}`}
                type="button"
                lang={lang}
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
