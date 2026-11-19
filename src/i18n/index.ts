import { createContext, useContext } from 'react';
import { common } from './common';
import { app } from './app';
import { library } from './library';
import { practice } from './practice';

// By default the interface speaks the language of the reader's Bible: Amharic
// when they pick አማርኛ, English otherwise. The App language setting can pin it
// to English or Amharic instead (appLanguageOf). Verse text always stays in its
// Bible's language and carries its own lang attribute. Strings live in ./common, ./app, ./library and
// ./practice, English and Amharic side by side, so a native reader can check
// the Amharic in one place. The Amharic is a draft until one has.

export type Lang = 'en' | 'am';

/** The App language setting: follow the Bible's language, or a fixed one. */
export type AppLanguage = 'match' | Lang;
export const APP_LANGUAGES: readonly AppLanguage[] = ['match', 'en', 'am'];

/** Profiles saved before the setting existed (or with a value we don't know) match the Bible. */
export function toAppLanguage(value: unknown): AppLanguage {
  return APP_LANGUAGES.includes(value as AppLanguage) ? (value as AppLanguage) : 'match';
}

/** The interface language for a setting, given the language of the reader's Bible. */
export function appLanguageOf(setting: AppLanguage | undefined, bibleLang: Lang): Lang {
  return setting === 'en' || setting === 'am' ? setting : bibleLang;
}

const DICTIONARIES = {
  en: { ...common.en, ...app.en, ...library.en, ...practice.en },
  am: { ...common.am, ...app.am, ...library.am, ...practice.am },
};

export type StringKey = keyof typeof DICTIONARIES.en;
export type Vars = Record<string, string | number>;

/** "Verse {n}" + { n: 3 } -> "Verse 3". Unknown placeholders stay visible, so a missing var is easy to spot. */
export function translate(lang: Lang, key: StringKey, vars?: Vars): string {
  const text: string | undefined = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key];
  if (text === undefined) return key; // a missing key shows itself instead of crashing
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}

/**
 * Count-dependent text: uses `${key}_one` for 1 and `${key}_other` otherwise,
 * with {n} filled in. Amharic needs no plural forms here, but keeps both keys.
 */
export function translateCount(lang: Lang, key: string, n: number, vars?: Vars): string {
  return translate(lang, `${key}_${n === 1 ? 'one' : 'other'}` as StringKey, { n, ...vars });
}

/** A verse category's name; one not in the list (e.g. from an old cloud row) shows as stored. */
export function translateCategory(lang: Lang, category: string): string {
  const key = `category.${category}`;
  return key in DICTIONARIES.en ? translate(lang, key as StringKey) : category;
}

/** Everyone starts as "Pilgrim" (storage.ts); show that default in the interface language. */
export function displayName(name: string, lang: Lang): string {
  return name === 'Pilgrim' ? translate(lang, 'app.defaultName') : name;
}

const LanguageContext = createContext<Lang>('en');
export const LanguageProvider = LanguageContext.Provider;

/** The interface language. */
export function useLang(): Lang {
  return useContext(LanguageContext);
}

/** `const t = useT(); t('library.title')`, `t.count('library.verses', 3)`. */
export function useT() {
  const lang = useLang();
  return Object.assign((key: StringKey, vars?: Vars) => translate(lang, key, vars), {
    count: (key: string, n: number, vars?: Vars) => translateCount(lang, key, n, vars),
    lang,
  });
}
