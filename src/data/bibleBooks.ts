// The 66-book Protestant canon in order, keyed by USFM book code.
// Shared by the app and scripts/build-bible.ts, so it must stay plain
// (erasable) TypeScript that Node can run without a build step.

export interface BibleBook {
  code: string; // USFM code, also the data file name: /bible/<version>/<TR>/<code>.json
  name: string;
  chapters: number;
  // Extra spellings accepted when typing a reference (lower case, no dots).
  aliases: string[];
  // Amharic citation name and other accepted spellings. Old Testament
  // aliases are the book titles in WordProject's 1962 Amharic Bible.
  am?: { name: string; aliases: string[] };
}

export const BIBLE_BOOKS: BibleBook[] = [
  { code: 'GEN', name: 'Genesis', chapters: 50, aliases: ['gen', 'ge', 'gn'], am: { name: 'ዘፍጥረት', aliases: ['ኦሪት ዘፍጥረት'] } },
  { code: 'EXO', name: 'Exodus', chapters: 40, aliases: ['exod', 'exo', 'ex'], am: { name: 'ዘጸአት', aliases: ['ኦሪት ዘጸአት'] } },
  { code: 'LEV', name: 'Leviticus', chapters: 27, aliases: ['lev', 'le', 'lv'], am: { name: 'ዘሌዋውያን', aliases: ['ኦሪት ዘሌዋውያን'] } },
  { code: 'NUM', name: 'Numbers', chapters: 36, aliases: ['num', 'nu', 'nm', 'nb'], am: { name: 'ዘኍልቍ', aliases: ['ኦሪት ዘኍልቍ', 'ዘኁልቁ'] } },
  { code: 'DEU', name: 'Deuteronomy', chapters: 34, aliases: ['deut', 'deu', 'de', 'dt'], am: { name: 'ዘዳግም', aliases: ['ኦሪት ዘዳግም'] } },
  { code: 'JOS', name: 'Joshua', chapters: 24, aliases: ['josh', 'jos', 'jsh'], am: { name: 'ኢያሱ', aliases: ['መጽሐፈ ኢያሱ ወልደ ነዌ'] } },
  { code: 'JDG', name: 'Judges', chapters: 21, aliases: ['judg', 'jdg', 'jg', 'jdgs'], am: { name: 'መሣፍንት', aliases: ['መጽሐፈ መሣፍንት', 'መሳፍንት'] } },
  { code: 'RUT', name: 'Ruth', chapters: 4, aliases: ['rth', 'ru', 'rut'], am: { name: 'ሩት', aliases: ['መጽሐፈ ሩት'] } },
  { code: '1SA', name: '1 Samuel', chapters: 31, aliases: ['1sam', '1sa', '1sm', '1s', 'isamuel', 'firstsamuel'], am: { name: '1ኛ ሳሙኤል', aliases: ['መጽሐፈ ሳሙኤል ቀዳማዊ'] } },
  { code: '2SA', name: '2 Samuel', chapters: 24, aliases: ['2sam', '2sa', '2sm', '2s', 'iisamuel', 'secondsamuel'], am: { name: '2ኛ ሳሙኤል', aliases: ['መጽሐፈ ሳሙኤል ካልዕ'] } },
  { code: '1KI', name: '1 Kings', chapters: 22, aliases: ['1kgs', '1ki', '1kin', '1k', 'ikings', 'firstkings'], am: { name: '1ኛ ነገሥት', aliases: ['መጽሐፈ ነገሥት ቀዳማዊ'] } },
  { code: '2KI', name: '2 Kings', chapters: 25, aliases: ['2kgs', '2ki', '2kin', '2k', 'iikings', 'secondkings'], am: { name: '2ኛ ነገሥት', aliases: ['መጽሐፈ ነገሥት ካልዕ'] } },
  { code: '1CH', name: '1 Chronicles', chapters: 29, aliases: ['1chr', '1ch', '1chron', 'ichronicles', 'firstchronicles'], am: { name: '1ኛ ዜና መዋዕል', aliases: ['መጽሐፈ ዜና መዋዕል ቀዳማዊ'] } },
  { code: '2CH', name: '2 Chronicles', chapters: 36, aliases: ['2chr', '2ch', '2chron', 'iichronicles', 'secondchronicles'], am: { name: '2ኛ ዜና መዋዕል', aliases: ['መጽሐፈ ዜና መዋዕል ካልዕ'] } },
  { code: 'EZR', name: 'Ezra', chapters: 10, aliases: ['ezr', 'ez'], am: { name: 'ዕዝራ', aliases: ['መጽሐፈ ዕዝራ'] } },
  { code: 'NEH', name: 'Nehemiah', chapters: 13, aliases: ['neh', 'ne'], am: { name: 'ነህምያ', aliases: ['መጽሐፈ ነህምያ'] } },
  { code: 'EST', name: 'Esther', chapters: 10, aliases: ['esth', 'est', 'es'], am: { name: 'አስቴር', aliases: ['መጽሐፈ አስቴር'] } },
  { code: 'JOB', name: 'Job', chapters: 42, aliases: ['jb'], am: { name: 'ኢዮብ', aliases: ['መጽሐፈ ኢዮብ'] } },
  { code: 'PSA', name: 'Psalms', chapters: 150, aliases: ['psalm', 'ps', 'psa', 'pss', 'psm'], am: { name: 'መዝሙር', aliases: ['መዝሙረ ዳዊት'] } },
  { code: 'PRO', name: 'Proverbs', chapters: 31, aliases: ['prov', 'pro', 'pr', 'prv'], am: { name: 'ምሳሌ', aliases: ['መጽሐፈ ምሳሌ'] } },
  { code: 'ECC', name: 'Ecclesiastes', chapters: 12, aliases: ['eccl', 'ecc', 'ec', 'eccles', 'qoh'], am: { name: 'መክብብ', aliases: ['መጽሐፈ መክብብ'] } },
  { code: 'SNG', name: 'Song of Solomon', chapters: 8, aliases: ['songofsongs', 'song', 'sng', 'sos', 'ss', 'canticles'], am: { name: 'መኃልየ መኃልይ', aliases: ['መኃልየ መኃልይ ዘሰሎሞን'] } },
  { code: 'ISA', name: 'Isaiah', chapters: 66, aliases: ['isa', 'is'], am: { name: 'ኢሳይያስ', aliases: ['ትንቢተ ኢሳይያስ'] } },
  { code: 'JER', name: 'Jeremiah', chapters: 52, aliases: ['jer', 'je', 'jr'], am: { name: 'ኤርምያስ', aliases: ['ትንቢተ ኤርምያስ'] } },
  { code: 'LAM', name: 'Lamentations', chapters: 5, aliases: ['lam', 'la'], am: { name: 'ሰቆቃው ኤርምያስ', aliases: ['ሰቆቃወ ኤርምያስ'] } },
  { code: 'EZK', name: 'Ezekiel', chapters: 48, aliases: ['ezek', 'ezk', 'eze'], am: { name: 'ሕዝቅኤል', aliases: ['ትንቢተ ሕዝቅኤል'] } },
  { code: 'DAN', name: 'Daniel', chapters: 12, aliases: ['dan', 'da', 'dn'], am: { name: 'ዳንኤል', aliases: ['ትንቢተ ዳንኤል'] } },
  { code: 'HOS', name: 'Hosea', chapters: 14, aliases: ['hos', 'ho'], am: { name: 'ሆሴዕ', aliases: ['ትንቢተ ሆሴዕ'] } },
  { code: 'JOL', name: 'Joel', chapters: 3, aliases: ['jol', 'joe', 'jl'], am: { name: 'ኢዮኤል', aliases: ['ትንቢተ ኢዮኤል'] } },
  { code: 'AMO', name: 'Amos', chapters: 9, aliases: ['amo', 'am'], am: { name: 'አሞጽ', aliases: ['ትንቢተ አሞጽ'] } },
  { code: 'OBA', name: 'Obadiah', chapters: 1, aliases: ['obad', 'oba', 'ob'], am: { name: 'አብድዩ', aliases: ['ትንቢተ አብድዩ'] } },
  { code: 'JON', name: 'Jonah', chapters: 4, aliases: ['jon', 'jnh'], am: { name: 'ዮናስ', aliases: ['ትንቢተ ዮናስ'] } },
  { code: 'MIC', name: 'Micah', chapters: 7, aliases: ['mic', 'mc'], am: { name: 'ሚክያስ', aliases: ['ትንቢተ ሚክያስ'] } },
  { code: 'NAM', name: 'Nahum', chapters: 3, aliases: ['nah', 'nam', 'na'], am: { name: 'ናሆም', aliases: ['ትንቢተ ናሆም'] } },
  { code: 'HAB', name: 'Habakkuk', chapters: 3, aliases: ['hab', 'hb'], am: { name: 'ዕንባቆም', aliases: ['ትንቢተ ዕንባቆም'] } },
  { code: 'ZEP', name: 'Zephaniah', chapters: 3, aliases: ['zeph', 'zep', 'zp'], am: { name: 'ሶፎንያስ', aliases: ['ትንቢተ ሶፎንያስ'] } },
  { code: 'HAG', name: 'Haggai', chapters: 2, aliases: ['hag', 'hg'], am: { name: 'ሐጌ', aliases: ['ትንቢተ ሐጌ'] } },
  { code: 'ZEC', name: 'Zechariah', chapters: 14, aliases: ['zech', 'zec', 'zc'], am: { name: 'ዘካርያስ', aliases: ['ትንቢተ ዘካርያስ'] } },
  { code: 'MAL', name: 'Malachi', chapters: 4, aliases: ['mal', 'ml'], am: { name: 'ሚልክያስ', aliases: ['ትንቢተ ሚልክያ', 'ሚልክያ'] } },
  { code: 'MAT', name: 'Matthew', chapters: 28, aliases: ['matt', 'mat', 'mt'], am: { name: 'ማቴዎስ', aliases: ['የማቴዎስ ወንጌል'] } },
  { code: 'MRK', name: 'Mark', chapters: 16, aliases: ['mrk', 'mar', 'mk', 'mr'], am: { name: 'ማርቆስ', aliases: ['የማርቆስ ወንጌል'] } },
  { code: 'LUK', name: 'Luke', chapters: 24, aliases: ['luk', 'lk'], am: { name: 'ሉቃስ', aliases: ['የሉቃስ ወንጌል'] } },
  { code: 'JHN', name: 'John', chapters: 21, aliases: ['jhn', 'joh', 'jn'], am: { name: 'ዮሐንስ', aliases: ['የዮሐንስ ወንጌል'] } },
  { code: 'ACT', name: 'Acts', chapters: 28, aliases: ['act', 'ac'], am: { name: 'ሐዋርያት ሥራ', aliases: ['የሐዋርያት ሥራ'] } },
  { code: 'ROM', name: 'Romans', chapters: 16, aliases: ['rom', 'ro', 'rm'], am: { name: 'ሮሜ', aliases: ['ወደ ሮሜ ሰዎች'] } },
  { code: '1CO', name: '1 Corinthians', chapters: 16, aliases: ['1cor', '1co', 'icorinthians', 'firstcorinthians'], am: { name: '1ኛ ቆሮንቶስ', aliases: ['1ኛ ወደ ቆሮንቶስ ሰዎች'] } },
  { code: '2CO', name: '2 Corinthians', chapters: 13, aliases: ['2cor', '2co', 'iicorinthians', 'secondcorinthians'], am: { name: '2ኛ ቆሮንቶስ', aliases: ['2ኛ ወደ ቆሮንቶስ ሰዎች'] } },
  { code: 'GAL', name: 'Galatians', chapters: 6, aliases: ['gal', 'ga'], am: { name: 'ገላትያ', aliases: ['ወደ ገላትያ ሰዎች'] } },
  { code: 'EPH', name: 'Ephesians', chapters: 6, aliases: ['eph', 'ephes'], am: { name: 'ኤፌሶን', aliases: ['ወደ ኤፌሶን ሰዎች'] } },
  { code: 'PHP', name: 'Philippians', chapters: 4, aliases: ['phil', 'php', 'philip'], am: { name: 'ፊልጵስዩስ', aliases: ['ወደ ፊልጵስዩስ ሰዎች'] } },
  { code: 'COL', name: 'Colossians', chapters: 4, aliases: ['col'], am: { name: 'ቆላስይስ', aliases: ['ወደ ቆላስይስ ሰዎች'] } },
  { code: '1TH', name: '1 Thessalonians', chapters: 5, aliases: ['1thess', '1th', '1thes', 'ithessalonians', 'firstthessalonians'], am: { name: '1ኛ ተሰሎንቄ', aliases: ['1ኛ ወደ ተሰሎንቄ ሰዎች'] } },
  { code: '2TH', name: '2 Thessalonians', chapters: 3, aliases: ['2thess', '2th', '2thes', 'iithessalonians', 'secondthessalonians'], am: { name: '2ኛ ተሰሎንቄ', aliases: ['2ኛ ወደ ተሰሎንቄ ሰዎች'] } },
  { code: '1TI', name: '1 Timothy', chapters: 6, aliases: ['1tim', '1ti', 'itimothy', 'firsttimothy'], am: { name: '1ኛ ጢሞቴዎስ', aliases: ['1ኛ ወደ ጢሞቴዎስ'] } },
  { code: '2TI', name: '2 Timothy', chapters: 4, aliases: ['2tim', '2ti', 'iitimothy', 'secondtimothy'], am: { name: '2ኛ ጢሞቴዎስ', aliases: ['2ኛ ወደ ጢሞቴዎስ'] } },
  { code: 'TIT', name: 'Titus', chapters: 3, aliases: ['tit', 'ti'], am: { name: 'ቲቶ', aliases: ['ወደ ቲቶ'] } },
  { code: 'PHM', name: 'Philemon', chapters: 1, aliases: ['philem', 'phm', 'pm'], am: { name: 'ፊልሞና', aliases: ['ወደ ፊልሞና'] } },
  { code: 'HEB', name: 'Hebrews', chapters: 13, aliases: ['heb'], am: { name: 'ዕብራውያን', aliases: ['ወደ ዕብራውያን'] } },
  { code: 'JAS', name: 'James', chapters: 5, aliases: ['jas', 'jm'], am: { name: 'ያዕቆብ', aliases: ['የያዕቆብ መልእክት'] } },
  { code: '1PE', name: '1 Peter', chapters: 5, aliases: ['1pet', '1pe', '1pt', '1p', 'ipeter', 'firstpeter'], am: { name: '1ኛ ጴጥሮስ', aliases: ['1ኛ የጴጥሮስ መልእክት'] } },
  { code: '2PE', name: '2 Peter', chapters: 3, aliases: ['2pet', '2pe', '2pt', '2p', 'iipeter', 'secondpeter'], am: { name: '2ኛ ጴጥሮስ', aliases: ['2ኛ የጴጥሮስ መልእክት'] } },
  { code: '1JN', name: '1 John', chapters: 5, aliases: ['1jn', '1jhn', '1jo', '1joh', 'ijohn', 'firstjohn'], am: { name: '1ኛ ዮሐንስ', aliases: ['1ኛ የዮሐንስ መልእክት'] } },
  { code: '2JN', name: '2 John', chapters: 1, aliases: ['2jn', '2jhn', '2jo', '2joh', 'iijohn', 'secondjohn'], am: { name: '2ኛ ዮሐንስ', aliases: ['2ኛ የዮሐንስ መልእክት'] } },
  { code: '3JN', name: '3 John', chapters: 1, aliases: ['3jn', '3jhn', '3jo', '3joh', 'iiijohn', 'thirdjohn'], am: { name: '3ኛ ዮሐንስ', aliases: ['3ኛ የዮሐንስ መልእክት'] } },
  { code: 'JUD', name: 'Jude', chapters: 1, aliases: ['jde'], am: { name: 'ይሁዳ', aliases: ['የይሁዳ መልእክት'] } },
  { code: 'REV', name: 'Revelation', chapters: 22, aliases: ['rev', 're', 'revelations', 'apocalypse'], am: { name: 'ራእይ', aliases: ['የዮሐንስ ራእይ'] } },
];

/** Matthew onwards. */
export function isNewTestament(book: BibleBook): boolean {
  return BIBLE_BOOKS.indexOf(book) >= BIBLE_BOOKS.findIndex((b) => b.code === 'MAT');
}

/** Name used in a reference: "Psalm 23:1", but "Psalms" for the book itself; "ዮሐንስ 3:16" in Amharic. */
export function referenceBookName(book: BibleBook, language: 'en' | 'am' = 'en'): string {
  if (language === 'am' && book.am) return book.am.name;
  return book.code === 'PSA' ? 'Psalm' : book.name;
}
