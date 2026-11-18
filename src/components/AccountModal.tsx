import React, { useState, useEffect } from 'react';
import { Sun, Moon, Cloud, CloudCheck, RefreshCw, LogOut, LogIn, Download, Volume2, VolumeX, Shuffle } from 'lucide-react';
import type { UserProfile, UserStats, Verse, VerseProgress, Translation } from '../types/verse';
import { SupabaseService } from '../lib/supabase';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { newAvatarSeed } from '../utils/avatar';
import { getLevelTitle } from '../utils/level';
import { TRANSLATIONS } from '../data/translations';
import { displayName, useT } from '../i18n';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  stats: UserStats;
  progressMap: Record<string, VerseProgress>;
  verses: Verse[];
  onUpdateProfile: (updated: UserProfile) => void;
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onToggleSound: () => void;
  onDataSynced: (newStats: UserStats, newProgress: Record<string, VerseProgress>, newVerses: Verse[]) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, children, footer }) => (
  <section className="mb-6">
    <h3 className="section-label">{title}</h3>
    {children}
    {footer && <p className="mt-2 px-1 text-sm text-ink-3">{footer}</p>}
  </section>
);

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  progressMap,
  verses,
  onUpdateProfile,
  onToggleTheme,
  onToggleSound,
  onDataSynced,
}) => {
  const t = useT();
  // The default name shows in the interface language ("Pilgrim" / "መንገደኛ").
  const shownName = displayName(profile.name, t.lang);
  const [name, setName] = useState(shownName);
  const [translation, setTranslation] = useState<Translation>(profile.preferredTranslation);
  const [dailyGoal, setDailyGoal] = useState<number>(profile.dailyGoalVerses);
  const selectedTranslation = TRANSLATIONS.find((t) => t.id === translation) ?? TRANSLATIONS[0];

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const isCloudEnabled = SupabaseService.isConfigured();
  // Translation names are English proper names, except the Amharic Bible's.
  const nameOf = (id: Translation, name: string) => (id === 'AMH' ? t('translation.AMH.name') : name);
  // The server's own wording is English: show it in the English interface,
  // our translated message otherwise.
  const serverMessage = (err: unknown) => {
    console.error(err);
    return t.lang === 'en' && err instanceof Error ? err.message : null;
  };

  useEffect(() => {
    if (isCloudEnabled) {
      SupabaseService.getCurrentUser().then((u) => {
        if (u) setCurrentUserEmail(u.email || null);
      });
    }
  }, [isOpen, isCloudEnabled]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: name.trim() || profile.name,
      preferredTranslation: translation,
      dailyGoalVerses: dailyGoal,
    });
    setStatusMessage(t('settings.nameSaved'));
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setStatusMessage(t('settings.openingGoogle'));
    try {
      await SupabaseService.signInWithGoogle();
    } catch (err) {
      setStatusMessage(serverMessage(err) ?? t('settings.googleFailed'));
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
        setStatusMessage(t('settings.accountCreated'));
      } else {
        const { user } = await SupabaseService.signIn(authEmail, authPassword);
        setStatusMessage(t('settings.signedIn'));
        setCurrentUserEmail(user?.email || null);
        handleSyncCloud();
      }
    } catch (err) {
      setStatusMessage(serverMessage(err) ?? t(isSignUp ? 'settings.signUpFailed' : 'settings.signInFailed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await SupabaseService.signOut();
    setCurrentUserEmail(null);
    setStatusMessage(t('settings.signedOut'));
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleSyncCloud = async () => {
    setSyncLoading(true);
    setStatusMessage(t('settings.syncingProgress'));
    try {
      await SupabaseService.syncUp(stats, progressMap, verses);
      const remote = await SupabaseService.syncDown();
      if (remote && remote.stats) {
        const mergedStats: UserStats = { ...stats, ...remote.stats };
        const mergedVerses = remote.customVerses
          ? [...verses.filter((v) => !v.isCustom), ...remote.customVerses]
          : verses;
        onDataSynced(mergedStats, remote.progressMap || progressMap, mergedVerses);
      }
      setStatusMessage(t('settings.synced'));
    } catch (err) {
      setStatusMessage(serverMessage(err) ?? t('settings.syncFailed'));
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
    <Sheet open={isOpen} onClose={onClose} title={t('settings.title')}>
      {statusMessage && (
        <p role="status" className="animate-rise mb-4 rounded-2xl bg-brand-soft px-4 py-3 font-semibold text-brand-ink">
          {statusMessage}
        </p>
      )}

      <section className="mb-6 flex items-center gap-4" aria-label={t('settings.yourProfile')}>
        <Avatar seed={profile.avatarSeed || 'biblica'} size={84} className="ring-4 ring-[var(--surface)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-extrabold">{shownName}</p>
          <p className="truncate text-sm text-ink-3">
            {t('settings.levelLine', { level: stats.level, title: getLevelTitle(stats.level, t.lang) })}
          </p>
          <button
            type="button"
            onClick={() => onUpdateProfile({ ...profile, avatarSeed: newAvatarSeed() })}
            className="btn btn-sm btn-secondary mt-2"
          >
            <Shuffle className="h-[18px] w-[18px]" strokeWidth={2.25} />
            {t('settings.newLook')}
          </button>
        </div>
      </section>

      <Section title={t('settings.yourName')}>
        <form onSubmit={handleSaveProfile} className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">{t('settings.yourName')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field bg-surface"
              placeholder={t('settings.yourName')}
              autoComplete="nickname"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || name.trim() === shownName}>
            {t('common.save')}
          </button>
        </form>
      </Section>

      <Section title={t('settings.dailyGoal')} footer={t('settings.dailyGoalFooter')}>
        <div className="segmented" role="group" aria-label={t('settings.dailyGoal')}>
          {[1, 3, 5, 10].map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={dailyGoal === count}
              onClick={() => {
                setDailyGoal(count);
                onUpdateProfile({ ...profile, dailyGoalVerses: count });
              }}
            >
              {t.count('verses', count)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.appearance')}>
        <div className="group-list">
          <div className="flex items-center gap-3 p-3 pl-4">
            <span className="flex-1 font-medium">{t('settings.theme')}</span>
            <div className="segmented w-48" role="group" aria-label={t('settings.theme')}>
              <button type="button" aria-pressed={stats.theme === 'light'} onClick={() => onToggleTheme('light')} className="flex items-center justify-center gap-1.5">
                <Sun className="h-4 w-4" aria-hidden="true" /> {t('settings.light')}
              </button>
              <button type="button" aria-pressed={stats.theme === 'dark'} onClick={() => onToggleTheme('dark')} className="flex items-center justify-center gap-1.5">
                <Moon className="h-4 w-4" aria-hidden="true" /> {t('settings.dark')}
              </button>
            </div>
          </div>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 p-3 pl-4">
            {stats.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-ink-2" aria-hidden="true" />
            ) : (
              <VolumeX className="h-5 w-5 text-ink-3" aria-hidden="true" />
            )}
            <span className="flex-1 font-medium">{t('settings.sound')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={stats.soundEnabled}
              aria-label={t('settings.sound')}
              onClick={onToggleSound}
              className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${stats.soundEnabled ? 'bg-brand' : 'bg-surface-3'}`}
            >
              <span
                className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_oklch(0_0_0/0.15),0_1px_1px_oklch(0_0_0/0.16)] transition-transform duration-200 ${
                  stats.soundEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>
      </Section>

      <Section
        title={t('settings.defaultTranslation')}
        footer={t('settings.translationFooter', {
          name: nameOf(selectedTranslation.id, selectedTranslation.name),
          blurb: t(`translation.${selectedTranslation.id}.blurb`),
        })}
      >
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('settings.defaultTranslation')}>
          {TRANSLATIONS.map(({ id, label, name, language }) => (
            <button
              key={id}
              type="button"
              aria-pressed={translation === id}
              onClick={() => {
                setTranslation(id);
                onUpdateProfile({ ...profile, preferredTranslation: id });
              }}
              className={`min-h-11 rounded-xl font-display font-extrabold transition-colors ${
                translation === id ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2'
              }`}
            >
              {/* Visible label in its own language; the English name follows for screen readers. */}
              <span lang={language}>{label}</span>
              <span lang={id === 'AMH' ? t.lang : 'en'} className="sr-only">, {nameOf(id, name)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title={t('settings.cloudSync')}
        footer={!currentUserEmail ? t('settings.cloudFooter') : undefined}
      >
        <div className="card rounded-[1.25rem] p-4">
          <div className="mb-3 flex items-center gap-2">
            {currentUserEmail ? (
              <span className="pill bg-brand-soft text-brand-ink">
                <CloudCheck className="h-4 w-4" aria-hidden="true" /> {t('settings.connected')}
              </span>
            ) : (
              <span className="pill bg-surface-2 text-ink-2">
                <Cloud className="h-4 w-4" aria-hidden="true" /> {t('settings.savedOnDevice')}
              </span>
            )}
          </div>

          {currentUserEmail ? (
            <div className="flex flex-col gap-3">
              <p className="text-ink-2">
                {t('settings.signedInAs')} <span className="font-semibold break-all text-ink">{currentUserEmail}</span>
              </p>
              <button type="button" disabled={syncLoading} onClick={handleSyncCloud} className="btn btn-primary">
                <RefreshCw className={`h-5 w-5 ${syncLoading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                {syncLoading ? t('settings.syncing') : t('settings.syncNow')}
              </button>
              <button type="button" onClick={handleSignOut} className="btn btn-sm btn-secondary text-danger-ink">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2.25} />
                {t('settings.signOut')}
              </button>
            </div>
          ) : isCloudEnabled ? (
            <div className="flex flex-col gap-3">
              <button type="button" disabled={authLoading} onClick={handleGoogleSignIn} className="btn btn-secondary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {t('settings.continueGoogle')}
              </button>
              <div className="flex items-center gap-3 text-sm text-ink-3" aria-hidden="true">
                <span className="h-px flex-1 bg-line" />
                {t('settings.orEmail')}
                <span className="h-px flex-1 bg-line" />
              </div>
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                <div className="segmented" role="group" aria-label={t('settings.account')}>
                  <button type="button" aria-pressed={!isSignUp} onClick={() => setIsSignUp(false)}>
                    {t('settings.signIn')}
                  </button>
                  <button type="button" aria-pressed={isSignUp} onClick={() => setIsSignUp(true)}>
                    {t('settings.createAccount')}
                  </button>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink-2">{t('settings.email')}</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink-2">{t('settings.password')}</span>
                  <input
                    type="password"
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="field"
                  />
                </label>
                <button type="submit" disabled={authLoading} className="btn btn-primary mt-1">
                  <LogIn className="h-5 w-5" strokeWidth={2.5} />
                  {authLoading ? t('settings.connecting') : isSignUp ? t('settings.createAccount') : t('settings.signIn')}
                </button>
              </form>
            </div>
          ) : (
            <p className="text-ink-2">{t('settings.cloudUnavailable')}</p>
          )}
        </div>
      </Section>

      <Section title={t('settings.backup')} footer={t('settings.backupFooter')}>
        <button type="button" onClick={handleExportData} className="btn btn-secondary w-full">
          <Download className="h-5 w-5" strokeWidth={2.25} />
          {t('settings.downloadBackup')}
        </button>
      </Section>

      {/* The Amharic text's licence requires its full copyright statement in the app. */}
      <Section title={t('settings.bibleTexts')}>
        <ul className="flex flex-col gap-3 px-1 text-sm leading-relaxed text-ink-2">
          {TRANSLATIONS.map(({ id, name, credit }) => (
            // The statements are English legal text; only the Amharic Bible's name is translated.
            <li key={id} lang="en">
              <span lang={id === 'AMH' ? t.lang : 'en'} className="font-semibold text-ink">
                {nameOf(id, name)}.
              </span>{' '}
              {credit}
            </li>
          ))}
        </ul>
      </Section>
      <p className="px-1 text-xs leading-relaxed text-ink-3">
        {t('settings.avatars')}{' '}
        <a className="underline" href="https://www.figma.com/community/file/1184595184137881796" target="_blank" rel="noreferrer">
          Adventurer Neutral
        </a>{' '}
        {t('settings.avatarsBy')}{' '}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        {t('settings.avatarsVia')}
      </p>
      <p className="mt-2 px-1 text-xs text-ink-3">{t('settings.version', { version: __APP_VERSION__ })}</p>
    </Sheet>
  );
};
