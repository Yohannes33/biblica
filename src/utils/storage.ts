import { INITIAL_VERSES } from '../data/initialVerses';
import type { UserProfile, UserStats, Verse, VerseProgress } from '../types/verse';

const STORAGE_KEYS = {
  VERSES: 'biblica_verses_v1',
  PROGRESS: 'biblica_progress_v1',
  STATS: 'biblica_stats_v1',
  PROFILE: 'biblica_profile_v1',
};

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
  activeVerseId: INITIAL_VERSES[0].id,
  selectedCategory: 'All',
  theme: 'light',
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Pilgrim',
  email: 'pilgrim@biblica.app',
  preferredTranslation: 'KJV',
  dailyGoalVerses: 3,
  theme: 'light',
  joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
};

export const StorageService = {
  getVerses: (): Verse[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VERSES);
      if (stored) {
        const verses: Verse[] = JSON.parse(stored);
        // A saved library is a snapshot; append built-in verses added since
        // (built-ins can't be deleted, so a missing id is always a new one).
        const have = new Set(verses.map((v) => v.id));
        const added = INITIAL_VERSES.filter((v) => !have.has(v.id));
        if (added.length) {
          const merged = [...verses, ...added];
          localStorage.setItem(STORAGE_KEYS.VERSES, JSON.stringify(merged));
          return merged;
        }
        return verses;
      }
    } catch (e) {
      console.error('Failed to read verses from localStorage', e);
    }
    localStorage.setItem(STORAGE_KEYS.VERSES, JSON.stringify(INITIAL_VERSES));
    return INITIAL_VERSES;
  },

  saveVerses: (verses: Verse[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.VERSES, JSON.stringify(verses));
    } catch (e) {
      console.error('Failed to save verses', e);
    }
  },

  addCustomVerse: (newVerse: Omit<Verse, 'id' | 'isCustom'>): Verse => {
    const verses = StorageService.getVerses();
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
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read profile', e);
    }
    StorageService.saveProfile(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  },

  saveProfile: (profile: UserProfile): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
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
