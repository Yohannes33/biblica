import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft } from 'lucide-react';
import { TRANSLATIONS, languageOf, translationInfo, type Translation } from '../data/translations';
import { curatedVerses } from '../data/initialVerses';
import { BibleBrowser, type PickedPassage } from './BibleBrowser';
import { LanguageProvider, appLanguageOf, translate, translateCategory, type AppLanguage, type StringKey, type Vars } from '../i18n';

export type FirstVerse = { kind: 'builtIn'; id: string } | { kind: 'passage'; passage: PickedPassage };

interface OnboardingProps {
  initialTranslation: Translation;
  /** The reader's App language setting; "match" (the default) follows the Bible picked here. */
  appLanguage?: AppLanguage;
  onFinish: (translation: Translation, first: FirstVerse) => void;
  /** Offered when cloud sync is set up, for people who already use Biblica elsewhere. */
  onSignIn?: (translation: Translation) => void;
}

/** First run: choose a Bible, then the first verse to memorise. */
export const Onboarding: React.FC<OnboardingProps> = ({ initialTranslation, appLanguage, onFinish, onSignIn }) => {
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
  // This renders before the app's LanguageProvider, and should switch language
  // the moment a Bible is picked (unless the App language is set), so it
  // provides its own.
  const lang = appLanguageOf(appLanguage, languageOf(translation));
  const t = (key: StringKey, vars?: Vars) => translate(lang, key, vars);

  // Popular verses this Bible actually has (the Amharic copy lost some verses).
  const popular = useMemo(() => curatedVerses(translation).filter((v) => v.translation === translation), [translation]);

  return (
    <LanguageProvider value={lang}>
    <div lang={lang} className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main className="pt-safe mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-8">
        <header className="flex items-center gap-3 pt-6 pb-5">
          {step === 'verse' ? (
            <button
              type="button"
              className="icon-btn rounded-full"
              onClick={() => setStep('bible')}
              aria-label={t('onboarding.backToBible')}
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
            </button>
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-on-brand" aria-hidden="true">
              <BookOpen className="h-6 w-6" strokeWidth={2.25} />
            </span>
          )}
          <p className="font-display text-sm font-extrabold text-ink-3">{t('onboarding.step', { n: step === 'bible' ? 1 : 2, total: 2 })}</p>
        </header>

        {step === 'bible' ? (
          <>
            <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight outline-none">{t('onboarding.welcome')}</h1>
            <p className="mt-2 text-lg text-ink-2">
              {t('onboarding.intro')}
            </p>

            <div className="mt-6 flex flex-col gap-3" role="group" aria-label={t('onboarding.bibleGroup')}>
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
                        <span lang={t.id === 'AMH' ? lang : 'en'} className="font-semibold text-ink-2">
                          {t.id === 'AMH' ? translate(lang, 'translation.AMH.name') : t.name}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-3">{translate(lang, 'onboarding.blurb', { blurb: translate(lang, `translation.${t.id}.blurb`) })}</span>
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
                  {t('onboarding.continueWithBefore')}<span lang={info.language}>{info.label}</span>{t('onboarding.continueWithAfter')}
                </span>
              </button>
              {onSignIn && (
                <button type="button" className="btn btn-secondary w-full" onClick={() => onSignIn(translation)}>
                  {t('onboarding.signIn')}
                </button>
              )}
              <p className="text-center text-sm text-ink-3">{t('onboarding.changeLater')}</p>
            </div>
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold tracking-tight outline-none">{t('onboarding.firstVerse')}</h1>
            <p className="mt-2 text-lg text-ink-2">
              {t('onboarding.firstVerseIntro')}
            </p>

            <div className="segmented mt-6" role="group" aria-label={t('onboarding.source')}>
              <button type="button" aria-pressed={source === 'popular'} onClick={() => setSource('popular')}>
                {t('onboarding.popular')}
              </button>
              <button type="button" aria-pressed={source === 'bible'} onClick={() => setSource('bible')}>
                {t('onboarding.wholeBible')}
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
                          <span className="text-sm text-ink-3">{translateCategory(lang, v.category)}</span>
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
                  pickLabel={t('onboarding.pickLabel')}
                  onPick={(passage) => onFinish(translation, { kind: 'passage', passage })}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
    </LanguageProvider>
  );
};
