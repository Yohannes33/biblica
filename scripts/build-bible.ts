// Builds the Bible dataset from eBible.org USFM sources.
//
//   npm run build:bible            # download (cached) and regenerate
//   npm run build:bible -- --force # allow changes to already-published files
//
// Published files are cached as immutable for a year, so changing one in place
// would leave readers on the old text. The script refuses to; bump
// BIBLE_DATA_VERSION instead (or pass --force before a version is deployed).
//
// Output (committed, served as static files):
//   public/bible/<BIBLE_DATA_VERSION>/<TR>/<BOOK>.json   string[][]: [chapter-1][verse-1] -> text
//   src/data/curatedText.json                              built-in verses in every translation
//
// A missing verse is "" (the BSB leaves out verses absent from the oldest
// manuscripts, such as Matthew 17:21). Needs Node 23.6+ (runs .ts directly)
// and the `unzip` command.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { BIBLE_BOOKS } from '../src/data/bibleBooks.ts';
import { BIBLE_DATA_VERSION, TRANSLATIONS } from '../src/data/translations.ts';
import { CURATED_VERSES } from '../src/data/curatedVerses.ts';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'bible', BIBLE_DATA_VERSION);
const CACHE_DIR = process.env.BIBLE_CACHE_DIR ?? join(tmpdir(), 'biblica-bible-sources');

// Text under these markers is not scripture: titles, headings, references,
// Psalm superscriptions ("A Psalm of David."), introductions.
const SKIP_PARAGRAPH = new Set([
  'id', 'ide', 'h', 'toc1', 'toc2', 'toc3', 'toca1', 'toca2', 'toca3', 'rem', 'sts', 'usfm',
  'mt', 'mt1', 'mt2', 'mt3', 'mt4', 'mte', 'mte1', 'mte2', 'ms', 'ms1', 'ms2', 'ms3', 'mr',
  's', 's1', 's2', 's3', 's4', 'sr', 'r', 'd', 'sp', 'sd', 'sd1', 'sd2', 'qa', 'cl', 'cd',
  'imt', 'imt1', 'imt2', 'is', 'is1', 'is2', 'ip', 'ipi', 'im', 'imi', 'ipq', 'imq', 'ipr',
  'iq', 'iq1', 'iq2', 'ib', 'ili', 'ili1', 'ili2', 'iot', 'io', 'io1', 'io2', 'ior', 'iex', 'ie',
]);
// Inline spans to drop entirely: alternate/published numbers and chapter labels.
const SKIP_SPAN = new Set(['ca', 'va', 'vp', 'fig']);
// Paragraph and poetry markers: they end a heading and break words apart.
const PARAGRAPH = /^(p|m|po|pr|pc|pm|pmo|pmc|pmr|pi\d?|mi|nb|cls|li\d?|lh|lf|lim\d?|q\d?|qr|qc|qm\d?|qd|b|tr|tc\d?|th\d?|tcr\d?|thr\d?)$/;

type Book = string[][];

function download(sourceId: string): string {
  const dir = join(CACHE_DIR, sourceId);
  if (!existsSync(dir) || readdirSync(dir).every((f) => !f.endsWith('.usfm'))) {
    mkdirSync(dir, { recursive: true });
    const zip = join(dir, 'usfm.zip');
    const url = `https://ebible.org/Scriptures/${sourceId}_usfm.zip`;
    console.log(`Downloading ${url}`);
    execFileSync('curl', ['-fsSL', '-o', zip, url], { stdio: 'inherit' });
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir], { stdio: 'inherit' });
  }
  return dir;
}

export function parseUsfm(source: string): Book {
  const book: Book = [];
  // Footnotes, endnotes and cross references, which may span lines.
  let text = source.replace(/\\(f|fe|ef|x|ex)\s[\s\S]*?\\\1\*/g, ' ');
  // Word-level markup keeps only the word: \w grace|strong="G5485"\w* -> grace
  text = text.replace(/\\(\+?w)\s+([^\\|]*?)(?:\|[^\\]*?)?\\\1\*/g, '$2');

  let chapter = 0;
  let verse = 0;
  let skipParagraph = false;
  let skipSpan: string | null = null;
  let pending: 'c' | 'v' | null = null;

  const append = (chunk: string) => {
    if (pending) {
      const m = chunk.match(/^\s*(\d+)(?:-\d+)?[a-z]?\s?/);
      if (!m) throw new Error(`Expected a number after \\${pending}: ${chunk.slice(0, 40)}`);
      const n = Number(m[1]);
      if (pending === 'c') {
        chapter = n;
        verse = 0;
        book[chapter - 1] ??= [];
      } else {
        verse = n;
      }
      pending = null;
      chunk = chunk.slice(m[0].length);
    }
    if (skipParagraph || skipSpan || !chapter || !verse) return;
    const verses = book[chapter - 1];
    verses[verse - 1] = (verses[verse - 1] ?? '') + chunk;
  };

  const marker = /\\(\+?)([a-z]+\d*)(\*?)/g;
  let last = 0;
  for (let m = marker.exec(text); m; m = marker.exec(text)) {
    append(text.slice(last, m.index));
    last = marker.lastIndex;
    const name = m[2];
    const closing = m[3] === '*';
    if (closing) {
      if (skipSpan === name) skipSpan = null;
      continue;
    }
    if (SKIP_SPAN.has(name)) skipSpan = name;
    else if (name === 'c') {
      pending = 'c';
      skipParagraph = false;
    } else if (name === 'v') {
      pending = 'v';
      skipParagraph = false;
    } else if (SKIP_PARAGRAPH.has(name)) skipParagraph = true;
    else if (PARAGRAPH.test(name)) {
      skipParagraph = false;
      append(' ');
    }
    // Anything else is character styling (\nd LORD\nd*, \add, \wj, \qs): keep its text.
  }
  append(text.slice(last));

  return book.map((verses) =>
    // ¶ is the KJV's paragraph sign, not part of the wording.
    Array.from(verses, (v) =>
      (v ?? '')
        .replace(/¶/g, ' ')
        .replace(/\s+/g, ' ')
        // Removed footnotes leave a gap before punctuation: "Dara —five", "( Now".
        .replace(/\s+([,.;:!?’”)\]—])/g, '$1')
        .replace(/([([])\s+/g, '$1')
        .trim()
    )
  );
}

function verseText(book: Book, chapter: number, range: string): string {
  const [start, end = start] = range.split('-').map(Number);
  const out: string[] = [];
  for (let v = start; v <= end; v++) {
    const t = book[chapter - 1]?.[v - 1];
    if (!t) throw new Error(`Missing ${chapter}:${v}`);
    out.push(t);
  }
  return out.join(' ');
}

function main() {
  const outputs = new Map<string, string>(); // path -> contents
  const curated: Record<string, Record<string, string>> = {};

  for (const tr of TRANSLATIONS) {
    const dir = download(tr.source);
    const files = readdirSync(dir).filter((f) => f.endsWith('.usfm'));
    const outDir = join(OUT_DIR, tr.id);
    const books = new Map<string, Book>();
    let verses = 0;
    let missing = 0;

    for (const meta of BIBLE_BOOKS) {
      const file = files.find((f) => new RegExp(`^\\d+-${meta.code}`).test(f));
      if (!file) throw new Error(`${tr.id}: no USFM file for ${meta.code}`);
      const book = parseUsfm(readFileSync(join(dir, file), 'utf8'));
      if (book.length !== meta.chapters) {
        throw new Error(`${tr.id} ${meta.code}: ${book.length} chapters, expected ${meta.chapters}`);
      }
      for (const [c, chapterVerses] of book.entries()) {
        if (!chapterVerses?.length) throw new Error(`${tr.id} ${meta.code} ${c + 1}: empty chapter`);
        for (const v of chapterVerses) {
          if (/[\\|]/.test(v)) throw new Error(`${tr.id} ${meta.code} ${c + 1}: markup left in "${v}"`);
          if (v) verses++;
          else missing++;
        }
      }
      books.set(meta.code, book);
      outputs.set(join(outDir, `${meta.code}.json`), JSON.stringify(book));
    }

    curated[tr.id] = {};
    for (const cv of CURATED_VERSES) {
      curated[tr.id][cv.id] = verseText(books.get(cv.book)!, cv.chapter, cv.verses);
    }
    console.log(`${tr.id}: ${verses} verses, ${missing} absent`);
  }

  const changed = [...outputs].filter(([path, text]) => existsSync(path) && readFileSync(path, 'utf8') !== text);
  if (changed.length && !process.argv.includes('--force')) {
    throw new Error(
      `${changed.length} published ${BIBLE_DATA_VERSION} files would change (e.g. ${changed[0][0]}). ` +
        'Bump BIBLE_DATA_VERSION in src/data/translations.ts, or pass --force if this version is not deployed yet.'
    );
  }
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [path, text] of outputs) {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  writeFileSync(join(ROOT, 'src', 'data', 'curatedText.json'), JSON.stringify(curated, null, 2) + '\n');
}

main();
