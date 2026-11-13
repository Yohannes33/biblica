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

export function getLevelTitle(level: number) {
  if (level >= 10) return 'Theological Scholar';
  if (level >= 7) return 'Scripture Disciple';
  if (level >= 5) return 'Faith Memorizer';
  if (level >= 3) return 'Seeker of Truth';
  return 'Devoted Pilgrim';
}
