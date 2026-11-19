// Builds the Bible dataset from eBible.org USFM sources, plus the Amharic Old
// Testament from WordProject (see OLD_TESTAMENT_SOURCES).
//
//   npm run build:bible            # download (cached) and regenerate
//   npm run build:bible -- --force # allow changes to already-published files
//
// Downloads are cached in $BIBLE_CACHE_DIR (default: <tmpdir>/biblica-bible-sources)
// and never fetched again: the eBible.org zips, and WordProject's 929 Amharic
// Old Testament chapter pages, fetched one at a time 1.5 s apart (about 25
// minutes on a first run).
//
// Published files are cached as immutable for a year, so changing one in place
// would leave readers on the old text. The script refuses to; bump
// BIBLE_DATA_VERSION instead (or pass --force before a version is deployed).
//
// Output (committed, served as static files):
//   public/bible/<BIBLE_DATA_VERSION>/<TR>/<BOOK>.json   (string|null)[][]: [chapter-1][verse-1] -> text
//   src/data/curatedText.json                              built-in verses in every translation
//
// A verse the translation leaves out is "" (the BSB omits verses absent from
// the oldest manuscripts, such as Matthew 17:21). A verse whose text our
// source lost is null (see DAMAGED_RANGES) unless a native reader has
// confirmed where it belongs (see REPAIRS); in the WordProject text that is
// every empty verse and its neighbours, and every garbled verse (see
// parseWordProjectChapter). A New-Testament-only translation has no Old
// Testament files. Needs Node 23.6+ (runs .ts directly), `curl` and `unzip`.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { BIBLE_BOOKS, isNewTestament } from '../src/data/bibleBooks.ts';
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

type Book = (string | null)[][];
interface VerseRange {
  chapter: number;
  start: number;
  end: number;
}

// The Amharic e-text marks 3-5 verses as printed together (\v 14-16) in 254
// places but keeps only one verse's words, sometimes the first verse and
// sometimes the last: John 3:14-16 holds only 3:16, Matthew 28:18-20 only
// 28:18. Which verse survived can't be told from the data, so every verse in
// such a range is null until a native reader confirms where the text belongs.
// Any other source with ranges stops the build until someone decides.
const DAMAGED_RANGES = new Set(['AMH']);

// Verses the source numbers one off from every other edition. Amharic John 1
// has 52 verses: after the damaged 1:38-40, 1:41 holds standard 1:40 (Andrew),
// through 1:52 holding 1:51. Null them until a native reader confirms.
// The Amharic Old Testament follows the Hebrew numbering where it differs from
// the English (Job 40:25-41:26 is English 41:1-34, Hosea 2:1 is English 1:10,
// Jonah 2:1 is English 1:17), and Psalm 14 adds three verses after 14:3 (the
// Greek text's 14:4-6), so later verses are numbered off. Psalm 140:1 is the
// title alone, with 140:2 holding English 140:1-2.
const MISNUMBERED: Record<string, { book: string; chapter: number; start: number; end: number }[]> = {
  AMH: [
    { book: 'JHN', chapter: 1, start: 41, end: 52 },
    { book: '2KI', chapter: 12, start: 1, end: 21 },
    { book: 'JOB', chapter: 40, start: 25, end: 32 },
    { book: 'JOB', chapter: 41, start: 1, end: 26 },
    { book: 'PSA', chapter: 14, start: 4, end: 10 },
    { book: 'PSA', chapter: 140, start: 1, end: 2 },
    { book: 'SNG', chapter: 7, start: 1, end: 13 },
    { book: 'HOS', chapter: 2, start: 1, end: 23 },
    { book: 'HOS', chapter: 12, start: 1, end: 14 },
    { book: 'JON', chapter: 2, start: 1, end: 10 },
  ],
};

// Proposed repairs for the verses nulled above: which verse the surviving text
// of each damaged place belongs to. Only entries a native reader has confirmed
// (confirmed: true, confirmedBy set) are applied; the rest stay null.
const REPAIRS: Record<string, string> = {
  AMH: join(ROOT, 'scripts', 'amharic-repairs.json'),
};

interface Repair {
  ref: string; // where the source puts the text: "JHN 3:14-16", "JHN 1:41"
  kind: 'combined' | 'misnumbered' | 'latin';
  sourceText: string; // the text exactly as the build parses it from the source
  proposedVerse: string; // "JHN 3:16"
  correctedText?: string | null; // replaces sourceText (for a garbled word)
  confirmed: boolean;
  confirmedBy: string | null;
}

function parseRef(ref: string) {
  const m = ref.match(/^([1-3A-Z]{3}) (\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Bad reference "${ref}"`);
  const start = Number(m[3]);
  return { book: m[1], chapter: Number(m[2]), start, end: m[4] ? Number(m[4]) : start };
}

function loadRepairs(trId: string): Repair[] {
  const path = REPAIRS[trId];
  if (!path) return [];
  const repairs: Repair[] = JSON.parse(readFileSync(path, 'utf8'));
  const refs = new Set<string>();
  for (const r of repairs) {
    const where = `${trId} ${r.ref}`;
    if (refs.has(r.ref)) throw new Error(`${where}: listed twice`);
    refs.add(r.ref);
    if (!BIBLE_BOOKS.some((b) => b.code === parseRef(r.ref).book)) throw new Error(`${where}: unknown book`);
    if (typeof r.confirmed !== 'boolean') throw new Error(`${where}: confirmed must be true or false`);
    if (r.confirmed && !r.confirmedBy?.trim()) throw new Error(`${where}: confirmed without confirmedBy`);
    if (r.correctedText != null && r.kind !== 'latin') throw new Error(`${where}: only a latin repair may have correctedText`);
  }
  return repairs;
}

/**
 * Writes confirmed repairs into `book` (already nulled). `parsed` and `ranges`
 * are the book as the source has it; every entry, confirmed or not, must still
 * match them, so an updated source is reviewed again instead of silently restored.
 */
function applyRepairs(trId: string, code: string, book: Book, parsed: Book, ranges: VerseRange[], repairs: Repair[]): number {
  let applied = 0;
  for (const r of repairs) {
    const at = parseRef(r.ref);
    if (at.book !== code) continue;
    const where = `${trId} ${r.ref}`;
    const source = parsed[at.chapter - 1]?.[at.start - 1];
    const damaged =
      r.kind === 'combined'
        ? ranges.some((g) => g.chapter === at.chapter && g.start === at.start && g.end === at.end)
        : r.kind === 'misnumbered'
          ? at.end === at.start &&
            (MISNUMBERED[trId] ?? []).some((m) => m.book === code && m.chapter === at.chapter && at.start >= m.start && at.start <= m.end)
          : r.kind === 'latin' && at.end === at.start && /[A-Za-z]/.test(source ?? '');
    if (!damaged) throw new Error(`${where}: not a ${r.kind} place in the source; review this repair again`);
    if (source !== r.sourceText) {
      throw new Error(`${where}: sourceText no longer matches the source; review this repair again`);
    }
    if (r.confirmed !== true) continue;
    const to = parseRef(r.proposedVerse);
    const allowed =
      r.kind === 'combined' ? to.start >= at.start && to.start <= at.end
      : r.kind === 'misnumbered' ? to.start === at.start - 1
      : to.start === at.start;
    if (to.book !== code || to.chapter !== at.chapter || to.end !== to.start || !allowed) {
      throw new Error(`${where}: ${r.kind} repair cannot move text to ${r.proposedVerse}`);
    }
    const text = (r.correctedText ?? r.sourceText).trim();
    if (!text || /[A-Za-z]/.test(text)) throw new Error(`${where}: repaired text is empty or has Latin letters`);
    if (r.kind === 'latin') {
      // Only the garbled word, and the word before it, may change.
      const words = r.sourceText.split(' ');
      const i = words.findIndex((w) => /[A-Za-z]/.test(w));
      const before = words.slice(0, Math.max(0, i - 1)).join(' ');
      const after = words.slice(i + 1).join(' ');
      if (!text.startsWith(before) || !text.endsWith(after) || text.length <= before.length + after.length + 1) {
        throw new Error(`${where}: correctedText must be the whole verse with only the garbled word fixed`);
      }
    }
    const verses = book[to.chapter - 1];
    if (verses[to.start - 1] !== null) throw new Error(`${where}: ${r.proposedVerse} already has text`);
    verses[to.start - 1] = text;
    applied++;
  }
  return applied;
}

// eBible.org's Amharic text is the New Testament only. Its Old Testament comes
// from WordProject's copy of the same 1962 Bible, one HTML page per chapter.
// The site's download archive (wordpocket.org am_new.zip) is an older copy
// with whole passages missing (Genesis 31:33-55, Judges 20:12-48), so the
// build reads the live pages: fetched one at a time with a pause between
// requests and cached, so each page is fetched only once. The live 1 Kings 21
// page repeats chapter 22, so that chapter alone comes from the archive.
interface OldTestamentSource {
  pages: string;
  archive: string; // zip of the same pages, laid out <dir>/<book>/<chapter>.htm
  archiveDir: string;
  fromArchive: string[]; // "1KI 21": chapters whose live page is wrong
}
const OLD_TESTAMENT_SOURCES: Record<string, OldTestamentSource> = {
  AMH: {
    pages: 'https://www.wordproject.org/bibles/am',
    archive: 'https://www.wordpocket.org/bibles/download_zip/am_new.zip',
    archiveDir: 'am_new',
    fromArchive: ['1KI 21'],
  },
};

/** One chapter page from a WordProject zip archive (downloaded once and cached). */
function wordProjectArchiveChapter(source: OldTestamentSource, bookNumber: number, chapter: number): string {
  const dir = join(CACHE_DIR, 'wordproject', 'archive', source.archiveDir);
  if (!existsSync(join(dir, source.archiveDir))) {
    mkdirSync(dir, { recursive: true });
    const zip = join(dir, 'archive.zip');
    console.log(`Downloading ${source.archive}`);
    execFileSync('curl', ['-fsSL', '--retry', '3', '-A', 'biblica-build-bible', '-o', zip, source.archive], { stdio: 'inherit' });
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir], { stdio: 'inherit' });
  }
  return readFileSync(join(dir, source.archiveDir, String(bookNumber).padStart(2, '0'), `${chapter}.htm`), 'utf8');
}

// The Hebrew alphabet as the Amharic Lamentations spells it.
const HEBREW_LETTERS = [
  'አሌፍ', 'ቤት', 'ጋሜል', 'ዳሌጥ', 'ሄ', 'ዋው', 'ዛይ', 'ሔት', 'ጤት', 'ዮድ', 'ካፍ',
  'ላሜድ', 'ሜም', 'ኖን', 'ሳምኬት', 'ዔ', 'ፌ', 'ጻዴ', 'ቆፍ', 'ሬስ', 'ሳን', 'ታው',
];

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** One chapter page of a WordProject Bible, from the cache when it has been fetched before. */
function wordProjectChapter(baseUrl: string, bookNumber: number, chapter: number): string {
  const name = `${String(bookNumber).padStart(2, '0')}/${chapter}.htm`;
  const path = join(CACHE_DIR, 'wordproject', new URL(baseUrl).pathname.split('/').filter(Boolean).join('-'), name);
  if (!existsSync(path)) {
    mkdirSync(join(path, '..'), { recursive: true });
    const url = `${baseUrl}/${name}`;
    console.log(`Downloading ${url}`);
    execFileSync('curl', ['-fsSL', '--retry', '3', '-A', 'biblica-build-bible', '-o', `${path}.part`, url], { stdio: 'inherit' });
    renameSync(`${path}.part`, path);
    sleep(1500);
  }
  return readFileSync(path, 'utf8');
}

/**
 * One chapter of a WordProject page: verses 1-n, and the places whose text
 * can't be trusted. Verse numbers are spans (`<span class="verse" id="2">2 </span>`,
 * the first one commented out) or, in a few places, bare ("25፤"); each verse
 * starts on its own line after a <br />.
 */
export function parseWordProjectChapter(html: string, chapter: number): { verses: (string | null)[]; damaged: VerseRange[] } {
  const start = html.indexOf('<div class="textBody" id="textBody">');
  const end = html.indexOf('<!-- /textBody -->');
  if (start < 0 || end < start) throw new Error(`chapter ${chapter}: no textBody`);
  const body = html.slice(start, end);
  // Only the chapter heading is outside the paragraph; nothing else in the body is scripture.
  const heading = body.match(/<h3>[^<]*<\/h3>/g) ?? [];
  if (heading.length !== 1 || !heading[0].includes(String(chapter))) throw new Error(`chapter ${chapter}: unexpected headings ${heading.join(' ')}`);
  const p = body.match(/<p>([\s\S]*)<\/p>/);
  if (!p) throw new Error(`chapter ${chapter}: no paragraph`);

  const verses: (string | null)[] = [];
  const damaged: VerseRange[] = [];
  const mark = (from: number, to: number) => {
    const s = Math.max(1, from);
    const e = Math.min(verses.length, to);
    if (s <= e) damaged.push({ chapter, start: s, end: e });
  };
  for (const line of p[1].split(/<br\s*\/?>/)) {
    const m = line.match(/^\s*(?:<!--\s*span class="verse" id="(\d+)">\s*\d+\s*<\/span\s*-->|<span class="verse" id="(\d+)">\s*\d+\s*<\/span>|(\d+)(?=\s*፤))/);
    if (!m) {
      // Text outside the numbering: a Psalm title split from its verse
      // (Psalm 14:1), or verses beyond the chapter's numbering ("[8] …").
      // It can't be placed, and the verse before it may hold part of it.
      if (line.trim()) mark(verses.length, verses.length);
      continue;
    }
    const n = Number(m[1] ?? m[2] ?? m[3]);
    // A number going backwards is a translator's note on that verse
    // (Genesis 46 ends with "28" saying the Ge'ez book calls Goshen Rameses).
    if (n <= verses.length) continue;
    if (n !== verses.length + 1) throw new Error(`chapter ${chapter}: verse ${n} after verse ${verses.length}`);
    const text = line
      .slice(m.index! + m[0].length)
      // Most verses start with a stray "፤", the e-text's verse separator.
      .replace(/^[\s፤]+/, '')
      // Exodus 3:14 quotes the Name as <<ያለና የሚኖር>>: guillemets, spaced like other words.
      .replace(/\s*<<\s*/g, ' «')
      .replace(/\s*>>\s*/g, '» ')
      .replace(/\s+/g, ' ')
      .trim();
    if (/[<>&]/.test(text)) throw new Error(`chapter ${chapter}:${n}: markup left in "${text}"`);
    verses.push(text);
  }
  if (!verses.length) throw new Error(`chapter ${chapter}: no verses`);

  verses.forEach((text, i) => {
    // Anything but Ethiopic and ? ! is left-over transliteration code from the
    // e-text ("gWdጓድ"): the verse is garbled. A verse number inside it
    // ("v27 ፤", "q ቍ@28") means a neighbour's text is in it too.
    if (!text || !/[^ሀ-᎟\s?!«»]/u.test(text)) return;
    if (/\d/.test(text)) mark(i, i + 2);
    else mark(i + 1, i + 1);
  });
  // An empty verse was printed together with a neighbour, whose entry holds
  // the text of both: usually the next one (Genesis 7:3 holds 7:2-3), sometimes
  // the one before (Zechariah 3:3 holds 3:3-4). Which can't be told from the
  // data, so the empty verses and the verse on each side are all unavailable.
  for (let i = 0; i < verses.length; i++) {
    if (verses[i]) continue;
    let j = i;
    while (j + 1 < verses.length && !verses[j + 1]) j++;
    mark(i, j + 2);
    i = j;
  }
  return { verses, damaged };
}

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

export function parseUsfm(source: string): { book: Book; ranges: VerseRange[] } {
  const book: string[][] = [];
  const ranges: VerseRange[] = [];
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
      const m = chunk.match(/^\s*(\d+)(?:-(\d+))?[a-z]?\s?/);
      if (!m) throw new Error(`Expected a number after \\${pending}: ${chunk.slice(0, 40)}`);
      const n = Number(m[1]);
      if (pending === 'c') {
        chapter = n;
        verse = 0;
        book[chapter - 1] ??= [];
      } else {
        verse = n;
        if (m[2] && Number(m[2]) > n) ranges.push({ chapter, start: n, end: Number(m[2]) });
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

  const cleaned: Book = book.map((verses) =>
    // ¶ is the KJV's paragraph sign, not part of the wording.
    Array.from(verses, (v) =>
      (v ?? '')
        .replace(/¶/g, ' ')
        // The Amharic e-text leaves inline footnote callers: ዲናር*ፍ1*
        .replace(/\*ፍ\d+\*/g, '')
        .replace(/\s+/g, ' ')
        // Removed footnotes leave a gap before punctuation: "Dara —five", "( Now".
        .replace(/\s+([,.;:!?’”)\]—])/g, '$1')
        .replace(/([([])\s+/g, '$1')
        .trim()
    )
  );
  return { book: cleaned, ranges };
}

/** The passage's text, or null when any verse in it is absent or unavailable. */
function verseText(book: Book, chapter: number, range: string): string | null {
  const [start, end = start] = range.split('-').map(Number);
  const out: string[] = [];
  for (let v = start; v <= end; v++) {
    const t = book[chapter - 1]?.[v - 1];
    if (!t) return null;
    out.push(t);
  }
  return out.join(' ');
}

function main() {
  const outputs = new Map<string, string>(); // path -> contents
  const kjvBooks = new Map<string, Book>(); // versification reference for other texts
  const curated: Record<string, Record<string, string>> = {};

  for (const tr of TRANSLATIONS) {
    const dir = download(tr.source);
    const files = readdirSync(dir).filter((f) => f.endsWith('.usfm'));
    const outDir = join(OUT_DIR, tr.id);
    const books = new Map<string, Book>();
    let verses = 0;
    let missing = 0;
    let unavailable = 0;
    let restored = 0;
    const repairs = loadRepairs(tr.id);

    for (const meta of BIBLE_BOOKS) {
      if (tr.newTestamentOnly && !isNewTestament(meta)) continue;
      const otSource: OldTestamentSource | undefined = OLD_TESTAMENT_SOURCES[tr.id];
      let book: Book;
      let ranges: VerseRange[];
      if (otSource && !isNewTestament(meta)) {
        book = [];
        ranges = [];
        const number = BIBLE_BOOKS.indexOf(meta) + 1;
        const pages = Array.from({ length: meta.chapters }, (_, i) => wordProjectChapter(otSource.pages, number, i + 1));
        const scripture = (html: string) => parseWordProjectChapter(html.replace(/<h3>[^<]*<\/h3>/, '<h3>0</h3>'), 0).verses.join('\n');
        for (let c = 1; c <= meta.chapters; c++) {
          let html = pages[c - 1];
          if (otSource.fromArchive.includes(`${meta.code} ${c}`)) {
            // Only while the live page still repeats the next chapter's text.
            if (c === meta.chapters || scripture(html) !== scripture(pages[c])) {
              throw new Error(`${tr.id} ${meta.code} ${c}: the live page is no longer a copy of chapter ${c + 1}; drop it from fromArchive`);
            }
            html = wordProjectArchiveChapter(otSource, number, c);
          }
          const { verses, damaged } = parseWordProjectChapter(html, c);
          // Lamentations 1-4 are acrostics, and the text heads each stanza
          // with its Hebrew letter ("ሔት። ያልጠፋነው…"): a heading, not scripture.
          if (meta.code === 'LAM') {
            verses.forEach((v, i) => {
              verses[i] = v && v.replace(new RegExp(`^(${HEBREW_LETTERS.join('|')})።\\s*`), '');
            });
          }
          book.push(verses);
          ranges.push(...damaged);
        }
      } else {
        const file = files.find((f) => new RegExp(`^\\d+-${meta.code}`).test(f));
        if (!file) throw new Error(`${tr.id}: no USFM file for ${meta.code}`);
        ({ book, ranges } = parseUsfm(readFileSync(join(dir, file), 'utf8')));
      }
      if (ranges.length && !DAMAGED_RANGES.has(tr.id)) {
        const r = ranges[0];
        throw new Error(`${tr.id} ${meta.code} ${r.chapter}:${r.start}-${r.end}: combined verses; decide how to store them`);
      }
      const parsed: Book = book.map((verses) => [...verses]);
      for (const r of ranges) {
        for (let v = r.start; v <= r.end; v++) book[r.chapter - 1][v - 1] = null;
      }
      for (const r of MISNUMBERED[tr.id] ?? []) {
        if (r.book !== meta.code) continue;
        for (let v = r.start; v <= r.end; v++) book[r.chapter - 1][v - 1] = null;
      }
      // Latin letters inside Ethiopic text are transliteration errors in the
      // e-text ("የሚፈርድ Avረ", 1 Corinthians 10:29): treat the verse as lost.
      if (tr.language === 'am') {
        for (const verses of book) {
          verses.forEach((v, i) => {
            if (v && /[A-Za-z]/.test(v)) verses[i] = null;
          });
        }
      }
      restored += applyRepairs(tr.id, meta.code, book, parsed, ranges, repairs);
      if (book.length !== meta.chapters) {
        throw new Error(`${tr.id} ${meta.code}: ${book.length} chapters, expected ${meta.chapters}`);
      }
      for (const [c, chapterVerses] of book.entries()) {
        if (!chapterVerses?.length) throw new Error(`${tr.id} ${meta.code} ${c + 1}: empty chapter`);
        for (const v of chapterVerses) {
          if (v === null) {
            unavailable++;
            continue;
          }
          if (/[\\|]/.test(v)) throw new Error(`${tr.id} ${meta.code} ${c + 1}: markup left in "${v}"`);
          if (v) verses++;
          else missing++;
        }
      }
      // A non-English text with more verses in a chapter than the KJV is
      // probably shifted (as Amharic John 1 was): every extra verse must be null.
      const reference = kjvBooks.get(meta.code);
      if (reference && tr.id !== 'KJV') {
        book.forEach((verses, c) => {
          const extra = verses.slice(reference[c].length);
          if (tr.language !== 'en' && extra.some((v) => v !== null)) {
            throw new Error(
              `${tr.id} ${meta.code} ${c + 1}: ${verses.length} verses, KJV has ${reference[c].length}. ` +
                'Check for misnumbered verses (see MISNUMBERED).'
            );
          }
        });
      }
      if (tr.id === 'KJV') kjvBooks.set(meta.code, book);
      books.set(meta.code, book);
      outputs.set(join(outDir, `${meta.code}.json`), JSON.stringify(book));
    }

    // A built-in verse this translation lacks is left out of its library; the
    // Amharic one has its own stand-ins (language: 'am'), which must have text.
    curated[tr.id] = {};
    for (const cv of CURATED_VERSES) {
      if (cv.language && cv.language !== tr.language) continue;
      const book = books.get(cv.book);
      const text = book ? verseText(book, cv.chapter, cv.verses) : null;
      if (text) curated[tr.id][cv.id] = text;
      else if (cv.language || (!tr.newTestamentOnly && !DAMAGED_RANGES.has(tr.id))) {
        throw new Error(`${tr.id}: no text for ${cv.id}`);
      }
    }
    console.log(
      `${tr.id}: ${verses} verses, ${missing} absent, ${unavailable} unavailable, ` +
        (repairs.length ? `${restored}/${repairs.length} repairs applied, ` : '') +
        `${Object.keys(curated[tr.id]).length}/${CURATED_VERSES.length} built-in`
    );
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
