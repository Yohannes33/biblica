import { BIBLE_BOOKS, referenceBookName, type BibleBook } from '../data/bibleBooks';
import { BIBLE_DATA_VERSION, type Translation } from '../data/translations';

// The whole Bible ships as static JSON, one file per book per translation
// (built by scripts/build-bible.ts). Files are immutable for a given
// BIBLE_DATA_VERSION: the CDN and the service worker cache them for good,
// so a book downloads once and then works offline.

type BookText = string[][]; // [chapter - 1][verse - 1]; "" = verse absent in this translation

/** Longest passage the add form accepts: longer ones don't fit the games. */
export const MAX_PASSAGE_VERSES = 10;

export interface PassageRef {
  book: BibleBook;
  chapter: number;
  start: number;
  end: number;
}

export type ParseResult = { ok: true; ref: PassageRef } | { ok: false; error: string };

const bookKey = (s: string) => s.toLowerCase().replace(/[\s.]/g, '');

const BOOK_LOOKUP = new Map<string, BibleBook>();
for (const book of BIBLE_BOOKS) {
  BOOK_LOOKUP.set(bookKey(book.name), book);
  for (const alias of book.aliases) BOOK_LOOKUP.set(alias, book);
}

export function findBook(input: string): BibleBook | null {
  const key = bookKey(input);
  if (!key) return null;
  const exact = BOOK_LOOKUP.get(key);
  if (exact) return exact;
  // A prefix of a name or alias also works when it fits one book: "gene", "i cor".
  const matches = new Set<BibleBook>();
  for (const [name, book] of BOOK_LOOKUP) if (name.startsWith(key)) matches.add(book);
  return matches.size === 1 ? [...matches][0] : null;
}

/** Parse "Romans 12:1-2", "rom 12 2", "1 Jn 4:19", "Psalm 23:1–3", "Jude 3". */
export function parseReference(input: string): ParseResult {
  const text = input.trim().replace(/[‐-―]/g, '-');
  // book, number, optional -number, then optional :verse and -verse
  const m = text.match(
    /^([1-3]?\s*[a-z][a-z\s.]*?)\s*(\d+)(?:\s*-\s*(\d+))?(?:\s*[:.\s]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/i
  );
  if (!m) return { ok: false, error: 'Type a book, chapter and verse, like Romans 12:2.' };

  const book = findBook(m[1]);
  if (!book) return { ok: false, error: `No book called “${m[1].trim()}”.` };
  const range = 'Pick verses from one chapter, like Romans 12:1-2.';

  let chapter: number;
  let start: number;
  let end: number;
  if (m[4]) {
    if (m[3]) return { ok: false, error: range };
    chapter = Number(m[2]);
    start = Number(m[4]);
    end = m[5] ? Number(m[5]) : start;
  } else if (book.chapters === 1) {
    // One-chapter books are cited by verse alone: "Jude 3", "3 John 4".
    chapter = 1;
    start = Number(m[2]);
    end = m[3] ? Number(m[3]) : start;
  } else {
    if (m[3]) return { ok: false, error: range };
    chapter = Number(m[2]);
    if (chapter < 1 || chapter > book.chapters) return { ok: false, error: `${book.name} has ${book.chapters} chapters.` };
    return { ok: false, error: `Add a verse number, like ${referenceBookName(book)} ${chapter}:1.` };
  }
  if (chapter < 1 || chapter > book.chapters) {
    return {
      ok: false,
      error: book.chapters === 1 ? `${book.name} has one chapter.` : `${book.name} has ${book.chapters} chapters.`,
    };
  }
  if (start < 1) return { ok: false, error: 'Verses start at 1.' };
  if (end < start) return { ok: false, error: 'The verse range runs backwards.' };
  if (end - start + 1 > MAX_PASSAGE_VERSES) {
    return { ok: false, error: `Pick ${MAX_PASSAGE_VERSES} verses or fewer so it fits a round.` };
  }
  return { ok: true, ref: { book, chapter, start, end } };
}

export function formatReference({ book, chapter, start, end }: PassageRef): string {
  return `${referenceBookName(book)} ${chapter}:${start}${end > start ? `-${end}` : ''}`;
}

export class BibleLoadError extends Error {}

// Recently used books, newest last. A book is 10-250 KB of text, so a
// handful in memory is plenty; the service worker keeps the rest on disk.
const MAX_CACHED_BOOKS = 8;
const books = new Map<string, Promise<BookText>>();

export function loadBook(translation: Translation, code: string): Promise<BookText> {
  const key = `${translation}/${code}`;
  const cached = books.get(key);
  if (cached) {
    books.delete(key);
    books.set(key, cached);
    return cached;
  }
  const url = `${import.meta.env.BASE_URL}bible/${BIBLE_DATA_VERSION}/${key}.json`;
  const request = fetch(url)
    .then((res) => {
      if (!res.ok) throw new BibleLoadError(`HTTP ${res.status}`);
      return res.json() as Promise<BookText>;
    })
    .catch((err) => {
      // Don't keep a failure: the next attempt (back online) should refetch.
      books.delete(key);
      throw err instanceof BibleLoadError ? err : new BibleLoadError(String(err));
    });
  books.set(key, request);
  while (books.size > MAX_CACHED_BOOKS) books.delete(books.keys().next().value!);
  return request;
}

export type PassageResult = { ok: true; text: string } | { ok: false; error: string };

/** Look up a passage's text. Rejects with BibleLoadError when the book can't be downloaded. */
export async function getPassage(translation: Translation, ref: PassageRef): Promise<PassageResult> {
  const book = await loadBook(translation, ref.book.code);
  const verses = book[ref.chapter - 1] ?? [];
  // Trailing "" entries are verses this translation leaves out, not the chapter's length.
  let count = verses.length;
  while (count > 0 && !verses[count - 1]) count--;
  if (ref.end > count) {
    return { ok: false, error: `${referenceBookName(ref.book)} ${ref.chapter} has ${count} verses.` };
  }
  const parts = verses.slice(ref.start - 1, ref.end);
  const absent = parts.findIndex((v) => !v);
  if (absent !== -1) {
    return {
      ok: false,
      error: `The ${translation} leaves out verse ${ref.start + absent}: it isn’t in the oldest manuscripts.`,
    };
  }
  return { ok: true, text: parts.join(' ') };
}
