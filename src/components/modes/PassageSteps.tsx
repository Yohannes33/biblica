import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useT } from '../../i18n';
import { useRevealOnShow } from '../../utils/useRevealOnShow';

interface PassageStepsProps {
  index: number; // 0-based verse being practised
  total: number;
  reference: string; // the current verse's citation, e.g. "John 3:17"
  lang: string; // the Bible's language, for the citation
}

/**
 * "Verse 2 of 5 · John 3:17" above a passage practised one verse at a time.
 * Takes focus when the reader moves to a new verse, so keyboard and screen
 * reader users land at the top of it rather than on the page body.
 */
export const PassageSteps: React.FC<PassageStepsProps> = ({ index, total, reference, lang }) => {
  const t = useT();
  const ref = useRef<HTMLParagraphElement>(null);
  // Compare with the last verse shown rather than skipping the first run:
  // Strict Mode runs a mount effect twice, and a fresh mount must not steal focus.
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    ref.current?.focus();
  }, [index]);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <p ref={ref} tabIndex={-1} className="min-w-0 rounded-md text-sm text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <span className="font-display font-extrabold text-ink-2">{t('passage.verseOf', { n: index + 1, total })}</span>
        {' · '}
        <span lang={lang} className="font-semibold text-ink-2">
          {reference}
        </span>
      </p>
      <ol className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={`h-2 rounded-full transition-all ${
              i < index ? 'w-2 bg-brand' : i === index ? 'w-5 bg-brand' : 'w-2 bg-surface-3'
            }`}
          />
        ))}
      </ol>
    </div>
  );
};

interface VerseDoneProps {
  index: number; // 0-based verse just finished
  total: number;
  onNext: () => void;
}

/** Shown between verses of a passage: the passage isn't done until the last one. */
export const VerseDone: React.FC<VerseDoneProps> = ({ index, total, onNext }) => {
  const t = useT();
  const panelRef = useRevealOnShow<HTMLElement>(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Enter or Space carries straight on to the next verse.
  useEffect(() => buttonRef.current?.focus({ preventScroll: true }), []);

  return (
    <section
      ref={panelRef}
      className="card animate-rise flex scroll-mb-[calc(var(--tabbar-h)+var(--safe-bottom)+1rem)] flex-col items-center gap-3 p-5 text-center"
      aria-live="polite"
    >
      <span className="animate-pop grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand-ink">
        <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-display text-xl font-extrabold tracking-tight">{t('passage.verseDone', { n: index + 1, total })}</h2>
        <p className="mt-1 text-sm text-ink-2">{t.count('passage.versesLeft', total - index - 1)}</p>
      </div>
      <button ref={buttonRef} type="button" onClick={onNext} className="btn btn-primary w-full sm:w-auto sm:min-w-56">
        {t('passage.nextVerse', { n: index + 2 })}
        <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </section>
  );
};

/**
 * Waiting for a passage's book to know where its verses begin and end. Says
 * nothing for the first moment, so a book that arrives quickly (from the
 * service worker's cache) shows no flash and announces nothing.
 */
export const PassageLoading: React.FC = () => {
  const t = useT();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 400);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      <p role="status" className={`card p-5 text-center text-ink-2 ${shown ? '' : 'invisible'}`}>
        {shown ? t('passage.loading') : ''}
      </p>
    </div>
  );
};
