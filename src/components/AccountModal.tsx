import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sun, 
  Moon, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  Database, 
  LogOut, 
  LogIn, 
  Download, 
  Flame, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';
import type { UserProfile, UserStats, Verse, VerseProgress, Translation } from '../types/verse';
import { SupabaseService, getSupabaseConfig, saveSupabaseConfig } from '../lib/supabase';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'supabase' | 'preferences'>('profile');

  // Profile form state
  const [name, setName] = useState(profile.name);
  const [translation, setTranslation] = useState<Translation>(profile.preferredTranslation);
  const [dailyGoal, setDailyGoal] = useState<number>(profile.dailyGoalVerses);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    if (cfg) {
      setSupabaseUrl(cfg.url);
      setSupabaseAnonKey(cfg.anonKey);
      setIsConfigured(true);
    }
    // Check if user is logged into Supabase
    SupabaseService.getCurrentUser().then((u) => {
      if (u) setCurrentUserEmail(u.email || null);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name,
      preferredTranslation: translation,
      dailyGoalVerses: dailyGoal,
    };
    onUpdateProfile(updated);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) return;
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
    });
    setIsConfigured(true);
    setAuthMessage('Supabase credentials saved successfully!');
    setTimeout(() => setAuthMessage(null), 3000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      if (isSignUp) {
        await SupabaseService.signUp(authEmail, authPassword, name);
        setAuthMessage('Account created! Please check your email to verify or log in.');
      } else {
        await SupabaseService.signIn(authEmail, authPassword);
        setAuthMessage('Successfully signed in!');
        const u = await SupabaseService.getCurrentUser();
        setCurrentUserEmail(u?.email || null);
        handleSyncCloud();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await SupabaseService.signOut();
    setCurrentUserEmail(null);
    setAuthMessage('Signed out.');
    setTimeout(() => setAuthMessage(null), 2000);
  };

  const handleSyncCloud = async () => {
    setSyncLoading(true);
    setAuthMessage('Syncing data with Supabase...');
    try {
      // 1. Sync local up to cloud
      await SupabaseService.syncUp(stats, progressMap, verses);
      // 2. Sync down
      const remote = await SupabaseService.syncDown();
      if (remote) {
        if (remote.stats) {
          const mergedStats: UserStats = {
            ...stats,
            ...remote.stats,
          };
          const mergedVerses = remote.customVerses
            ? [...verses.filter((v) => !v.isCustom), ...remote.customVerses]
            : verses;

          onDataSynced(mergedStats, remote.progressMap || progressMap, mergedVerses);
        }
      }
      setAuthMessage('All data synced with Supabase cloud!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setAuthMessage(message);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setAuthMessage(null), 3000);
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
      <div className="relative w-full max-w-xl max-h-[92vh] theme-card rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Account & Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your profile, theme, and Supabase cloud sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-600 dark:hover:text-white btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex border-b border-inherit bg-slate-100/60 dark:bg-black/30 p-1.5 gap-1">
          {[
            { id: 'profile', label: 'Profile & Stats' },
            { id: 'preferences', label: 'Preferences' },
            { id: 'supabase', label: 'Supabase Cloud' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'preferences' | 'supabase')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all btn-press ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: PROFILE & STATS */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl theme-subtle flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md">
                  {name.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Level {stats.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentUserEmail || profile.email}
                  </p>
                </div>
              </div>

              {/* Progress Summary Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl theme-subtle">
                  <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <span className="text-lg font-black block tabular-nums">{stats.streakDays}d</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Streak</span>
                </div>
                <div className="p-3 rounded-2xl theme-subtle">
                  <Sparkles className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <span className="text-lg font-black block tabular-nums">{stats.xp}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Total XP</span>
                </div>
                <div className="p-3 rounded-2xl theme-subtle">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <span className="text-lg font-black block tabular-nums">
                    {Object.values(progressMap).filter((p) => p.masteryScore >= 80).length}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Mastered</span>
                </div>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Your Name or Handle"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs btn-press shadow-md"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PREFERENCES (THEME & TRANSLATION) */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Theme Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Interface Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleTheme('light')}
                    className={`p-4 rounded-2xl border flex items-center gap-3 transition-all btn-press ${
                      stats.theme === 'light'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">Light Mode</div>
                      <div className="text-[10px] text-slate-500">Bright, high contrast</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleTheme('dark')}
                    className={`p-4 rounded-2xl border flex items-center gap-3 transition-all btn-press ${
                      stats.theme === 'dark'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">Dark Mode</div>
                      <div className="text-[10px] text-slate-500">Deep obsidian slate</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Translation & Daily Goal */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Default Translation
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['KJV', 'NIV', 'ESV', 'NLT'] as Translation[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTranslation(t);
                        onUpdateProfile({ ...profile, preferredTranslation: t });
                      }}
                      className={`py-2.5 rounded-xl border font-bold text-xs transition-all btn-press ${
                        translation === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Target */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Daily Scripture Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setDailyGoal(count);
                        onUpdateProfile({ ...profile, dailyGoalVerses: count });
                      }}
                      className={`py-2.5 rounded-xl border font-bold text-xs transition-all btn-press ${
                        dailyGoal === count
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-inherit theme-subtle text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count} {count === 1 ? 'Verse' : 'Verses'}/day
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Backup */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="w-full py-3 rounded-xl border border-inherit theme-subtle text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/[0.08] btn-press"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Progress Backup (JSON)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SUPABASE BACKEND CLOUD SYNC */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              {/* Connection Status Banner */}
              <div className="p-4 rounded-2xl theme-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUserEmail ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CloudCheck className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {currentUserEmail ? 'Connected & Signed In' : isConfigured ? 'Supabase Configured' : 'Local Storage Mode'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {currentUserEmail || (isConfigured ? 'Ready to sign in' : 'Data stored on this device')}
                    </p>
                  </div>
                </div>

                {currentUserEmail && (
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 btn-press"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status/Notification Message */}
              {authMessage && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-medium">
                  {authMessage}
                </div>
              )}

              {/* Cloud Sync Action (if signed in) */}
              {currentUserEmail && (
                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={handleSyncCloud}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 btn-press"
                >
                  <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  <span>{syncLoading ? 'Syncing...' : 'Sync Progress to Cloud'}</span>
                </button>
              )}

              {/* Supabase User Auth Form (Sign In / Sign Up) */}
              {isConfigured && !currentUserEmail && (
                <form onSubmit={handleAuthSubmit} className="space-y-3 border-t border-inherit pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isSignUp ? 'Create Cloud Account' : 'Sign In to Sync'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      {isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                  </div>

                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-inherit bg-transparent text-sm focus:outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 btn-press"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{authLoading ? 'Authenticating...' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
                  </button>
                </form>
              )}

              {/* Supabase Project Credentials Form */}
              <form onSubmit={handleSaveSupabaseConfig} className="space-y-3 border-t border-inherit pt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5" />
                  <span>Supabase Project Settings</span>
                </div>
                <input
                  type="url"
                  required
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-3.5 py-2 rounded-xl border border-inherit bg-transparent text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <input
                  type="password"
                  required
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="anon-public-key"
                  className="w-full px-3.5 py-2 rounded-xl border border-inherit bg-transparent text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl border border-inherit theme-subtle text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/[0.08] btn-press"
                >
                  Save Supabase Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
