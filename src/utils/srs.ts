import type { Verse, VerseProgress } from '../types/verse';

/**
 * Spaced repetition, SM-2 style (the scheme Anki grew from). Each rating sets
 * when a verse comes back: the better you knew it, the longer the gap, and
 * the gap keeps growing while you keep remembering it. Due dates are whole
 * local days, so "due today" means any time today.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// setDate keeps local midnight across daylight-saving changes.
const addDays = (dayStart: number, days: number) => {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + days);
  return d.getTime();
};

const endOfToday = (now: number) => addDays(startOfDay(now), 1) - 1;

/** Days until the next review for a rating (0 = again, later this session). */
export function nextInterval(p: VerseProgress | undefined, rating: Rating): number {
  const reps = p?.srsReps ?? 0;
  const ivl = p?.srsInterval ?? 0;
  const ease = p?.srsEase ?? DEFAULT_EASE;
  switch (rating) {
    case 'again':
      return 0;
    case 'hard':
      return reps === 0 ? 1 : Math.max(ivl + 1, Math.round(ivl * 1.2));
    case 'good':
      return reps === 0 ? 2 : Math.max(ivl + 1, Math.round(ivl * ease));
    case 'easy':
      return reps === 0 ? 4 : Math.max(ivl + 2, Math.round(ivl * ease * 1.3));
  }
}

/** Mastery moves with the rating, so "Again" no longer counts as remembered. */
export const MASTERY_DELTA: Record<Rating, number> = { again: -10, hard: 5, good: 12, easy: 20 };

/** The scheduling fields after rating a card. */
export function schedule(p: VerseProgress | undefined, rating: Rating, now = Date.now()): Partial<VerseProgress> {
  const ease = p?.srsEase ?? DEFAULT_EASE;
  const interval = nextInterval(p, rating);
  const easeDelta = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }[rating];
  return {
    srsInterval: interval,
    srsEase: Math.max(MIN_EASE, +(ease + easeDelta).toFixed(2)),
    srsReps: rating === 'again' ? 0 : (p?.srsReps ?? 0) + 1,
    srsLapses: (p?.srsLapses ?? 0) + (rating === 'again' ? 1 : 0),
    srsDue: addDays(startOfDay(now), interval),
    srsIntroduced: p?.srsIntroduced ?? now,
  };
}

export const isNewCard = (p: VerseProgress | undefined) => p?.srsDue === undefined;
export const isDue = (p: VerseProgress | undefined, now = Date.now()) =>
  p?.srsDue !== undefined && p.srsDue <= endOfToday(now);

/**
 * Today's review queue: cards already due (oldest first), then new cards up
 * to the daily goal, minus new cards already started today.
 */
export function buildReviewQueue(
  verses: Verse[],
  progress: Record<string, VerseProgress>,
  dailyNew: number,
  now = Date.now()
) {
  const due = verses
    .filter((v) => isDue(progress[v.id], now))
    .sort((a, b) => (progress[a.id].srsDue ?? 0) - (progress[b.id].srsDue ?? 0));
  const today = startOfDay(now);
  // Only count verses still in the library (a deleted custom verse keeps its progress row).
  const startedToday = verses.filter((v) => (progress[v.id]?.srsIntroduced ?? 0) >= today).length;
  const newLimit = Math.max(0, dailyNew - startedToday);
  const fresh = verses.filter((v) => isNewCard(progress[v.id])).slice(0, newLimit);
  return { ids: [...due.map((v) => v.id), ...fresh.map((v) => v.id)], dueCount: due.length, newCount: fresh.length };
}

/** When the next card after today comes due, for the "all caught up" screen. */
export function nextDueAfterToday(verses: Verse[], progress: Record<string, VerseProgress>, now = Date.now()) {
  const tomorrow = endOfToday(now) + 1;
  const dues = verses
    .map((v) => progress[v.id]?.srsDue)
    .filter((d): d is number => d !== undefined && d >= tomorrow);
  if (!dues.length) return null;
  const first = Math.min(...dues);
  return { at: first, count: dues.filter((d) => d === first).length };
}

export function formatInterval(days: number) {
  if (days <= 0) return 'Later today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? '1 month' : `${months} months`;
}

export function formatDueDate(at: number, now = Date.now()) {
  const days = Math.round((startOfDay(at) - startOfDay(now)) / 86_400_000);
  if (days <= 1) return 'tomorrow';
  if (days < 7) return new Date(at).toLocaleDateString(undefined, { weekday: 'long' });
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SCHEDULE_KEYS = ['srsDue', 'srsInterval', 'srsEase', 'srsReps', 'srsLapses', 'srsIntroduced'] as const;

/**
 * Merge cloud progress into local progress instead of replacing it, so the
 * review schedule survives sync. Basic fields keep their old behaviour (cloud
 * wins). The schedule is taken from the cloud only when this device has none,
 * or the cloud row was practised at least as recently as the local one, so an
 * older cloud schedule can't overwrite a newer one made on this device.
 */
export function mergeProgress(
  local: Record<string, VerseProgress>,
  remote: Record<string, VerseProgress> | undefined
): Record<string, VerseProgress> {
  if (!remote) return local;
  const merged: Record<string, VerseProgress> = { ...local };
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id];
    const defined = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== null));
    const remoteScheduleWins = !l || l.srsDue === undefined || (r.lastPracticed ?? 0) >= (l.lastPracticed ?? 0);
    if (!remoteScheduleWins) for (const k of SCHEDULE_KEYS) delete defined[k];
    merged[id] = { ...l, ...defined } as VerseProgress;
  }
  return merged;
}
