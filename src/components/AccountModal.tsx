import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sun, 
  Moon, 
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
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'profile' | 'settings'>('signin');

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
  const isCloudEnabled = SupabaseService.isConfigured();

  useEffect(() => {
    if (isCloudEnabled) {
      SupabaseService.getCurrentUser().then((u) => {
        if (u) {
          setCurrentUserEmail(u.email || null);
          setActiveTab('profile');
        } else {
          setCurrentUserEmail(null);
          setActiveTab('signin');
        }
      });
    } else {
      setActiveTab('profile');
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

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setStatusMessage('Redirecting to Google Sign-In...');
    try {
      await SupabaseService.signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setStatusMessage(message);
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatusMessage(null);

    try {
      if (isSignUp) {
        await SupabaseService.signUp(authEmail, authPassword, name);
        setStatusMessage('Account created! Please check your email to verify or log in.');
      } else {
        await SupabaseService.signIn(authEmail, authPassword);
        setStatusMessage('Signed in successfully!');
        const u = await SupabaseService.getCurrentUser();
        setCurrentUserEmail(u?.email || null);
        setActiveTab('profile');
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
    setActiveTab('signin');
    setStatusMessage('Signed out.');
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
                {currentUserEmail ? 'Account & Journey' : 'Sign In to Biblica'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUserEmail ? 'Track your scripture memory and settings' : 'Sync your streaks and mastered verses across devices'}
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
          {currentUserEmail ? (
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
          ) : (
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Preferences
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
          {/* TAB: SIGN IN (Shown when not logged in) */}
          {!currentUserEmail && activeTab === 'signin' && (
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Welcome to Biblica
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect your account to save your XP, badges, and streaks in the cloud
                </p>
              </div>

              {/* 1-Click Google Sign In */}
              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-2xl border border-inherit bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold shadow-sm flex items-center justify-center gap-3 btn-press"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2 text-slate-400 py-1">
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/[0.08]" />
                <span className="text-[10px] uppercase font-bold tracking-wider">or sign in with email</span>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/[0.08]" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isSignUp ? 'Create Account' : 'Email & Password'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    {isSignUp ? 'Have an account? Sign In' : 'Need an account? Register'}
                  </button>
                </div>

                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 btn-press"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'Connecting...' : isSignUp ? 'Create Cloud Account' : 'Sign In'}</span>
                </button>
              </form>

              {/* Continue as Guest */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                >
                  Continue as Guest (Save locally on this device)
                </button>
              </div>
            </div>
          )}

          {/* TAB: PROFILE & PROGRESS (Shown when logged in) */}
          {currentUserEmail && activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card with Sign Out button */}
              <div className="p-4 rounded-2xl theme-subtle flex items-center justify-between gap-4 border border-inherit">
                <div className="flex items-center gap-3.5 min-w-0">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shrink-0">
                      {name.charAt(0).toUpperCase() || 'P'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">{name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        Level {stats.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                      {currentUserEmail}
                    </p>
                  </div>
                </div>

                {/* Prominent Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-1.5 border border-rose-500/20 btn-press shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
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

              {/* Sync Action */}
              <button
                type="button"
                disabled={syncLoading}
                onClick={handleSyncCloud}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 btn-press"
              >
                <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? 'Syncing...' : 'Sync Progress with Cloud'}</span>
              </button>

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
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB: PREFERENCES */}
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

              {/* Daily Target */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Daily Target
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
