import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft } from 'lucide-react';
import { TRANSLATIONS, translationInfo, type Translation } from '../data/translations';
import { curatedVerses } from '../data/initialVerses';
import { BibleBrowser, type PickedPassage } from './BibleBrowser';

export type FirstVerse = { kind: 'builtIn'; id: string } | { kind: 'passage'; passage: PickedPassage };

interface OnboardingProps {
  initialTranslation: Translation;
  onFinish: (translation: Translation, first: FirstVerse) => void;
  /** Offered when cloud sync is set up, for people who already use Biblica elsewhere. */
  onSignIn?: (translation: Translation) => void;
}

/** First run: choose a Bible, then the first verse to memorise. */
export const Onboarding: React.FC<OnboardingProps> = ({ initialTranslation, onFinish, onSignIn }) => {
  const [step, setStep] = useState<'bible' | 'verse'>('bible');
  const [translation, setTranslation] = useState<Translation>(initialTranslation);
  const [source, setSource] = useState<'popular' | 'bible'>('popular');

  // Each step starts at its top, with focus on its heading (the button that
  // was pressed is gone).
  const heading = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step); // not a mounted flag: StrictMode re-runs effects in dev
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const info = translationInfo(translation);

  // Popular verses this Bible actually has (the Amharic one lacks the Old Testament).
  const popular = useMemo(() => curatedVerses(translation).filter((v) => v.translation === translation), [translation]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main className="pt-safe mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-8">
        <header className="flex items-center gap-3 pt-6 pb-5">
          {step === 'verse' ? (
            <button
              type="button"
              className="icon-btn rounded-full"
              onClick={() => setStep('bible')}
              aria-label="Back to choosing a Bible"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
            </button>
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-on-brand" aria-hidden="true">
              <BookOpen className="h-6 w-6" strokeWidth={2.25} />
            </span>
          )}
          <p className="font-display text-sm font-extrabold text-ink-3">Step {step === 'bible' ? 1 : 2} of 2</p>
        </header>

        {step === 'bible' ? (
          <>
            <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight outline-none">Welcome to Biblica</h1>
            <p className="mt-2 text-lg text-ink-2">
              Memorise Scripture a few minutes a day. First, which Bible do you read?
            </p>

            <div className="mt-6 flex flex-col gap-3" role="group" aria-label="Bible">
              {TRANSLATIONS.map((t) => {
                const active = translation === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTranslation(t.id)}
                    className={`flex items-center gap-4 rounded-2xl p-4 text-left transition-colors ${
                      active ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface ring-1 ring-line hover:bg-surface-2'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span lang={t.language} className="font-display text-lg font-extrabold">
                          {t.label}
                        </span>
                        <span className="font-semibold text-ink-2">{t.name}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-3">{t.blurb}.</span>
                    </span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${active ? 'bg-brand text-on-brand' : 'ring-2 ring-line'}`}
                      aria-hidden="true"
                    >
                      {active && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <button type="button" className="btn btn-primary w-full" onClick={() => setStep('verse')}>
                <span>
                  Continue with <span lang={info.language}>{info.label}</span>
                </span>
              </button>
              {onSignIn && (
                <button type="button" className="btn btn-secondary w-full" onClick={() => onSignIn(translation)}>
                  I already use Biblica: sign in
                </button>
              )}
              <p className="text-center text-sm text-ink-3">You can change the Bible later in Settings.</p>
            </div>
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight outline-none">What will you memorise first?</h1>
            <p className="mt-2 text-lg text-ink-2">
              Start with a well-loved verse, or open the Bible and pick any passage.
            </p>

            <div className="segmented mt-6" role="group" aria-label="Where to pick from">
              <button type="button" aria-pressed={source === 'popular'} onClick={() => setSource('popular')}>
                Popular verses
              </button>
              <button type="button" aria-pressed={source === 'bible'} onClick={() => setSource('bible')}>
                Whole Bible
              </button>
            </div>

            <div className="mt-5">
              {source === 'popular' ? (
                <ul className="group-list">
                  {popular.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => onFinish(translation, { kind: 'builtIn', id: v.id })}
                        className="flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span lang={info.language} className="font-display text-[1.0625rem] font-extrabold">
                            {v.reference}
                          </span>
                          <span className="text-sm text-ink-3">{v.category}</span>
                        </span>
                        <span lang={info.language} className="line-clamp-2 font-scripture leading-relaxed text-ink-2">
                          {v.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <BibleBrowser
                  key={translation}
                  translation={translation}
                  pickLabel="Start with"
                  onPick={(passage) => onFinish(translation, { kind: 'passage', passage })}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
