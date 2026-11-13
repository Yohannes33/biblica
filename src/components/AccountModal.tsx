import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sun, 
  Moon, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  LogOut, 
  LogIn, 
  Download, 
  Flame, 
  Sparkles, 
  ShieldCheck
} from 'lucide-react';
import type { UserProfile, UserStats, Verse, VerseProgress, Translation } from '../types/verse';
import { SupabaseService } from '../lib/supabase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: UserStats;
  progressMap: Record<string, VerseProgress>;
  verses: Verse[];
  onUpdateProfile: (updated: UserProfile) => void;
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onDataSynced: (newStats: UserStats, newProgress: Record<string, VerseProgress>, newVerses: Verse[]) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  progressMap,
  verses,
  onUpdateProfile,
  onToggleTheme,
  onDataSynced,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  // Profile form state
  const [name, setName] = useState(profile.name);
  const [translation, setTranslation] = useState<Translation>(profile.preferredTranslation);
  const [dailyGoal, setDailyGoal] = useState<number>(profile.dailyGoalVerses);

  // Cloud auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const isCloudEnabled = SupabaseService.isConfigured();

  useEffect(() => {
    if (isCloudEnabled) {
      SupabaseService.getCurrentUser().then((u) => {
        if (u) setCurrentUserEmail(u.email || null);
      });
    }
  }, [isOpen, isCloudEnabled]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      preferredTranslation: translation,
      dailyGoalVerses: dailyGoal,
    };
    onUpdateProfile(updated);
    setStatusMessage('Profile updated successfully!');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatusMessage(null);

    try {
      if (isSignUp) {
        await SupabaseService.signUp(authEmail, authPassword, name);
        setStatusMessage('Account created! Please check your email to confirm or sign in.');
      } else {
        await SupabaseService.signIn(authEmail, authPassword);
        setStatusMessage('Signed in successfully!');
        const u = await SupabaseService.getCurrentUser();
        setCurrentUserEmail(u?.email || null);
        handleSyncCloud();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setStatusMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await SupabaseService.signOut();
    setCurrentUserEmail(null);
    setStatusMessage('Signed out of cloud sync.');
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleSyncCloud = async () => {
    setSyncLoading(true);
    setStatusMessage('Syncing scripture progress to cloud...');
    try {
      await SupabaseService.syncUp(stats, progressMap, verses);
      const remote = await SupabaseService.syncDown();
      if (remote && remote.stats) {
        const mergedStats: UserStats = {
          ...stats,
          ...remote.stats,
        };
        const mergedVerses = remote.customVerses
          ? [...verses.filter((v) => !v.isCustom), ...remote.customVerses]
          : verses;

        onDataSynced(mergedStats, remote.progressMap || progressMap, mergedVerses);
      }
      setStatusMessage('All progress synced with cloud!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setStatusMessage(message);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleExportData = () => {
    const data = {
      profile,
      stats,
      progressMap,
      customVerses: verses.filter((v) => v.isCustom),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biblica-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] theme-card rounded-3xl flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Account & Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your memorization journey and customize preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-inherit bg-slate-100/60 dark:bg-black/30 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profile & Progress
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Settings & Sync
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            {statusMessage}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: PROFILE & PROGRESS */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl theme-subtle flex items-center gap-4 border border-inherit">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md">
                  {name.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Level {stats.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {currentUserEmail || 'Local Pilgrim Account'}
                  </p>
                </div>
              </div>

              {/* Matrix of Progress Stats */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl theme-subtle border border-inherit">
                  <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <span className="text-xl font-extrabold block text-slate-900 dark:text-white tabular-nums">
                    {stats.streakDays}d
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Streak</span>
                </div>
                <div className="p-3 rounded-2xl theme-subtle border border-inherit">
                  <Sparkles className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <span className="text-xl font-extrabold block text-slate-900 dark:text-white tabular-nums">
                    {stats.xp}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total XP</span>
                </div>
                <div className="p-3 rounded-2xl theme-subtle border border-inherit">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <span className="text-xl font-extrabold block text-slate-900 dark:text-white tabular-nums">
                    {Object.values(progressMap).filter((p) => p.masteryScore >= 80).length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mastered</span>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Your Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      placeholder="Your Name"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs btn-press shadow-md"
                    >
                      Save Name
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Daily Memorization Target
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 3, 5, 10].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setDailyGoal(count);
                          onUpdateProfile({ ...profile, dailyGoalVerses: count });
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all btn-press ${
                          dailyGoal === count
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-inherit theme-subtle text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {count} {count === 1 ? 'verse' : 'verses'}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SETTINGS & SYNC */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Theme Settings */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                  Appearance & Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleTheme('light')}
                    className={`p-4 rounded-2xl border flex items-center gap-3 transition-all btn-press ${
                      stats.theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                        : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Light Mode</div>
                      <div className="text-[11px] text-slate-500">Crisp, high contrast</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleTheme('dark')}
                    className={`p-4 rounded-2xl border flex items-center gap-3 transition-all btn-press ${
                      stats.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                        : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</div>
                      <div className="text-[11px] text-slate-500">Deep obsidian black</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Translation Preference */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                  Default Bible Translation
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['KJV', 'ESV', 'NIV', 'NASB', 'NKJV', 'NLT'] as Translation[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTranslation(t);
                        onUpdateProfile({ ...profile, preferredTranslation: t });
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all btn-press ${
                        translation === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'border-inherit theme-subtle text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud Account & Multi-device Sync */}
              <div className="border-t border-inherit pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Cloud Account & Sync
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sync your streaks and memorized verses across devices
                    </p>
                  </div>
                  {currentUserEmail ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                      <CloudCheck className="w-4 h-4" />
                      <span>Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-500/10 px-2.5 py-1 rounded-xl">
                      <Cloud className="w-4 h-4" />
                      <span>Local Device</span>
                    </div>
                  )}
                </div>

                {currentUserEmail ? (
                  <div className="p-4 rounded-2xl theme-subtle border border-inherit space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Signed in as {currentUserEmail}
                      </span>
                      <button
                        onClick={handleSignOut}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 btn-press"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={handleSyncCloud}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 btn-press"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                      <span>{syncLoading ? 'Syncing...' : 'Sync Data Now'}</span>
                    </button>
                  </div>
                ) : isCloudEnabled ? (
                  <form onSubmit={handleAuthSubmit} className="p-4 rounded-2xl theme-subtle border border-inherit space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isSignUp ? 'Create Cloud Account' : 'Sign In to Sync'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        {isSignUp ? 'Already registered? Sign In' : 'New pilgrim? Register'}
                      </button>
                    </div>

                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 btn-press"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{authLoading ? 'Connecting...' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl theme-subtle border border-inherit">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Cloud sync automatically connects with your hosted Supabase backend when environment keys are active. All progress is currently saved safely to your local device.
                    </p>
                  </div>
                )}
              </div>

              {/* Data Backup */}
              <div className="border-t border-inherit pt-4">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="w-full py-3 rounded-xl border border-inherit theme-subtle text-xs font-bold flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] btn-press"
                >
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Download Progress Backup (JSON)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
