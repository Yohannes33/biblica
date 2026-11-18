import { BIBLE_BOOKS, isNewTestament, referenceBookName, type BibleBook } from '../data/bibleBooks';
import { BIBLE_DATA_VERSION, translationInfo, type Translation } from '../data/translations';
import { translate, translateCount, type Lang } from '../i18n';

// The whole Bible ships as static JSON, one file per book per translation
// (built by scripts/build-bible.ts). Files are immutable for a given
// BIBLE_DATA_VERSION: the CDN and the service worker cache them for good,
// so a book downloads once and then works offline.

// [chapter - 1][verse - 1]. "" = the translation leaves the verse out;
// null = our digital copy lost the verse's text (see scripts/build-bible.ts).
type BookText = (string | null)[][];

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
  for (const name of book.am ? [book.am.name, ...book.am.aliases] : []) {
    BOOK_LOOKUP.set(bookKey(name), book);
    // "1ኛ ቆሮንቶስ" is also typed "1 ቆሮንቶስ".
    BOOK_LOOKUP.set(bookKey(name.replace(/^([1-3])ኛ/, '$1')), book);
  }
}

/** A book's name for interface text: the Amharic name when the interface is Amharic and the book has one. */
export function bookNameIn(book: BibleBook, lang: Lang = 'en'): string {
  return lang === 'am' && book.am ? book.am.name : book.name;
}

/** A translation's full name for interface text ("King James Version", "Amharic Bible (1962)"). */
export function translationNameIn(translation: Translation, lang: Lang = 'en'): string {
  return lang === 'am' && translation === 'AMH' ? translate(lang, 'translation.AMH.name') : translationInfo(translation).name;
}

/** A translation's short name for interface text: the id in English ("KJV"), the picker label in Amharic ("አማርኛ"). */
export function translationShortNameIn(translation: Translation, lang: Lang = 'en'): string {
  return lang === 'am' ? translationInfo(translation).label : translation;
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

/** Parse "Romans 12:1-2", "rom 12 2", "1 Jn 4:19", "Psalm 23:1–3", "Jude 3", "ዮሐንስ 3፡16". */
export function parseReference(input: string, lang: Lang = 'en'): ParseResult {
  const text = input.trim().replace(/[\u2010-\u2015]/g, '-');
  // book, number, optional -number, then optional :verse and -verse.
  // Amharic citations often use ፡ or ፥ where English uses a colon.
  const m = text.match(
    /^([1-3]?\s*\p{L}[\p{L}\p{M}\s.]*?)\s*(\d+)(?:\s*-\s*(\d+))?(?:\s*[:.\s\u1361\u1365]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/iu
  );
  if (!m) return { ok: false, error: translate(lang, 'bible.formatHint') };

  const book = findBook(m[1]);
  if (!book) return { ok: false, error: translate(lang, 'bible.noBook', { name: m[1].trim() }) };
  const range = translate(lang, 'bible.oneChapter');

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
    if (chapter < 1 || chapter > book.chapters) return { ok: false, error: chapterCount(book, lang) };
    return { ok: false, error: translate(lang, 'bible.addVerseNumber', { book: referenceBookName(book, lang), chapter }) };
  }
  if (chapter < 1 || chapter > book.chapters) {
    return {
      ok: false,
      error: chapterCount(book, lang),
    };
  }
  if (start < 1) return { ok: false, error: translate(lang, 'bible.startAtOne') };
  if (end < start) return { ok: false, error: translate(lang, 'bible.backwards') };
  if (end - start + 1 > MAX_PASSAGE_VERSES) {
    return { ok: false, error: translate(lang, 'bible.tooMany', { max: MAX_PASSAGE_VERSES }) };
  }
  return { ok: true, ref: { book, chapter, start, end } };
}

/** "Jude has one chapter." / "Romans has 16 chapters." */
const chapterCount = (book: BibleBook, lang: Lang) =>
  translateCount(lang, 'bible.chapterCount', book.chapters, { book: bookNameIn(book, lang) });

export function formatReference({ book, chapter, start, end }: PassageRef, language: 'en' | 'am' = 'en'): string {
  return `${referenceBookName(book, language)} ${chapter}:${start}${end > start ? `-${end}` : ''}`;
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
export async function getPassage(translation: Translation, ref: PassageRef, lang: Lang = 'en'): Promise<PassageResult> {
  const info = translationInfo(translation);
  const name = translationNameIn(translation, lang);
  if (info.newTestamentOnly && !isNewTestament(ref.book)) {
    return { ok: false, error: translate(lang, 'bible.newTestamentOnly', { name }) };
  }
  const book = await loadBook(translation, ref.book.code);
  const verses = book[ref.chapter - 1] ?? [];
  // Trailing "" entries are verses this translation leaves out, not the chapter's length.
  let count = verses.length;
  while (count > 0 && verses[count - 1] === '') count--;
  if (ref.end > count) {
    return {
      ok: false,
      error: translate(lang, 'bible.verseCount', { book: referenceBookName(ref.book, lang), chapter: ref.chapter, n: count }),
    };
  }
  const parts = verses.slice(ref.start - 1, ref.end);
  const lost = parts.findIndex((v) => v === null);
  if (lost !== -1) {
    const n = ref.start + lost;
    return {
      ok: false,
      error:
        ref.end > ref.start
          ? translate(lang, 'bible.lostInRange', { n, name })
          : translate(lang, 'bible.lostSingle', { name }),
    };
  }
  const absent = parts.findIndex((v) => !v);
  if (absent !== -1) {
    return {
      ok: false,
      error: translate(lang, 'bible.omitted', {
        translation: translationShortNameIn(translation, lang),
        n: ref.start + absent,
      }),
    };
  }
  return { ok: true, text: parts.join(' ') };
}
