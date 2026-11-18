// Translations Biblica ships in full. Only texts we may redistribute
// whole: NIV, ESV, NLT, NASB and NKJV are copyrighted and need a
// publisher licence to bundle.
// Shared with scripts/build-bible.ts: keep it plain (erasable) TypeScript.

export const TRANSLATIONS = [
  {
    id: 'KJV',
    name: 'King James Version',
    blurb: 'The classic 1611 wording',
    language: 'en',
    license: 'Public domain',
    source: 'eng-kjv2006', // eBible.org translation id
  },
  {
    id: 'BSB',
    name: 'Berean Standard Bible',
    blurb: 'Modern and close to the original',
    language: 'en',
    license: 'Public domain',
    source: 'engbsb',
  },
  {
    id: 'WEB',
    name: 'World English Bible',
    blurb: 'Modern and easy to read',
    language: 'en',
    license: 'Public domain',
    source: 'engwebp',
  },
] as const;

export type Translation = (typeof TRANSLATIONS)[number]['id'];

export const DEFAULT_TRANSLATION: Translation = 'KJV';

/** Bump when the generated text changes, so cached copies are replaced. */
export const BIBLE_DATA_VERSION = 'v1';

export function isTranslation(value: unknown): value is Translation {
  return TRANSLATIONS.some((t) => t.id === value);
}

/** Older builds offered NIV/ESV/NLT/NASB/NKJV without text; fall back for those. */
export function toTranslation(value: unknown): Translation {
  return isTranslation(value) ? value : DEFAULT_TRANSLATION;
}
