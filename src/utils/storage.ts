import { curatedVerses, FIRST_VERSE_ID } from '../data/initialVerses';
import { CURATED_VERSES } from '../data/curatedVerses';
import { DEFAULT_TRANSLATION, toTranslation, type Translation } from '../data/translations';
import type { UserProfile, UserStats, Verse, VerseProgress } from '../types/verse';
import { MASTERY_DELTA, schedule, type Rating } from './srs';

const STORAGE_KEYS = {
  VERSES: 'biblica_verses_v1',
  PROGRESS: 'biblica_progress_v1',
  STATS: 'biblica_stats_v1',
  PROFILE: 'biblica_profile_v1',
  TRIVIA: 'biblica_trivia_settings_v1',
};

/** The reader's last trivia round setup. Device-local, like the other prefs here. */
export interface TriviaSettings {
  questionCount: number;
  secondsPerQuestion: number;
}

const STAND_IN_IDS = new Set(CURATED_VERSES.filter((v) => v.language).map((v) => v.id));

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  quizzesCompleted: 0,
  cardsReviewed: 0,
  clozeCompleted: 0,
  scramblesCompleted: 0,
  soundEnabled: true,
  activeVerseId: FIRST_VERSE_ID,
  selectedCategory: 'All',
  theme: 'light',
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Pilgrim',
  email: 'pilgrim@biblica.app',
  preferredTranslation: DEFAULT_TRANSLATION,
  dailyGoalVerses: 3,
  theme: 'light',
  joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  onboarded: false,
};

export const StorageService = {
  /**
   * The library in the reader's translation: the user's own verses (newest
   * first, as saved), then the built-in verses this translation has, rebuilt
   * from the bundled text so they follow the translation and pick up text
   * corrections. Nothing reorders verses, so built-ins need no saved order,
   * and ones a translation lacks (Old Testament in Amharic) simply return
   * when the reader switches back.
   */
  getVerses: (translation: Translation): Verse[] => {
    const curated = curatedVerses(translation);
    let stored: Verse[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VERSES);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) stored = parsed;
    } catch (e) {
      console.error('Failed to read verses from localStorage', e);
    }
    const custom = stored.filter((v) => v?.isCustom);
    // An Amharic stand-in the reader had already added themselves stays theirs,
    // without a second copy. Only stand-ins: they are new, so no progress is lost.
    const added = new Set(custom.map((v) => `${v.translation} ${v.reference}`));
    const verses = [
      ...custom,
      ...curated.filter((v) => !(STAND_IN_IDS.has(v.id) && added.has(`${v.translation} ${v.reference}`))),
    ];
    StorageService.saveVerses(verses);
    return verses;
  },

  saveVerses: (verses: Verse[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.VERSES, JSON.stringify(verses));
    } catch (e) {
      console.error('Failed to save verses', e);
    }
  },

  addCustomVerse: (newVerse: Omit<Verse, 'id' | 'isCustom'>, translation: Translation): Verse => {
    const verses = StorageService.getVerses(translation);
    const id = `custom-${Date.now()}`;
    const verse: Verse = {
      ...newVerse,
      id,
      isCustom: true
    };
    verses.unshift(verse);
    StorageService.saveVerses(verses);
    return verse;
  },

  getProgressMap: (): Record<string, VerseProgress> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read progress', e);
    }
    return {};
  },

  saveProgress: (verseId: string, deltaCorrect: boolean, xpGained: number): { stats: UserStats; progress: VerseProgress } => {
    const progressMap = StorageService.getProgressMap();
    const current = progressMap[verseId] || {
      verseId,
      masteryScore: 0,
      timesPracticed: 0,
      correctAnswers: 0,
      lastPracticed: Date.now(),
      clozeStage: 1
    };

    current.timesPracticed += 1;
    if (deltaCorrect) {
      current.correctAnswers += 1;
      current.masteryScore = Math.min(100, current.masteryScore + 15);
      if (current.clozeStage < 5) {
        current.clozeStage += 1;
      }
    } else {
      current.masteryScore = Math.max(0, current.masteryScore - 5);
    }
    current.lastPracticed = Date.now();
    progressMap[verseId] = current;

    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
    } catch (e) {
      console.error('Failed to save progress map', e);
    }

    const stats = StorageService.addXP(xpGained);
    return { stats, progress: current };
  },

  /** Rate a flashcard: reschedule it, move mastery by the rating, award XP. */
  reviewCard: (verseId: string, rating: Rating, xpGained: number): { stats: UserStats; progress: VerseProgress } => {
    const progressMap = StorageService.getProgressMap();
    const now = Date.now();
    const prev = progressMap[verseId];
    const base: VerseProgress = prev ?? {
      verseId,
      masteryScore: 0,
      timesPracticed: 0,
      correctAnswers: 0,
      clozeStage: 1,
      lastPracticed: now,
    };
    const current: VerseProgress = { ...base, ...schedule(prev, rating, now), lastPracticed: now };
    current.timesPracticed += 1;
    if (rating !== 'again') current.correctAnswers += 1;
    current.masteryScore = Math.min(100, Math.max(0, current.masteryScore + MASTERY_DELTA[rating]));
    progressMap[verseId] = current;

    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
    } catch (e) {
      console.error('Failed to save progress map', e);
    }

    const stats = StorageService.addXP(xpGained);
    stats.cardsReviewed = (stats.cardsReviewed || 0) + 1;
    StorageService.saveStats(stats);
    return { stats, progress: current };
  },

  getStats: (): UserStats => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      if (stored) {
        const stats = JSON.parse(stored) as UserStats;
        const today = new Date().toISOString().split('T')[0];
        if (stats.lastActiveDate !== today) {
          const lastDate = new Date(stats.lastActiveDate);
          const currentDate = new Date(today);
          const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          
          if (diffDays === 1) {
            stats.streakDays += 1;
          } else if (diffDays > 1) {
            stats.streakDays = 1;
          }
          stats.lastActiveDate = today;
          StorageService.saveStats(stats);
        }
        if (!stats.theme) {
          stats.theme = 'light';
        }
        return stats;
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
    StorageService.saveStats(DEFAULT_STATS);
    return DEFAULT_STATS;
  },

  saveStats: (stats: UserStats): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save stats', e);
    }
  },

  getProfile: (): UserProfile => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        const profile: UserProfile = JSON.parse(stored);
        return { ...profile, preferredTranslation: toTranslation(profile.preferredTranslation) };
      }
    } catch (e) {
      console.error('Failed to read profile', e);
    }
    StorageService.saveProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  },

  /** Show first-run setup? Profiles saved before it existed get it only if nothing was ever practised. */
  needsOnboarding: (profile: UserProfile): boolean => {
    if (profile.onboarded !== undefined) return !profile.onboarded;
    let hasCustom = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.VERSES) || '[]');
      hasCustom = Array.isArray(saved) && saved.some((v) => v?.isCustom);
    } catch {
      // unreadable list: treat as empty
    }
    return Object.keys(StorageService.getProgressMap()).length === 0 && !StorageService.getStats().xp && !hasCustom;
  },

  saveProfile: (profile: UserProfile): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  },

  /** Last trivia choice, or null when none was saved or it is unreadable. Callers snap it to their presets. */
  getTriviaSettings: (): TriviaSettings | null => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIVIA) || 'null');
      if (Number.isInteger(parsed?.questionCount) && Number.isInteger(parsed?.secondsPerQuestion)) {
        return { questionCount: parsed.questionCount, secondsPerQuestion: parsed.secondsPerQuestion };
      }
    } catch (e) {
      console.error('Failed to read trivia settings', e);
    }
    return null;
  },

  saveTriviaSettings: (settings: TriviaSettings): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIVIA, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save trivia settings', e);
    }
  },

  addXP: (amount: number): UserStats => {
    const stats = StorageService.getStats();
    stats.xp += amount;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(stats.xp / 40)) + 1);
    stats.level = newLevel;
    StorageService.saveStats(stats);
    return stats;
  }
};
