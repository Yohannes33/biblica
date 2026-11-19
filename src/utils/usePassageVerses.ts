import { useEffect, useState } from 'react';
import type { Verse } from '../types/verse';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { isTranslation } from '../data/translations';
import { loadBook, peekBook } from '../lib/bible';

/** One verse of a practice item: its number, citation and words. */
export interface PassageVerse {
  num: number | null;
  reference: string;
  text: string;
}

export type PassageVerses = { loading: true } | { loading: false; verses: PassageVerse[] };

/** How long a passage waits for its book before it is practised whole. */
const SPLIT_TIMEOUT_MS = 3000;

const whole = (verse: Verse): PassageVerse[] => [{ num: null, reference: verse.reference, text: verse.text }];

/** "16-18" -> [16, 18]; anything else (a single verse, odd old data) -> null. */
function verseRange(verseNum: string): [number, number] | null {
  const m = verseNum.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  return end > start ? [start, end] : null;
}

/** The passage's book, or null when it can't be split at all. */
function passageBook(verse: Verse) {
  const book = BIBLE_BOOKS.find((b) => b.name === verse.book);
  return book && isTranslation(verse.translation) ? { translation: verse.translation, code: book.code } : null;
}

/**
 * Split a passage into its verses. A passage's text is the chapter's verses
 * joined with a space (lib/bible.ts getPassage, scripts/build-bible.ts), and
 * nothing in the text marks where one verse ends, so the boundaries come from
 * the same static Bible file the text was taken from. The split is used only
 * when those verses, joined, give back exactly the stored text: a passage
 * typed by hand on an older build, an old translation id or text from an
 * earlier data version is practised whole, as before.
 */
function splitWith(verse: Verse, bookText: (string | null)[][]): PassageVerse[] {
  const [start, end] = verseRange(verse.verseNum)!;
  const texts = (bookText[verse.chapter - 1] ?? []).slice(start - 1, end);
  if (texts.length !== end - start + 1 || texts.some((t) => !t) || texts.join(' ') !== verse.text) return whole(verse);
  // "John 3:16-18" -> "John 3:17", in whichever language the reference is in.
  const citation = (n: number) => verse.reference.replace(/\d+\s*-\s*\d+\s*$/, String(n));
  return texts.map((text, i) => ({ num: start + i, reference: citation(start + i), text: text as string }));
}

// Splits already worked out, so a remount (switching tabs, coming back to
// an item) renders the verses straight away.
const splits = new Map<string, PassageVerse[]>();
const MAX_SPLITS = 50;
function remember(key: string, verses: PassageVerse[]) {
  splits.set(key, verses);
  while (splits.size > MAX_SPLITS) splits.delete(splits.keys().next().value!);
}

/** The split if it can be had without waiting: remembered, or its book already in memory. */
function splitNow(verse: Verse, key: string): PassageVerse[] | undefined {
  const known = splits.get(key);
  if (known) return known;
  const book = passageBook(verse);
  if (!book) return whole(verse);
  const text = peekBook(book.translation, book.code);
  if (!text) return undefined;
  const verses = splitWith(verse, text);
  remember(key, verses);
  return verses;
}

/**
 * The verses to step through in a practice mode. A single verse, a split
 * already worked out and a passage whose book is in memory are ready on the
 * first render. Otherwise the book is fetched (usually from the service
 * worker's cache); if it hasn't come within SPLIT_TIMEOUT_MS, or fails, the
 * passage is practised whole, as before, rather than switching under the
 * reader's fingers later. The split is still remembered for next time.
 */
export function usePassageVerses(verse: Verse): PassageVerses {
  const key = `${verse.id}|${verse.translation}|${verse.verseNum}|${verse.text}`;
  const isPassage = verseRange(verse.verseNum) !== null;
  const [result, setResult] = useState<{ key: string; verses: PassageVerse[] } | null>(null);
  const ready = isPassage ? splitNow(verse, key) : undefined;

  useEffect(() => {
    if (!isPassage || ready) return;
    const book = passageBook(verse);
    if (!book) return;
    let settled = false;
    const settle = (verses: PassageVerse[]) => {
      if (settled) return;
      settled = true;
      setResult({ key, verses });
    };
    const timer = window.setTimeout(() => settle(whole(verse)), SPLIT_TIMEOUT_MS);
    loadBook(book.translation, book.code).then(
      (text) => {
        const verses = splitWith(verse, text);
        remember(key, verses);
        settle(verses);
      },
      () => settle(whole(verse))
    );
    return () => {
      settled = true;
      window.clearTimeout(timer);
    };
    // key covers every field of `verse` that the split reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isPassage, !!ready]);

  if (!isPassage) return { loading: false, verses: whole(verse) };
  // A result already settled for this mount wins, so a late split never
  // replaces the whole passage the reader is already practising.
  if (result?.key === key) return { loading: false, verses: result.verses };
  if (ready) return { loading: false, verses: ready };
  return { loading: true };
}
