import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserStats, Verse, VerseProgress } from '../types/verse';

const SUPABASE_CONFIG_KEY = 'biblica_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey };
    }
    const local = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.error('Failed reading Supabase config', e);
  }
  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    supabaseInstance = createClient(config.url, config.anonKey);
  } catch (e) {
    console.error('Failed saving Supabase config', e);
  }
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const config = getSupabaseConfig();
  if (config?.url && config?.anonKey) {
    supabaseInstance = createClient(config.url, config.anonKey);
    return supabaseInstance;
  }
  return null;
}

export const SupabaseService = {
  isConfigured: (): boolean => {
    return !!getSupabaseConfig();
  },

  getCurrentUser: async () => {
    const client = getSupabase();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
  },

  signIn: async (email: string, password: string) => {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client is not configured.');
    return await client.auth.signInWithPassword({ email, password });
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client is not configured.');
    return await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
  },

  signInWithGoogle: async () => {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client is not configured.');
    return await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  },

  onAuthStateChange: (callback: (user: any) => void) => {
    const client = getSupabase();
    if (!client) return { unsubscribe: () => {} };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return subscription;
  },

  signOut: async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
  },

  // Upload local progress to Supabase
  syncUp: async (
    stats: UserStats,
    progressMap: Record<string, VerseProgress>,
    customVerses: Verse[]
  ) => {
    const client = getSupabase();
    if (!client) return false;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    try {
      // 1. Sync User Stats
      await client.from('user_stats').upsert({
        user_id: user.id,
        xp: stats.xp,
        level: stats.level,
        streak_days: stats.streakDays,
        last_active_date: stats.lastActiveDate,
        quizzes_completed: stats.quizzesCompleted,
        cards_reviewed: stats.cardsReviewed,
        cloze_completed: stats.clozeCompleted,
        scrambles_completed: stats.scramblesCompleted,
        updated_at: new Date().toISOString()
      });

      // 2. Sync Verse Progress
      const progressList = Object.values(progressMap).map((p) => ({
        user_id: user.id,
        verse_id: p.verseId,
        mastery_score: p.masteryScore,
        times_practiced: p.timesPracticed,
        correct_answers: p.correctAnswers,
        cloze_stage: p.clozeStage,
        last_practiced: p.lastPracticed,
      }));

      if (progressList.length > 0) {
        // Review-schedule columns come from supabase/migrations/20261113_srs_schedule.sql.
        // Until that migration is applied the upsert rejects them, so fall back
        // to the basic columns rather than dropping the whole progress sync.
        // Rows without a local schedule go up with the basic columns only:
        // sending null schedule columns would erase a schedule another device
        // saved to the cloud.
        const scheduled = progressList
          .filter((row) => progressMap[row.verse_id].srsDue !== undefined)
          .map((row) => {
            const p = progressMap[row.verse_id];
            return {
              ...row,
              srs_due: p.srsDue,
              srs_interval: p.srsInterval ?? null,
              srs_ease: p.srsEase ?? null,
              srs_reps: p.srsReps ?? null,
              srs_lapses: p.srsLapses ?? null,
              srs_introduced: p.srsIntroduced ?? null,
            };
          });
        const unscheduled = progressList.filter((row) => progressMap[row.verse_id].srsDue === undefined);
        const opts = { onConflict: 'user_id,verse_id' };

        if (unscheduled.length > 0) await client.from('verse_progress').upsert(unscheduled, opts);
        if (scheduled.length > 0) {
          const { error } = await client.from('verse_progress').upsert(scheduled, opts);
          if (error) {
            // Migration not applied yet: still save the basic progress columns.
            const basic = progressList.filter((row) => progressMap[row.verse_id].srsDue !== undefined);
            await client.from('verse_progress').upsert(basic, opts);
          }
        }
      }

      // 3. Sync Custom Verses
      const customList = customVerses
        .filter((v) => v.isCustom)
        .map((v) => ({
          id: v.id,
          user_id: user.id,
          reference: v.reference,
          book: v.book,
          chapter: v.chapter,
          verse_num: v.verseNum,
          text: v.text,
          category: v.category,
          translation: v.translation,
          tags: v.tags || []
        }));

      if (customList.length > 0) {
        await client.from('custom_verses').upsert(customList, {
          onConflict: 'id'
        });
      }

      return true;
    } catch (err) {
      console.error('Error syncing up to Supabase:', err);
      return false;
    }
  },

  // Download remote data from Supabase
  syncDown: async (): Promise<{
    stats?: Partial<UserStats>;
    progressMap?: Record<string, VerseProgress>;
    customVerses?: Verse[];
    profile?: Partial<UserProfile>;
  } | null> => {
    const client = getSupabase();
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    try {
      // 1. Fetch Profile
      const { data: profileData } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // 2. Fetch Stats
      const { data: statsData } = await client
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // 3. Fetch Verse Progress
      const { data: progressData } = await client
        .from('verse_progress')
        .select('*')
        .eq('user_id', user.id);

      // 4. Fetch Custom Verses
      const { data: customData } = await client
        .from('custom_verses')
        .select('*')
        .eq('user_id', user.id);

      const progressMap: Record<string, VerseProgress> = {};
      progressData?.forEach((row) => {
        progressMap[row.verse_id] = {
          verseId: row.verse_id,
          masteryScore: row.mastery_score,
          timesPracticed: row.times_practiced,
          correctAnswers: row.correct_answers,
          lastPracticed: row.last_practiced,
          clozeStage: row.cloze_stage,
          // Present only once the schedule migration is applied; mergeProgress
          // keeps the local schedule when these are null/undefined.
          srsDue: row.srs_due ?? undefined,
          srsInterval: row.srs_interval ?? undefined,
          srsEase: row.srs_ease ?? undefined,
          srsReps: row.srs_reps ?? undefined,
          srsLapses: row.srs_lapses ?? undefined,
          srsIntroduced: row.srs_introduced ?? undefined,
        };
      });

      const customVerses: Verse[] = (customData || []).map((row) => ({
        id: row.id,
        reference: row.reference,
        book: row.book,
        chapter: row.chapter,
        verseNum: row.verse_num,
        text: row.text,
        category: row.category,
        translation: row.translation,
        tags: row.tags,
        isCustom: true,
      }));

      return {
        stats: statsData ? {
          xp: statsData.xp,
          level: statsData.level,
          streakDays: statsData.streak_days,
          lastActiveDate: statsData.last_active_date,
          quizzesCompleted: statsData.quizzes_completed,
          cardsReviewed: statsData.cards_reviewed,
          clozeCompleted: statsData.cloze_completed,
          scramblesCompleted: statsData.scrambles_completed,
        } : undefined,
        progressMap,
        customVerses,
        profile: profileData ? {
          name: profileData.full_name,
          email: profileData.email || user.email || '',
          avatarUrl: profileData.avatar_url,
          preferredTranslation: profileData.preferred_translation,
          dailyGoalVerses: profileData.daily_goal_verses,
          theme: profileData.theme,
        } : undefined,
      };
    } catch (err) {
      console.error('Error syncing down from Supabase:', err);
      return null;
    }
  }
};
