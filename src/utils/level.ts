import { translate, type Lang } from '../i18n';

// Mirrors StorageService.addXP: level = floor(sqrt(xp / 40)) + 1,
// so level L starts at 40 * (L - 1)^2 XP.
const xpForLevel = (level: number) => 40 * (level - 1) ** 2;

export function getLevelProgress(xp: number, level: number) {
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = Math.max(0, xp - start);
  const span = next - start;
  return {
    into,
    span,
    toNext: Math.max(0, next - xp),
    percent: Math.min(100, Math.round((into / span) * 100)),
  };
}

export function getLevelTitle(level: number, lang: Lang = 'en') {
  if (level >= 10) return translate(lang, 'level.scholar');
  if (level >= 7) return translate(lang, 'level.disciple');
  if (level >= 5) return translate(lang, 'level.memorizer');
  if (level >= 3) return translate(lang, 'level.seeker');
  return translate(lang, 'level.pilgrim');
}
