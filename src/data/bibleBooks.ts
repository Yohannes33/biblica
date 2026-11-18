// The 66-book Protestant canon in order, keyed by USFM book code.
// Shared by the app and scripts/build-bible.ts, so it must stay plain
// (erasable) TypeScript that Node can run without a build step.

export interface BibleBook {
  code: string; // USFM code, also the data file name: /bible/<version>/<TR>/<code>.json
  name: string;
  chapters: number;
  // Extra spellings accepted when typing a reference (lower case, no dots).
  aliases: string[];
}

export const BIBLE_BOOKS: BibleBook[] = [
  { code: 'GEN', name: 'Genesis', chapters: 50, aliases: ['gen', 'ge', 'gn'] },
  { code: 'EXO', name: 'Exodus', chapters: 40, aliases: ['exod', 'exo', 'ex'] },
  { code: 'LEV', name: 'Leviticus', chapters: 27, aliases: ['lev', 'le', 'lv'] },
  { code: 'NUM', name: 'Numbers', chapters: 36, aliases: ['num', 'nu', 'nm', 'nb'] },
  { code: 'DEU', name: 'Deuteronomy', chapters: 34, aliases: ['deut', 'deu', 'de', 'dt'] },
  { code: 'JOS', name: 'Joshua', chapters: 24, aliases: ['josh', 'jos', 'jsh'] },
  { code: 'JDG', name: 'Judges', chapters: 21, aliases: ['judg', 'jdg', 'jg', 'jdgs'] },
  { code: 'RUT', name: 'Ruth', chapters: 4, aliases: ['rth', 'ru', 'rut'] },
  { code: '1SA', name: '1 Samuel', chapters: 31, aliases: ['1sam', '1sa', '1sm', '1s', 'isamuel', 'firstsamuel'] },
  { code: '2SA', name: '2 Samuel', chapters: 24, aliases: ['2sam', '2sa', '2sm', '2s', 'iisamuel', 'secondsamuel'] },
  { code: '1KI', name: '1 Kings', chapters: 22, aliases: ['1kgs', '1ki', '1kin', '1k', 'ikings', 'firstkings'] },
  { code: '2KI', name: '2 Kings', chapters: 25, aliases: ['2kgs', '2ki', '2kin', '2k', 'iikings', 'secondkings'] },
  { code: '1CH', name: '1 Chronicles', chapters: 29, aliases: ['1chr', '1ch', '1chron', 'ichronicles', 'firstchronicles'] },
  { code: '2CH', name: '2 Chronicles', chapters: 36, aliases: ['2chr', '2ch', '2chron', 'iichronicles', 'secondchronicles'] },
  { code: 'EZR', name: 'Ezra', chapters: 10, aliases: ['ezr', 'ez'] },
  { code: 'NEH', name: 'Nehemiah', chapters: 13, aliases: ['neh', 'ne'] },
  { code: 'EST', name: 'Esther', chapters: 10, aliases: ['esth', 'est', 'es'] },
  { code: 'JOB', name: 'Job', chapters: 42, aliases: ['jb'] },
  { code: 'PSA', name: 'Psalms', chapters: 150, aliases: ['psalm', 'ps', 'psa', 'pss', 'psm'] },
  { code: 'PRO', name: 'Proverbs', chapters: 31, aliases: ['prov', 'pro', 'pr', 'prv'] },
  { code: 'ECC', name: 'Ecclesiastes', chapters: 12, aliases: ['eccl', 'ecc', 'ec', 'eccles', 'qoh'] },
  { code: 'SNG', name: 'Song of Solomon', chapters: 8, aliases: ['songofsongs', 'song', 'sng', 'sos', 'ss', 'canticles'] },
  { code: 'ISA', name: 'Isaiah', chapters: 66, aliases: ['isa', 'is'] },
  { code: 'JER', name: 'Jeremiah', chapters: 52, aliases: ['jer', 'je', 'jr'] },
  { code: 'LAM', name: 'Lamentations', chapters: 5, aliases: ['lam', 'la'] },
  { code: 'EZK', name: 'Ezekiel', chapters: 48, aliases: ['ezek', 'ezk', 'eze'] },
  { code: 'DAN', name: 'Daniel', chapters: 12, aliases: ['dan', 'da', 'dn'] },
  { code: 'HOS', name: 'Hosea', chapters: 14, aliases: ['hos', 'ho'] },
  { code: 'JOL', name: 'Joel', chapters: 3, aliases: ['jol', 'joe', 'jl'] },
  { code: 'AMO', name: 'Amos', chapters: 9, aliases: ['amo', 'am'] },
  { code: 'OBA', name: 'Obadiah', chapters: 1, aliases: ['obad', 'oba', 'ob'] },
  { code: 'JON', name: 'Jonah', chapters: 4, aliases: ['jon', 'jnh'] },
  { code: 'MIC', name: 'Micah', chapters: 7, aliases: ['mic', 'mc'] },
  { code: 'NAM', name: 'Nahum', chapters: 3, aliases: ['nah', 'nam', 'na'] },
  { code: 'HAB', name: 'Habakkuk', chapters: 3, aliases: ['hab', 'hb'] },
  { code: 'ZEP', name: 'Zephaniah', chapters: 3, aliases: ['zeph', 'zep', 'zp'] },
  { code: 'HAG', name: 'Haggai', chapters: 2, aliases: ['hag', 'hg'] },
  { code: 'ZEC', name: 'Zechariah', chapters: 14, aliases: ['zech', 'zec', 'zc'] },
  { code: 'MAL', name: 'Malachi', chapters: 4, aliases: ['mal', 'ml'] },
  { code: 'MAT', name: 'Matthew', chapters: 28, aliases: ['matt', 'mat', 'mt'] },
  { code: 'MRK', name: 'Mark', chapters: 16, aliases: ['mrk', 'mar', 'mk', 'mr'] },
  { code: 'LUK', name: 'Luke', chapters: 24, aliases: ['luk', 'lk'] },
  { code: 'JHN', name: 'John', chapters: 21, aliases: ['jhn', 'joh', 'jn'] },
  { code: 'ACT', name: 'Acts', chapters: 28, aliases: ['act', 'ac'] },
  { code: 'ROM', name: 'Romans', chapters: 16, aliases: ['rom', 'ro', 'rm'] },
  { code: '1CO', name: '1 Corinthians', chapters: 16, aliases: ['1cor', '1co', 'icorinthians', 'firstcorinthians'] },
  { code: '2CO', name: '2 Corinthians', chapters: 13, aliases: ['2cor', '2co', 'iicorinthians', 'secondcorinthians'] },
  { code: 'GAL', name: 'Galatians', chapters: 6, aliases: ['gal', 'ga'] },
  { code: 'EPH', name: 'Ephesians', chapters: 6, aliases: ['eph', 'ephes'] },
  { code: 'PHP', name: 'Philippians', chapters: 4, aliases: ['phil', 'php', 'philip'] },
  { code: 'COL', name: 'Colossians', chapters: 4, aliases: ['col'] },
  { code: '1TH', name: '1 Thessalonians', chapters: 5, aliases: ['1thess', '1th', '1thes', 'ithessalonians', 'firstthessalonians'] },
  { code: '2TH', name: '2 Thessalonians', chapters: 3, aliases: ['2thess', '2th', '2thes', 'iithessalonians', 'secondthessalonians'] },
  { code: '1TI', name: '1 Timothy', chapters: 6, aliases: ['1tim', '1ti', 'itimothy', 'firsttimothy'] },
  { code: '2TI', name: '2 Timothy', chapters: 4, aliases: ['2tim', '2ti', 'iitimothy', 'secondtimothy'] },
  { code: 'TIT', name: 'Titus', chapters: 3, aliases: ['tit', 'ti'] },
  { code: 'PHM', name: 'Philemon', chapters: 1, aliases: ['philem', 'phm', 'pm'] },
  { code: 'HEB', name: 'Hebrews', chapters: 13, aliases: ['heb'] },
  { code: 'JAS', name: 'James', chapters: 5, aliases: ['jas', 'jm'] },
  { code: '1PE', name: '1 Peter', chapters: 5, aliases: ['1pet', '1pe', '1pt', '1p', 'ipeter', 'firstpeter'] },
  { code: '2PE', name: '2 Peter', chapters: 3, aliases: ['2pet', '2pe', '2pt', '2p', 'iipeter', 'secondpeter'] },
  { code: '1JN', name: '1 John', chapters: 5, aliases: ['1jn', '1jhn', '1jo', '1joh', 'ijohn', 'firstjohn'] },
  { code: '2JN', name: '2 John', chapters: 1, aliases: ['2jn', '2jhn', '2jo', '2joh', 'iijohn', 'secondjohn'] },
  { code: '3JN', name: '3 John', chapters: 1, aliases: ['3jn', '3jhn', '3jo', '3joh', 'iiijohn', 'thirdjohn'] },
  { code: 'JUD', name: 'Jude', chapters: 1, aliases: ['jde'] },
  { code: 'REV', name: 'Revelation', chapters: 22, aliases: ['rev', 're', 'revelations', 'apocalypse'] },
];

/** Name used in a reference: "Psalm 23:1", but "Psalms" for the book itself. */
export function referenceBookName(book: BibleBook): string {
  return book.code === 'PSA' ? 'Psalm' : book.name;
}
