import type { Translation } from '../data/translations';
import type { AppLanguage } from '../i18n';

export type { Translation };

export type VerseCategory = 
  | 'Essential Classics'
  | 'Peace & Anxiety'
  | 'Strength & Courage'
  | 'Love & Kindness'
  | 'Faith & Salvation'
  | 'Wisdom & Guidance'
  | 'Hope & Comfort'
  | 'Custom';

export interface Verse {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verseNum: string;
  text: string;
  category: VerseCategory;
  // A Translation id. Verses typed in by hand on older builds may say NIV, ESV…
  translation: string;
  tags?: string[];
  isCustom?: boolean;
}

export type MasteryLevel = 'New' | 'Learning' | 'Familiar' | 'Mastered';

export interface VerseProgress {
  verseId: string;
  masteryScore: number;
  timesPracticed: number;
  correctAnswers: number;
  lastPracticed: number;
  clozeStage: number;
  // Flashcard review schedule (see utils/srs.ts). Absent until first rated.
  srsDue?: number; // local midnight of the day the card is next due
  srsInterval?: number; // days
  srsEase?: number;
  srsReps?: number; // consecutive successful reviews
  srsLapses?: number;
  srsIntroduced?: number; // when the card was first reviewed
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  avatarSeed?: string; // seeds the generated DiceBear avatar
  preferredTranslation: Translation;
  // Interface language. Absent on profiles saved before it existed: those match the Bible.
  appLanguage?: AppLanguage;
  dailyGoalVerses: number;
  theme: 'light' | 'dark';
  joinedDate: string;
  // False until the first-run setup is done. Absent on profiles saved before it existed.
  onboarded?: boolean;
}

export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  quizzesCompleted: number;
  cardsReviewed: number;
  clozeCompleted: number;
  scramblesCompleted: number;
  soundEnabled: boolean;
  activeVerseId: string | null;
  selectedCategory: string;
  theme: 'light' | 'dark';
}

export type AppTab = 'cloze' | 'flashcards' | 'scramble' | 'trivia' | 'library' | 'stats' | 'account';
