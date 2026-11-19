import { useEffect, useState } from 'react';
import type { Verse } from '../types/verse';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { isTranslation } from '../data/translations';
import { loadBook } from '../lib/bible';

/** One verse of a practice item: its number, citation and words. */
export interface PassageVerse {
  num: number | null;
  reference: string;
  text: string;
}

export type PassageVerses = { loading: true } | { loading: false; verses: PassageVerse[] };

const whole = (verse: Verse): PassageVerse[] => [{ num: null, reference: verse.reference, text: verse.text }];

/** "16-18" -> [16, 18]; anything else (a single verse, odd old data) -> null. */
function verseRange(verseNum: string): [number, number] | null {
  const m = verseNum.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  return end > start ? [start, end] : null;
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
async function splitPassage(verse: Verse): Promise<PassageVerse[]> {
  const range = verseRange(verse.verseNum);
  const book = BIBLE_BOOKS.find((b) => b.name === verse.book);
  if (!range || !book || !isTranslation(verse.translation)) return whole(verse);
  const [start, end] = range;
  const chapter = (await loadBook(verse.translation, book.code))[verse.chapter - 1] ?? [];
  const texts = chapter.slice(start - 1, end);
  if (texts.length !== end - start + 1 || texts.some((t) => !t) || texts.join(' ') !== verse.text) return whole(verse);
  // "John 3:16-18" -> "John 3:17", in whichever language the reference is in.
  const citation = (n: number) => verse.reference.replace(/\d+\s*-\s*\d+\s*$/, String(n));
  return texts.map((text, i) => ({ num: start + i, reference: citation(start + i), text: text as string }));
}

/**
 * The verses to step through in a practice mode. A single verse is ready at
 * once; a passage waits for its book, which is usually already cached because
 * the reader picked the passage from it. If the book can't be loaded (offline,
 * first visit) the passage is practised whole, as before.
 */
export function usePassageVerses(verse: Verse): PassageVerses {
  const key = `${verse.id}|${verse.translation}|${verse.verseNum}|${verse.text}`;
  const isPassage = verseRange(verse.verseNum) !== null;
  const [result, setResult] = useState<{ key: string; verses: PassageVerse[] } | null>(null);

  useEffect(() => {
    if (!isPassage) return;
    let cancelled = false;
    splitPassage(verse).then(
      (verses) => !cancelled && setResult({ key, verses }),
      () => !cancelled && setResult({ key, verses: whole(verse) })
    );
    return () => {
      cancelled = true;
    };
    // key covers every field of `verse` that splitPassage reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isPassage]);

  if (!isPassage) return { loading: false, verses: whole(verse) };
  // Never hand back another item's verses while this one loads.
  if (result?.key !== key) return { loading: true };
  return { loading: false, verses: result.verses };
}
