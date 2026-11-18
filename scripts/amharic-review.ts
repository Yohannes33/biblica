// Review loop for scripts/amharic-repairs.json (see REPAIRS in build-bible.ts).
//
//   npm run amharic:sheet -- review.html        # page for the native reader
//   npm run amharic:apply -- answers.txt        # fold their answers back in
//
// The sheet is one self-contained HTML file: send it as is, or publish it.
// The reader answers each entry and sends back the "answers" text it makes.
// `apply` writes that text into the JSON: "yes N" (the verse the sheet showed
// them; refused if the proposal has changed since) or "verse N" (a different
// verse they picked) sets confirmed and confirmedBy; "no" and "unsure" stay
// unconfirmed. The entry's `review` keeps the latest answer. Answers that were
// cut short, come from a sheet with different text, or contradict themselves
// change nothing. Then run `npm run build:bible` (bump BIBLE_DATA_VERSION if
// AMH is already deployed).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BIBLE_BOOKS } from '../src/data/bibleBooks.ts';
import { BIBLE_DATA_VERSION, TRANSLATIONS } from '../src/data/translations.ts';

const ROOT = resolve(import.meta.dirname, '..');
const REPAIRS_PATH = join(ROOT, 'scripts', 'amharic-repairs.json');
const ANSWER = /^([1-3A-Z]{3} \d+:\d+(?:-\d+)?) \| (?:(yes|verse) (\d+)|(no|unsure))((?: \| (?:fix|note): [^|]*)*)$/;
const HEADER = /^(Biblica Amharic review|Sheet: .*|Reviewer:.*|Date:.*|End of answers: \d+)$/;

interface Repair {
  ref: string;
  kind: 'combined' | 'misnumbered' | 'latin';
  sourceText: string;
  proposedVerse: string;
  englishOfProposed: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
  correctedText?: string | null;
  confirmed: boolean;
  confirmedBy: string | null;
  review: { decision: string; verse?: string; note?: string; by: string; date: string } | null;
}

const books = new Map(BIBLE_BOOKS.map((b) => [b.code, b]));
const englishCache = new Map<string, (string | null)[][]>();

function english(code: string, chapter: number, verse: number): string {
  for (const tr of ['WEB', 'KJV']) {
    const key = `${tr}/${code}`;
    if (!englishCache.has(key)) {
      englishCache.set(key, JSON.parse(readFileSync(join(ROOT, 'public', 'bible', BIBLE_DATA_VERSION, tr, `${code}.json`), 'utf8')));
    }
    const text = englishCache.get(key)![chapter - 1]?.[verse - 1];
    if (text) return text;
  }
  return '';
}

function parseRef(ref: string) {
  const m = ref.match(/^([1-3A-Z]{3}) (\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Bad reference "${ref}"`);
  const start = Number(m[3]);
  return { book: m[1], chapter: Number(m[2]), start, end: m[4] ? Number(m[4]) : start };
}

/** Verses the build accepts for this text (see applyRepairs in build-bible.ts). */
function choices(r: Repair): number[] {
  const at = parseRef(r.ref);
  if (r.kind === 'misnumbered') return [at.start - 1];
  const out: number[] = [];
  for (let v = at.start; v <= at.end; v++) out.push(v);
  return out;
}

function load(): Repair[] {
  return JSON.parse(readFileSync(REPAIRS_PATH, 'utf8'));
}

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);

/** Names the Amharic text a sheet showed; answers from another text are refused. */
const sheetId = (repairs: Repair[]) => hash(repairs.map((r) => [r.ref, r.kind, r.sourceText]));

/**
 * For a garbled-word entry: the text a correction must keep. Only the garbled
 * word and the one before it (it may be the same word split apart) may change.
 */
function keptAroundGarble(sourceText: string) {
  const words = sourceText.split(' ');
  const i = words.findIndex((w) => /[A-Za-z]/.test(w));
  return { before: words.slice(0, Math.max(0, i - 1)).join(' '), after: words.slice(i + 1).join(' ') };
}

function fixKeepsRest(sourceText: string, fix: string): boolean {
  const { before, after } = keptAroundGarble(sourceText);
  return fix.startsWith(before) && fix.endsWith(after) && fix.length > before.length + after.length + 1;
}

function sheet(outPath: string, fragment: boolean) {
  const repairs = load();
  const amh = TRANSLATIONS.find((t) => t.id === 'AMH')!;
  const entries = repairs.map((r) => {
    const at = parseRef(r.ref);
    const book = books.get(at.book)!;
    const proposed = parseRef(r.proposedVerse).start;
    return {
      ref: r.ref,
      kind: r.kind,
      book: book.name,
      bookAm: book.am?.name ?? book.name,
      chapter: at.chapter,
      start: at.start,
      end: at.end,
      text: r.sourceText,
      proposed,
      // Only flag doubts; showing our confidence on every entry would lead the reader.
      caution: r.confidence === 'low',
      ...(r.kind === 'latin' ? { keep: keptAroundGarble(r.sourceText) } : {}),
      verses: choices(r).map((v) => ({ v, en: english(at.book, at.chapter, v) })),
    };
  });
  // Saved progress is keyed to the text and proposals, so a newer sheet never
  // shows an old "yes" against a different verse.
  const sheet = sheetId(repairs);
  const storage = hash([sheet, entries.map((e) => e.proposed)]);
  const data = JSON.stringify({ sheet, storage, entries, copyright: amh.credit }).replace(/</g, '\\u003c');
  const page = readFileSync(join(ROOT, 'scripts', 'amharic-review.html'), 'utf8').replace('/*DATA*/null', () => data);
  // --fragment leaves out the document shell, for hosts that add their own.
  writeFileSync(
    outPath,
    fragment
      ? page
      : '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' +
          page +
          '</body></html>'
  );
  console.log(`Wrote ${outPath}: ${entries.length} entries, ${repairs.filter((r) => r.confirmed).length} already confirmed`);
}

function apply(answersPath: string, by?: string) {
  const repairs = load();
  const byRef = new Map(repairs.map((r) => [r.ref, r]));
  const lines = readFileSync(answersPath, 'utf8').split(/\r?\n/).map((l) => l.trim());
  const named = lines.find((l) => /^Reviewer:/.test(l))?.replace(/^Reviewer:\s*/, '').trim();
  if (by?.trim() && named && by.trim() !== named) throw new Error(`The answers are signed "${named}", not "${by.trim()}"`);
  const reviewer = named || by?.trim();
  if (!reviewer) throw new Error('The answers have no reviewer name; pass --by "<name>"');
  const sheet = lines.find((l) => l.startsWith('Sheet: '))?.slice(7);
  if (sheet !== sheetId(repairs)) {
    throw new Error(`These answers are for sheet ${sheet ?? '(none)'}, but the Amharic text now makes sheet ${sheetId(repairs)}; send a new sheet`);
  }
  // A mail client that wraps long lines would cut a corrected verse short.
  const answerLines = lines.filter((l) => l && !HEADER.test(l));
  const end = lines.find((l) => l.startsWith('End of answers: '));
  if (!end || Number(end.slice(16)) !== answerLines.length) {
    throw new Error(`The answers are incomplete or were changed in transit (${answerLines.length} answer lines, "${end ?? 'no end line'}"). Ask for the saved file instead.`);
  }
  const date = new Date().toISOString().slice(0, 10);
  const tally: Record<string, number> = {};
  const moved: string[] = [];
  const seen = new Set<string>();

  for (const line of answerLines) {
    const m = line.match(ANSWER);
    if (!m) throw new Error(`Cannot read answer line: ${line}`);
    const r = byRef.get(m[1]);
    if (!r) throw new Error(`${m[1]}: not in amharic-repairs.json`);
    if (seen.has(r.ref)) throw new Error(`${r.ref} is answered twice; nothing was saved`);
    seen.add(r.ref);
    const fields = Object.fromEntries(
      [...m[5].matchAll(/ \| (fix|note): ([^|]*)/g)].map(([, k, v]) => [k, v.trim()])
    );
    const at = parseRef(r.ref);
    let decision = m[2] ?? m[4];
    const verse = m[3] ? Number(m[3]) : undefined;
    const proposed = parseRef(r.proposedVerse).start;
    if (decision === 'yes' && verse !== proposed) {
      throw new Error(`${r.ref}: the reader confirmed verse ${verse}, but the proposal is now ${r.proposedVerse}; send them a new sheet`);
    }
    if (decision === 'verse') {
      if (!choices(r).includes(verse!)) throw new Error(`${r.ref}: verse ${verse} is not one of ${choices(r).join(', ')}`);
      if (verse === proposed) decision = 'yes';
    }
    const confirmed = decision === 'yes' || decision === 'verse';
    if (confirmed && r.kind === 'latin') {
      const fix = (fields.fix ?? '').replace(/\s+/g, ' ').trim();
      if (!fix || /[A-Za-z/|]/.test(fix) || !fixKeepsRest(r.sourceText, fix)) {
        throw new Error(`${r.ref}: the "fix:" must be the whole verse, unchanged apart from the garbled word, with no Latin letters, / or |`);
      }
      r.correctedText = fix;
    }
    if (decision === 'verse') {
      const was = r.proposedVerse;
      r.proposedVerse = `${at.book} ${at.chapter}:${verse}`;
      r.englishOfProposed = english(at.book, at.chapter, verse!);
      moved.push(`${r.ref}: proposed ${was}, reader chose ${r.proposedVerse}`);
    }
    if (r.confirmed && !confirmed && r.confirmedBy !== reviewer) {
      moved.push(`${r.ref}: ${reviewer} answered "${decision}", which withdraws ${r.confirmedBy}'s confirmation`);
    }
    r.confirmed = confirmed;
    r.confirmedBy = confirmed ? reviewer : null;
    r.review = {
      decision,
      ...(confirmed ? { verse: r.proposedVerse } : {}),
      ...(fields.note ? { note: fields.note } : {}),
      by: reviewer,
      date,
    };
    tally[decision] = (tally[decision] ?? 0) + 1;
  }

  // The build refuses two texts for one verse; say so now, before writing anything.
  const targets = new Map<string, string>();
  for (const r of repairs.filter((x) => x.confirmed)) {
    const other = targets.get(r.proposedVerse);
    if (other) throw new Error(`${other} and ${r.ref} are both confirmed as ${r.proposedVerse}; nothing was saved`);
    targets.set(r.proposedVerse, r.ref);
  }
  writeFileSync(REPAIRS_PATH, JSON.stringify(repairs, null, 2) + '\n');
  const done = repairs.filter((r) => r.review).length;
  console.log(`Answers from ${reviewer}:`, tally);
  for (const m of moved) console.log(`  ${m}`);
  console.log(`${repairs.filter((r) => r.confirmed).length} confirmed, ${done}/${repairs.length} reviewed.`);
}

const [command, path, ...rest] = process.argv.slice(2);
const byIndex = rest.indexOf('--by');
if (command === 'sheet' && path) sheet(path, rest.includes('--fragment'));
else if (command === 'apply' && path) apply(path, byIndex >= 0 ? rest[byIndex + 1] : undefined);
else {
  console.error('Usage: amharic-review.ts sheet <out.html> [--fragment] | apply <answers.txt> [--by "<name>"]');
  process.exit(1);
}
