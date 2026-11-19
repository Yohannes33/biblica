// Translations Biblica ships. Only texts we may redistribute: NIV, ESV, NLT,
// NASB and NKJV are copyrighted and need a publisher licence to bundle.
// Shared with scripts/build-bible.ts: keep it plain (erasable) TypeScript.

const AMHARIC_COPYRIGHT =
  'The New Testament in the Amharic language of Ethiopia, copyright © 1962, 2003 United Bible Societies. ' +
  'Revised Amharic Bible in XML (2003). Printed version by United Bible Societies (C)1962. ' +
  'E-Text in transliterated ASCII format by Lapsley/Brooks Foundation 1994. ' +
  'Unicode UTF-8 transformation and XML-tagging by Dirk Röckmann 2003 (www.nt-text.net). ' +
  'With kind permission of the Bible Society of Ethiopia. ' +
  'Every non-commercial work using this data in any form must fully include this copyright statement! ' +
  'Every commercial use of parts or the complete data in any form needs written permission of the Bible Society of Ethiopia!';

// The Old Testament comes from another source of the same 1962 Bible.
const AMHARIC_OLD_TESTAMENT_CREDIT =
  'The Old Testament is the 1962 Amharic Bible (the Haile Selassie Bible), text from WordProject.org (www.wordproject.org/bibles/am).';

export const TRANSLATIONS = [
  {
    id: 'KJV',
    label: 'KJV', // shown on the picker
    name: 'King James Version',
    blurb: 'The classic 1611 wording',
    language: 'en',
    newTestamentOnly: false,
    credit: 'Public domain.',
    source: 'eng-kjv2006', // eBible.org translation id
  },
  {
    id: 'BSB',
    label: 'BSB',
    name: 'Berean Standard Bible',
    blurb: 'Modern and close to the original',
    language: 'en',
    newTestamentOnly: false,
    credit: 'Public domain.',
    source: 'engbsb',
  },
  {
    id: 'WEB',
    label: 'WEB',
    name: 'World English Bible',
    blurb: 'Modern and easy to read',
    language: 'en',
    newTestamentOnly: false,
    credit: 'Public domain. “World English Bible” is a trademark of eBible.org.',
    source: 'engwebp',
  },
  {
    id: 'AMH',
    label: 'አማርኛ',
    name: 'Amharic Bible (1962)',
    blurb: 'Old and New Testaments',
    language: 'am',
    newTestamentOnly: false,
    // Free and non-commercial only: commercial use needs the Bible Society of
    // Ethiopia's written permission. The statement must appear in full.
    credit: `${AMHARIC_COPYRIGHT} ${AMHARIC_OLD_TESTAMENT_CREDIT}`,
    source: 'amh', // New Testament; the Old Testament is built from WordProject (scripts/build-bible.ts)
  },
] as const;

export type Translation = (typeof TRANSLATIONS)[number]['id'];
export type TranslationInfo = (typeof TRANSLATIONS)[number];

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

export function translationInfo(id: Translation): TranslationInfo {
  return TRANSLATIONS.find((t) => t.id === id)!;
}

/** Short name to show for a verse's translation ("አማርኛ" for AMH); old saved ids show as they are. */
export function translationLabel(translation: string): string {
  return isTranslation(translation) ? translationInfo(translation).label : translation;
}

/** BCP 47 language of a verse's translation; verses saved by older builds are English. */
export function languageOf(translation: string): 'en' | 'am' {
  return isTranslation(translation) ? translationInfo(translation).language : 'en';
}
