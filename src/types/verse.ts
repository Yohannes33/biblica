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
  reference: string; // e.g. "John 3:16"
  book: string;
  chapter: number;
  verseNum: string; // "16" or "5-6"
  text: string;
  category: VerseCategory;
  translation: Translation;
  tags?: string[];
  isCustom?: boolean;
}

export type MasteryLevel = 'New' | 'Learning' | 'Familiar' | 'Mastered';

export interface VerseProgress {
  verseId: string;
  masteryScore: number; // 0 to 100
  timesPracticed: number;
  correctAnswers: number;
  lastPracticed: number; // timestamp
  clozeStage: number; // 1 to 5 (progressive cloze stage)
}

export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  quizzesCompleted: number;
  cardsReviewed: number;
  clozeCompleted: number;
  scramblesCompleted: number;
  soundEnabled: boolean;
  activeVerseId: string | null;
  selectedCategory: string;
}

export type AppTab = 'learn' | 'flashcards' | 'cloze' | 'scramble' | 'trivia' | 'library' | 'stats';
