export type Translation = 'NIV' | 'ESV' | 'KJV' | 'NLT';

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
  translation: Translation;
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
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  preferredTranslation: Translation;
  dailyGoalVerses: number;
  theme: 'light' | 'dark';
  joinedDate: string;
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
