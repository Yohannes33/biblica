import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FillBlankMode } from './components/modes/FillBlankMode';
import { FlashcardMode } from './components/modes/FlashcardMode';
import { WordScrambleMode } from './components/modes/WordScrambleMode';
import { TriviaQuizMode } from './components/modes/TriviaQuizMode';
import { LibraryModal } from './components/LibraryModal';
import { AccountModal } from './components/AccountModal';
import { StatsView } from './components/StatsView';
import { InstallPrompt } from './components/InstallPrompt';
import { Onboarding, type FirstVerse } from './components/Onboarding';
import type { PickedPassage } from './components/BibleBrowser';
import { StorageService } from './utils/storage';
import { SupabaseService } from './lib/supabase';
import { newAvatarSeed } from './utils/avatar';
import { buildReviewQueue, mergeProgress, startOfDay } from './utils/srs';
import { LanguageProvider, translate } from './i18n';
import { languageOf } from './data/translations';

const LAST_USER_KEY = 'biblica_last_user';
import type { AppTab, Translation, UserProfile, UserStats, Verse, VerseProgress } from './types/verse';

// Matches the top bar (--surface in index.css) so Android's status bar blends into it.
const THEME_COLOR = { light: '#ffffff', dark: '#151a16' } as const;

export function App() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [activeVerseId, setActiveVerseId] = useState<string>('');
  const [stats, setStats] = useState<UserStats>(StorageService.getStats());
  const [profile, setProfile] = useState<UserProfile>(StorageService.getProfile());
  const [progressMap, setProgressMap] = useState<Record<string, VerseProgress>>({});
  const [currentTab, setCurrentTab] = useState<AppTab>('cloze');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryView, setLibraryView] = useState<'mine' | 'bible'>();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(() => StorageService.needsOnboarding(StorageService.getProfile()));

  // The interface speaks the language of the reader's Bible.
  const uiLang = languageOf(profile.preferredTranslation);
  useEffect(() => {
    document.documentElement.lang = uiLang;
  }, [uiLang]);

  // Apply theme class to <html> and keep the browser chrome colour in step.
  useEffect(() => {
    const currentTheme = stats.theme || 'light';
    const root = document.documentElement;
    root.classList.toggle('dark', currentTheme === 'dark');
    root.classList.toggle('light', currentTheme !== 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[currentTheme]);
  }, [stats.theme]);

  // Initial data load
  useEffect(() => {
    const loadedStats = StorageService.getStats();
    setStats(loadedStats);
    // Give everyone a generated avatar; the seed is random and stays on device.
    const loadedProfile = StorageService.getProfile();
    if (!loadedProfile.avatarSeed) {
      loadedProfile.avatarSeed = newAvatarSeed();
      StorageService.saveProfile(loadedProfile);
    }
    setProfile(loadedProfile);
    const loadedVerses = StorageService.getVerses(loadedProfile.preferredTranslation);
    setVerses(loadedVerses);
    setProgressMap(StorageService.getProgressMap());

    if (loadedVerses.length > 0) {
      setActiveVerseId(loadedStats.activeVerseId || loadedVerses[0].id);
    }

    if (SupabaseService.isConfigured()) {
      SupabaseService.getCurrentUser().then((u) => {
        if (u) {
          setCurrentUser(u);
          const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pilgrim';
          setProfile((prev) => ({
            ...prev,
            name,
            email: u.email || '',
            avatarUrl: u.user_metadata?.avatar_url || '',
          }));
        }
      });

      const subscription = SupabaseService.onAuthStateChange(async (u) => {
        setCurrentUser(u);
        if (u) {
          const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pilgrim';
          setProfile((prev) => {
            const updated = {
              ...prev,
              name,
              email: u.email || '',
              avatarUrl: u.user_metadata?.avatar_url || '',
            };
            StorageService.saveProfile(updated);
            return updated;
          });
          try {
            const remote = await SupabaseService.syncDown();
            if (remote?.stats) {
              setStats((prev) => ({ ...prev, ...remote.stats }));
            }
            if (remote?.progressMap) {
              // Same account: merge, so the local review schedule survives.
              // A different account on this device: replace, so one person's
              // progress is never pushed into someone else's account.
              let lastUser: string | null = null;
              try {
                lastUser = localStorage.getItem(LAST_USER_KEY);
                localStorage.setItem(LAST_USER_KEY, u.id);
              } catch {
                // storage unavailable
              }
              const switchedAccount = !!lastUser && lastUser !== u.id;
              setProgressMap((prev) => {
                const merged = switchedAccount ? remote.progressMap ?? {} : mergeProgress(prev, remote.progressMap);
                try {
                  localStorage.setItem('biblica_progress_v1', JSON.stringify(merged));
                } catch {
                  // storage unavailable; in-memory state still updated
                }
                return merged;
              });
            }
          } catch (e) {
            console.error('Failed syncing data down on auth change', e);
          }
        }
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    }
  }, []);

  // Home-screen shortcuts (manifest `shortcuts` in vite.config.ts) open
  // /?tab=flashcards or /?open=bible. A first run goes through onboarding instead.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const open = params.get('open');
    if (!tab && !open) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (needsOnboarding) return;
    if (tab === 'cloze' || tab === 'flashcards' || tab === 'scramble' || tab === 'trivia' || tab === 'account') {
      setCurrentTab(tab);
    }
    if (open === 'bible') {
      setLibraryView('bible');
      setIsLibraryOpen(true);
    }
    // Only the URL the app was opened with counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each tab is its own screen: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentTab]);

  // Cards waiting today (due reviews + new cards allowed by the daily goal).
  // Recount when the date changes (a PWA can stay open overnight).
  const [today, setToday] = useState(() => startOfDay(Date.now()));
  useEffect(() => {
    const check = () => setToday(startOfDay(Date.now()));
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const cardsDue = useMemo(
    () => buildReviewQueue(verses, progressMap, profile.dailyGoalVerses).ids.length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` forces a recount at midnight
    [verses, progressMap, profile.dailyGoalVerses, today]
  );

  const activeVerse = verses.find((v) => v.id === activeVerseId) || verses[0];

  const handleToggleSound = () => {
    const updated = { ...stats, soundEnabled: !stats.soundEnabled };
    setStats(updated);
    StorageService.saveStats(updated);
  };

  const handleToggleTheme = (newTheme?: 'light' | 'dark') => {
    const target = newTheme || (stats.theme === 'light' ? 'dark' : 'light');
    const updatedStats = { ...stats, theme: target };
    const updatedProfile = { ...profile, theme: target };
    setStats(updatedStats);
    setProfile(updatedProfile);
    StorageService.saveStats(updatedStats);
    StorageService.saveProfile(updatedProfile);
  };

  const handleEarnXP = (
    amount: number,
    deltaCorrect = true,
    counter?: 'clozeCompleted' | 'scramblesCompleted'
  ) => {
    if (!activeVerse) return;
    const { stats: newStats, progress } = StorageService.saveProgress(activeVerse.id, deltaCorrect, amount);
    if (counter) {
      newStats[counter] = (newStats[counter] || 0) + 1;
      StorageService.saveStats(newStats);
    }
    setStats({ ...newStats });
    setProgressMap((prev) => ({ ...prev, [activeVerse.id]: progress }));
  };

  const selectVerseId = (id: string) => {
    setActiveVerseId(id);
    const updatedStats = { ...stats, activeVerseId: id };
    setStats(updatedStats);
    StorageService.saveStats(updatedStats);
  };

  const handleNextVerse = () => {
    if (verses.length <= 1) return;
    // activeVerse, not activeVerseId: the saved id can name a verse this
    // translation's library lacks, which shows as the first verse instead.
    const currentIndex = verses.findIndex((v) => v.id === activeVerse.id);
    selectVerseId(verses[(currentIndex + 1) % verses.length].id);
  };

  const handleRandomVerse = () => {
    if (verses.length <= 1) return;
    const otherVerses = verses.filter((v) => v.id !== activeVerse.id);
    selectVerseId(otherVerses[Math.floor(Math.random() * otherVerses.length)].id);
  };

  const handleAddCustomVerse = (newVerse: Omit<Verse, 'id' | 'isCustom'>, translation = profile.preferredTranslation) => {
    const created = StorageService.addCustomVerse(newVerse, translation);
    setVerses(StorageService.getVerses(translation));
    selectVerseId(created.id);
  };

  /** Practise a passage picked in the Bible, reusing the library's copy if it has one. */
  const handlePickPassage = (passage: PickedPassage, translation = profile.preferredTranslation) => {
    const library = StorageService.getVerses(translation);
    const existing = library.find((v) => v.reference === passage.reference && v.translation === passage.translation);
    if (existing) {
      setVerses(library);
      selectVerseId(existing.id);
      return;
    }
    const { book, chapter, start, end } = passage.ref;
    handleAddCustomVerse(
      {
        reference: passage.reference,
        book: book.name,
        chapter,
        verseNum: end > start ? `${start}-${end}` : String(start),
        text: passage.text,
        category: 'Custom',
        translation: passage.translation,
        tags: ['custom'],
      },
      translation
    );
  };

  const finishOnboarding = (translation: Translation, first?: FirstVerse) => {
    const updated = { ...profile, preferredTranslation: translation, onboarded: true };
    setProfile(updated);
    StorageService.saveProfile(updated);
    setVerses(StorageService.getVerses(translation));
    if (first?.kind === 'builtIn') selectVerseId(first.id);
    else if (first?.kind === 'passage') handlePickPassage(first.passage, translation);
    setCurrentTab('cloze');
    setNeedsOnboarding(false);
    window.scrollTo({ top: 0 });
  };

  const handleDeleteCustomVerse = (verseId: string) => {
    const filtered = verses.filter((v) => v.id !== verseId);
    setVerses(filtered);
    StorageService.saveVerses(filtered);
    // Persist the new active verse too, or a reload would point at the deleted one.
    if (activeVerse?.id === verseId && filtered.length > 0) {
      selectVerseId(filtered[0].id);
    }
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    StorageService.saveProfile(updated);
    // Built-in verses are worded in the default translation.
    if (updated.preferredTranslation !== profile.preferredTranslation) {
      setVerses(StorageService.getVerses(updated.preferredTranslation));
    }
  };

  const handleDataSynced = (
    newStats: UserStats,
    newProgress: Record<string, VerseProgress>,
    newVerses: Verse[]
  ) => {
    // Merge, don't replace: the cloud doesn't store the review schedule.
    const mergedProgress = mergeProgress(progressMap, newProgress);
    setStats(newStats);
    setProgressMap(mergedProgress);
    StorageService.saveStats(newStats);
    StorageService.saveVerses(newVerses);
    // Re-read so the list takes its usual order now, not at the next reload.
    setVerses(StorageService.getVerses(profile.preferredTranslation));
    try {
      localStorage.setItem('biblica_progress_v1', JSON.stringify(mergedProgress));
    } catch {
      // storage unavailable (private mode); in-memory state still updated
    }
  };

  if (needsOnboarding) {
    return (
      <Onboarding
        initialTranslation={profile.preferredTranslation}
        onFinish={finishOnboarding}
        onSignIn={
          SupabaseService.isConfigured()
            ? (translation) => {
                finishOnboarding(translation);
                setIsAccountOpen(true);
              }
            : undefined
        }
      />
    );
  }

  if (!activeVerse) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas font-display text-lg font-extrabold text-ink-3">
        {translate(uiLang, 'app.opening')}
      </div>
    );
  }

  const app = (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2"
      >
        {translate(uiLang, 'app.skipToContent')}
      </a>

      <Navbar
        stats={stats}
        verse={activeVerse}
        avatarSeed={profile.avatarSeed || 'biblica'}
        title={currentTab === 'account' ? translate(uiLang, 'app.yourProgress') : undefined}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onShuffle={handleRandomVerse}
        onOpenProfile={() => setIsAccountOpen(true)}
      />

      <main id="main" className="pb-tabbar flex flex-1 flex-col">
        <InstallPrompt />
        {currentTab === 'cloze' && (
          <FillBlankMode
            key={activeVerse.id}
            verse={activeVerse}
            progress={progressMap[activeVerse.id]}
            soundEnabled={stats.soundEnabled}
            onCorrect={(xp) => handleEarnXP(xp, true, 'clozeCompleted')}
            onNextVerse={handleNextVerse}
          />
        )}

        {currentTab === 'flashcards' && (
          <FlashcardMode
            verses={verses}
            progressMap={progressMap}
            dailyNew={profile.dailyGoalVerses}
            soundEnabled={stats.soundEnabled}
            onRate={(verseId, rating, xp) => {
              const { stats: newStats, progress } = StorageService.reviewCard(verseId, rating, xp);
              setStats({ ...newStats });
              setProgressMap((prev) => ({ ...prev, [verseId]: progress }));
            }}
          />
        )}

        {currentTab === 'scramble' && (
          <WordScrambleMode
            verse={activeVerse}
            soundEnabled={stats.soundEnabled}
            onCorrect={(xp) => handleEarnXP(xp, true, 'scramblesCompleted')}
            onNextVerse={handleNextVerse}
          />
        )}

        {currentTab === 'trivia' && (
          <TriviaQuizMode
            verses={verses}
            soundEnabled={stats.soundEnabled}
            onFinishQuiz={(_score, earnedXp) => {
              const newStats = StorageService.addXP(earnedXp);
              newStats.quizzesCompleted += 1;
              StorageService.saveStats(newStats);
              setStats({ ...newStats });
            }}
          />
        )}

        {currentTab === 'account' && (
          <StatsView
            stats={stats}
            profile={profile}
            isSignedIn={!!currentUser}
            canSignIn={SupabaseService.isConfigured()}
            verses={verses}
            progressMap={progressMap}
            cardsDue={cardsDue}
            onOpenSettings={() => setIsAccountOpen(true)}
          />
        )}
      </main>

      <LibraryModal
        isOpen={isLibraryOpen}
        openView={libraryView}
        onClose={() => {
          setIsLibraryOpen(false);
          setLibraryView(undefined);
        }}
        verses={verses}
        activeVerseId={activeVerse.id}
        progressMap={progressMap}
        onSelectVerse={(verse) => selectVerseId(verse.id)}
        defaultTranslation={profile.preferredTranslation}
        onAddVerse={(v) => handleAddCustomVerse(v)}
        onPickPassage={(p) => handlePickPassage(p)}
        onDeleteCustomVerse={handleDeleteCustomVerse}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        profile={profile}
        stats={stats}
        progressMap={progressMap}
        verses={verses}
        onUpdateProfile={handleUpdateProfile}
        onToggleTheme={(t) => handleToggleTheme(t)}
        onToggleSound={handleToggleSound}
        onDataSynced={handleDataSynced}
      />

      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} badges={{ flashcards: cardsDue }} />
    </div>
  );

  return <LanguageProvider value={uiLang}>{app}</LanguageProvider>;
}

export default App;
