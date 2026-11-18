/** Declare one strings module. The Amharic object must have every English key. */
export function defineStrings<E extends Record<string, string>>(en: E, am: { [K in keyof E]: string }) {
  return { en, am };
}
