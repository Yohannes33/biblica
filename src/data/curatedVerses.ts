// The built-in library: which passages ship with the app, not their text.
// The text for each translation is generated into curatedText.json by
// scripts/build-bible.ts, so these verses follow the reader's translation.
// Shared with that script: keep it plain (erasable) TypeScript.

export interface CuratedVerse {
  id: string; // stable: verse progress is keyed by it, never rename one
  book: string; // USFM code from bibleBooks.ts
  chapter: number;
  verses: string; // "16" or "1-2"
  category:
    | 'Essential Classics'
    | 'Peace & Anxiety'
    | 'Strength & Courage'
    | 'Love & Kindness'
    | 'Faith & Salvation'
    | 'Wisdom & Guidance'
    | 'Hope & Comfort';
  tags: string[];
  // Only in libraries of this language: a stand-in for built-in verses that
  // language's Bible lacked (the Amharic one had no Old Testament at first).
  language?: 'am';
}

export const CURATED_VERSES: CuratedVerse[] = [
  { id: 'john-3-16', book: 'JHN', chapter: 3, verses: '16', category: 'Essential Classics', tags: ['salvation', 'love', 'faith'] },
  { id: 'phil-4-13', book: 'PHP', chapter: 4, verses: '13', category: 'Strength & Courage', tags: ['strength', 'courage', 'perseverance'] },
  { id: 'psalm-23-1', book: 'PSA', chapter: 23, verses: '1-2', category: 'Peace & Anxiety', tags: ['peace', 'comfort', 'shepherd'] },
  { id: 'prov-3-5-6', book: 'PRO', chapter: 3, verses: '5-6', category: 'Wisdom & Guidance', tags: ['trust', 'guidance', 'wisdom'] },
  { id: 'rom-8-28', book: 'ROM', chapter: 8, verses: '28', category: 'Hope & Comfort', tags: ['hope', 'purpose', 'faith'] },
  { id: 'isa-40-31', book: 'ISA', chapter: 40, verses: '31', category: 'Strength & Courage', tags: ['strength', 'renewal', 'patience'] },
  { id: 'josh-1-9', book: 'JOS', chapter: 1, verses: '9', category: 'Strength & Courage', tags: ['courage', 'faith', 'presence'] },
  { id: 'phil-4-6-7', book: 'PHP', chapter: 4, verses: '6-7', category: 'Peace & Anxiety', tags: ['peace', 'prayer', 'anxiety'] },
  // The id says 4-7 but the passage has always been verse 4 alone; keep it.
  { id: '1cor-13-4-7', book: '1CO', chapter: 13, verses: '4', category: 'Love & Kindness', tags: ['love', 'kindness', 'patience'] },
  { id: 'psalm-119-105', book: 'PSA', chapter: 119, verses: '105', category: 'Wisdom & Guidance', tags: ['word', 'light', 'guidance'] },
  { id: 'eph-2-8-9', book: 'EPH', chapter: 2, verses: '8-9', category: 'Faith & Salvation', tags: ['grace', 'faith', 'salvation'] },
  { id: 'matt-11-28', book: 'MAT', chapter: 11, verses: '28', category: 'Hope & Comfort', tags: ['rest', 'comfort', 'peace'] },
  { id: 'john-14-6', book: 'JHN', chapter: 14, verses: '6', category: 'Essential Classics', tags: ['jesus', 'truth', 'salvation'] },
  { id: 'gen-1-1', book: 'GEN', chapter: 1, verses: '1', category: 'Essential Classics', tags: ['creation', 'beginning'] },
  { id: 'john-14-27', book: 'JHN', chapter: 14, verses: '27', category: 'Peace & Anxiety', tags: ['peace', 'fear'] },
  { id: '1pet-5-7', book: '1PE', chapter: 5, verses: '7', category: 'Peace & Anxiety', tags: ['anxiety', 'care'] },
  { id: 'psalm-46-1', book: 'PSA', chapter: 46, verses: '1', category: 'Strength & Courage', tags: ['refuge', 'strength'] },
  { id: 'isa-41-10', book: 'ISA', chapter: 41, verses: '10', category: 'Strength & Courage', tags: ['fear', 'strength'] },
  { id: 'deut-31-6', book: 'DEU', chapter: 31, verses: '6', category: 'Strength & Courage', tags: ['courage', 'faithfulness'] },
  { id: '1john-4-19', book: '1JN', chapter: 4, verses: '19', category: 'Love & Kindness', tags: ['love'] },
  { id: 'gal-5-22-23', book: 'GAL', chapter: 5, verses: '22-23', category: 'Love & Kindness', tags: ['spirit', 'fruit', 'character'] },
  { id: 'heb-11-1', book: 'HEB', chapter: 11, verses: '1', category: 'Faith & Salvation', tags: ['faith', 'hope'] },
  { id: 'rom-10-9', book: 'ROM', chapter: 10, verses: '9', category: 'Faith & Salvation', tags: ['salvation', 'confession'] },
  { id: 'matt-6-33', book: 'MAT', chapter: 6, verses: '33', category: 'Faith & Salvation', tags: ['kingdom', 'priorities'] },
  { id: 'rom-12-2', book: 'ROM', chapter: 12, verses: '2', category: 'Wisdom & Guidance', tags: ['mind', 'transformation'] },
  { id: 'james-1-5', book: 'JAS', chapter: 1, verses: '5', category: 'Wisdom & Guidance', tags: ['wisdom', 'prayer'] },
  { id: 'micah-6-8', book: 'MIC', chapter: 6, verses: '8', category: 'Wisdom & Guidance', tags: ['justice', 'mercy', 'humility'] },
  { id: 'jer-29-11', book: 'JER', chapter: 29, verses: '11', category: 'Hope & Comfort', tags: ['hope', 'future'] },
  { id: 'lam-3-22-23', book: 'LAM', chapter: 3, verses: '22-23', category: 'Hope & Comfort', tags: ['mercy', 'faithfulness'] },
  { id: 'psalm-34-8', book: 'PSA', chapter: 34, verses: '8', category: 'Hope & Comfort', tags: ['goodness', 'trust'] },

  // Amharic stand-ins, one per verse above the Amharic Bible couldn't supply
  // when it was New Testament only, in the same category. Kept now that it
  // has the Old Testament too: progress is keyed by these ids.
  { id: 'john-1-1', book: 'JHN', chapter: 1, verses: '1', category: 'Essential Classics', tags: ['word', 'beginning'], language: 'am' },
  { id: 'rom-6-23', book: 'ROM', chapter: 6, verses: '23', category: 'Essential Classics', tags: ['salvation', 'gift'], language: 'am' },
  { id: 'john-14-1', book: 'JHN', chapter: 14, verses: '1', category: 'Peace & Anxiety', tags: ['peace', 'trust'], language: 'am' },
  { id: 'matt-7-7', book: 'MAT', chapter: 7, verses: '7', category: 'Wisdom & Guidance', tags: ['prayer', 'seeking'], language: 'am' },
  { id: 'james-1-22', book: 'JAS', chapter: 1, verses: '22', category: 'Wisdom & Guidance', tags: ['word', 'obedience'], language: 'am' },
  { id: 'john-8-32', book: 'JHN', chapter: 8, verses: '32', category: 'Wisdom & Guidance', tags: ['truth', 'freedom'], language: 'am' },
  { id: '2tim-1-7', book: '2TI', chapter: 1, verses: '7', category: 'Strength & Courage', tags: ['fear', 'power'], language: 'am' },
  { id: 'eph-6-10', book: 'EPH', chapter: 6, verses: '10', category: 'Strength & Courage', tags: ['strength'], language: 'am' },
  { id: '1cor-16-13', book: '1CO', chapter: 16, verses: '13', category: 'Strength & Courage', tags: ['courage', 'faith'], language: 'am' },
  { id: 'rom-8-31', book: 'ROM', chapter: 8, verses: '31', category: 'Strength & Courage', tags: ['confidence'], language: 'am' },
  { id: 'rom-8-37', book: 'ROM', chapter: 8, verses: '37', category: 'Strength & Courage', tags: ['victory', 'love'], language: 'am' },
  { id: 'rom-5-8', book: 'ROM', chapter: 5, verses: '8', category: 'Faith & Salvation', tags: ['grace', 'love'], language: 'am' },
  { id: 'rom-15-13', book: 'ROM', chapter: 15, verses: '13', category: 'Hope & Comfort', tags: ['hope', 'joy'], language: 'am' },
  { id: 'rev-21-4', book: 'REV', chapter: 21, verses: '4', category: 'Hope & Comfort', tags: ['comfort', 'future'], language: 'am' },
  { id: 'matt-5-4', book: 'MAT', chapter: 5, verses: '4', category: 'Hope & Comfort', tags: ['comfort', 'grief'], language: 'am' },
];
