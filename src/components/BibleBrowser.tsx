import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Search } from 'lucide-react';
import { BIBLE_BOOKS, isNewTestament, referenceBookName, type BibleBook } from '../data/bibleBooks';
import { translationInfo, type Translation } from '../data/translations';
import { formatReference, loadBook, MAX_PASSAGE_VERSES, type PassageRef } from '../lib/bible';

export interface PickedPassage {
  ref: PassageRef;
  reference: string;
  text: string;
  translation: Translation;
}

interface BibleBrowserProps {
  translation: Translation;
  onPick: (passage: PickedPassage) => void;
  /** Label for the button that takes the selected verses, e.g. "Start memorising". */
  pickLabel: string;
  /** True when the reader already has this reference, so the button can say so. */
  hasReference?: (reference: string) => boolean;
}

type Chapter = (string | null)[];
type Load = { key: string; verses?: Chapter; failed?: boolean };

/**
 * Read the whole Bible: book, then chapter, then tap a verse (and optionally a
 * later one, for a passage of up to MAX_PASSAGE_VERSES) to pick it.
 */
export const BibleBrowser: React.FC<BibleBrowserProps> = ({ translation, onPick, pickLabel, hasReference }) => {
  const info = translationInfo(translation);
  const lang = info.language;
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState(1);
  const [filter, setFilter] = useState('');
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  // The book list, a book's chapter grid, or one chapter's verses.
  const [view, setView] = useState<'books' | 'chapters' | 'verses'>('books');

  // Why a tap didn't extend the selection, shown until the next tap.
  const [note, setNote] = useState('');

  // A new view replaces a long one (150 psalms, a 70-verse chapter): if the
  // reader had scrolled past its top, bring the top back into view. The
  // button they pressed is gone, so move focus to the new view's heading.
  const top = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Compare with the last place shown, not a "mounted" flag: StrictMode
  // re-runs effects in development, which would steal focus on first render.
  const shown = useRef({ view, book, chapter });
  useEffect(() => {
    const last = shown.current;
    if (last.view === view && last.book === book && last.chapter === chapter) return;
    shown.current = { view, book, chapter };
    const el = top.current;
    const scroller = el?.closest('.overflow-y-auto');
    const visibleTop = scroller ? scroller.getBoundingClientRect().top : 0;
    if (el && el.getBoundingClientRect().top < visibleTop) el.scrollIntoView({ block: 'start' });
    (headingRef.current ?? el)?.focus({ preventScroll: true });
  }, [view, book, chapter]);

  const loadKey = book && view === 'verses' ? `${translation}/${book.code}/${chapter}/${retry}` : '';
  useEffect(() => {
    if (!book || view !== 'verses') return;
    let cancelled = false;
    loadBook(translation, book.code).then(
      (text) => !cancelled && setLoad({ key: loadKey, verses: text[chapter - 1] ?? [] }),
      () => !cancelled && setLoad({ key: loadKey, failed: true }),
    );
    return () => {
      cancelled = true;
    };
    // loadKey covers book, chapter, translation and retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);
  const current = load?.key === loadKey ? load : null;

  const bookName = (b: BibleBook) => (lang === 'am' && b.am ? b.am.name : b.name);
  const available = (b: BibleBook) => !info.newTestamentOnly || isNewTestament(b);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const match = (b: BibleBook) =>
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.am ? b.am.name.includes(q) : false) ||
      b.aliases.some((a) => a.startsWith(q));
    const listed = BIBLE_BOOKS.filter((b) => available(b) && match(b));
    return [
      {
        title: 'Old Testament',
        books: listed.filter((b) => !isNewTestament(b)),
      },
      {
        title: 'New Testament',
        books: listed.filter((b) => isNewTestament(b)),
      },
    ].filter((g) => g.books.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, translation]);

  const openBook = (b: BibleBook) => {
    setBook(b);
    setChapter(1);
    setSelection(null);
    setNote('');
    setView(b.chapters === 1 ? 'verses' : 'chapters');
  };

  const openChapter = (n: number) => {
    setChapter(n);
    setSelection(null);
    setNote('');
    setView('verses');
  };

  // A verse can join a selection only if every verse between has text.
  const selectable = (verses: Chapter, n: number) => !!verses[n - 1];
  const tapVerse = (verses: Chapter, n: number) => {
    if (!selectable(verses, n)) return;
    setNote('');
    if (!selection) return setSelection({ start: n, end: n });
    if (selection.start === n && selection.end === n) return setSelection(null);
    if (n > selection.start) {
      const gap = verses.slice(selection.start - 1, n).findIndex((v) => !v);
      if (gap !== -1) {
        const missing = selection.start + gap;
        setNote(
          verses[missing - 1] === ''
            ? `The ${translation} leaves out verse ${missing}, so a passage can’t run across it. Started again at verse ${n}.`
            : `Verse ${missing} isn’t available, so a passage can’t run across it. Started again at verse ${n}.`
        );
      } else if (n - selection.start >= MAX_PASSAGE_VERSES) {
        setNote(`A passage can be up to ${MAX_PASSAGE_VERSES} verses. Started again at verse ${n}.`);
      } else {
        return setSelection({ start: selection.start, end: n });
      }
    }
    setSelection({ start: n, end: n });
  };

  if (view === 'books' || !book) {
    return (
      <div ref={top} tabIndex={-1} className="flex scroll-mt-4 flex-col gap-4 outline-none">
        <label className="relative block">
          <span className="sr-only">Find a book</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Find a book"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="field pl-11"
            autoComplete="off"
          />
        </label>
        {info.newTestamentOnly && (
          <p className="text-sm text-ink-3">Only the New Testament of the {info.name} is available so far.</p>
        )}
        {groups.length === 0 && <p className="py-6 text-center text-ink-3">No book matches “{filter.trim()}”.</p>}
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="section-label">{g.title}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {g.books.map((b) => (
                <li key={b.code}>
                  <button
                    type="button"
                    onClick={() => openBook(b)}
                    className="flex min-h-12 w-full items-center rounded-xl bg-surface px-3.5 text-left font-display font-extrabold ring-1 ring-line transition-colors hover:bg-surface-2"
                  >
                    <span lang={lang} className="truncate">
                      {bookName(b)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const back = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="btn btn-sm btn-secondary self-start !pl-2.5">
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      <span lang={label === 'Books' ? undefined : lang}>{label}</span>
    </button>
  );

  if (view === 'chapters') {
    return (
      <div ref={top} tabIndex={-1} className="flex scroll-mt-4 flex-col gap-4 outline-none">
        {back('Books', () => setView('books'))}
        <h3 ref={headingRef} tabIndex={-1} lang={lang} className="font-display text-xl font-extrabold outline-none">
          {bookName(book)}
        </h3>
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8" aria-label="Chapters">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => openChapter(n)}
                className="grid min-h-12 w-full place-items-center rounded-xl bg-surface font-display font-extrabold ring-1 ring-line transition-colors hover:bg-surface-2"
                aria-label={`Chapter ${n}`}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // "Psalm 23" for a chapter, "Psalms" for the book.
  const heading = book.chapters === 1 ? bookName(book) : `${referenceBookName(book, lang)} ${chapter}`;
  const verses = current?.verses;
  const ref = selection ? { book, chapter, start: selection.start, end: selection.end } : null;
  const reference = ref ? formatReference(ref, lang) : '';
  const already = !!reference && !!hasReference?.(reference);

  return (
    <div ref={top} tabIndex={-1} className="flex scroll-mt-4 flex-col gap-4 outline-none">
      {back(book.chapters === 1 ? 'Books' : bookName(book), () => setView(book.chapters === 1 ? 'books' : 'chapters'))}
      <h3 ref={headingRef} tabIndex={-1} lang={lang} className="font-display text-xl font-extrabold outline-none">
        {heading}
      </h3>

      {!current ? (
        <p className="text-ink-3" role="status">
          Loading <span lang={lang}>{heading}</span>…
        </p>
      ) : current.failed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="alert">
          <p className="font-semibold text-danger-ink">
            Couldn’t load <span lang={lang}>{bookName(book)}</span>. Check your connection.
          </p>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRetry((n) => n + 1)}>
            <RotateCw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-3">
            Tap a verse to memorise it. Tap a later one to take up to {MAX_PASSAGE_VERSES} in a row.
          </p>
          <ol className="group-list" aria-label={`Verses of ${book.name} ${chapter}`}>
            {verses!.map((text, i) => {
              const n = i + 1;
              // "" = this translation leaves the verse out (later manuscripts only).
              if (text === '') return null;
              const picked = !!selection && n >= selection.start && n <= selection.end;
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => tapVerse(verses!, n)}
                    disabled={text === null}
                    aria-pressed={picked}
                    className={`flex w-full gap-3 p-3.5 text-left transition-colors ${
                      picked ? 'bg-brand-soft' : text === null ? '' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span
                      className={`w-6 shrink-0 pt-0.5 text-right font-display text-sm font-extrabold ${picked ? 'text-brand-ink' : 'text-ink-3'}`}
                    >
                      {n}
                    </span>
                    {text === null ? (
                      <span className="text-sm text-ink-3 italic">
                        Not available yet: our digital copy lost this verse.
                      </span>
                    ) : (
                      <span lang={lang} className="font-scripture leading-relaxed text-ink">
                        {text}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {book.chapters > 1 && (
            <nav className="flex justify-between gap-2" aria-label="Chapters">
              {chapter > 1 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary !pl-2.5"
                  onClick={() => openChapter(chapter - 1)}
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  Chapter {chapter - 1}
                </button>
              ) : (
                <span />
              )}
              {chapter < book.chapters && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary !pr-2.5"
                  onClick={() => openChapter(chapter + 1)}
                >
                  Chapter {chapter + 1}
                  <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </nav>
          )}

          {ref && (
            // Sticky to the scroll box's edge, not its padding: inside a sheet that
            // padding (--scroll-pad-bottom) would leave verses showing under the bar.
            <div
              className="sticky -mx-5 border-t border-line bg-canvas px-5 pt-3"
              style={{
                bottom: 'calc(-1 * var(--scroll-pad-bottom, 0px))',
                // Overlap that padding at the end of the chapter too, so the bar
                // doesn't stop short of the edge with a gap below it.
                marginBottom: 'calc(-1 * var(--scroll-pad-bottom, 0px))',
                paddingBottom: 'calc(0.25rem + var(--scroll-pad-bottom, var(--safe-bottom)))',
              }}
            >
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() =>
                  onPick({
                    ref,
                    reference,
                    text: verses!.slice(ref.start - 1, ref.end).join(' '),
                    translation,
                  })
                }
              >
                <span>
                  {pickLabel}: <span lang={lang}>{reference}</span>
                </span>
              </button>
              {already && <p className="mt-2 text-center text-sm text-ink-3">Already in your library.</p>}
              {/* Always present, so screen readers announce the note when it appears. */}
              <p className={`text-center text-sm text-ink-2 ${note ? 'mt-2' : ''}`} role="status">
                {note}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
