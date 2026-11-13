import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FillBlankMode } from './components/modes/FillBlankMode';
import { FlashcardMode } from './components/modes/FlashcardMode';
import { WordScrambleMode } from './components/modes/WordScrambleMode';
import { TriviaQuizMode } from './components/modes/TriviaQuizMode';
import { LibraryModal } from './components/LibraryModal';
import { AccountModal } from './components/AccountModal';
import { StatsView } from './components/StatsView';
import { StorageService } from './utils/storage';
import { SupabaseService } from './lib/supabase';
import { newAvatarSeed } from './utils/avatar';
import type { AppTab, UserProfile, UserStats, Verse, VerseProgress } from './types/verse';

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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    const loadedVerses = StorageService.getVerses();
    setVerses(loadedVerses);
    const loadedStats = StorageService.getStats();
    setStats(loadedStats);
    // Give everyone a generated avatar; the seed is random and stays on device.
    const loadedProfile = StorageService.getProfile();
    if (!loadedProfile.avatarSeed) {
      loadedProfile.avatarSeed = newAvatarSeed();
      StorageService.saveProfile(loadedProfile);
    }
    setProfile(loadedProfile);
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
              setProgressMap(remote.progressMap);
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

  // Each tab is its own screen: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentTab]);

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
    const currentIndex = verses.findIndex((v) => v.id === activeVerseId);
    selectVerseId(verses[(currentIndex + 1) % verses.length].id);
  };

  const handleRandomVerse = () => {
    if (verses.length <= 1) return;
    const otherVerses = verses.filter((v) => v.id !== activeVerseId);
    selectVerseId(otherVerses[Math.floor(Math.random() * otherVerses.length)].id);
  };

  const handleAddCustomVerse = (newVerse: Omit<Verse, 'id' | 'isCustom'>) => {
    const created = StorageService.addCustomVerse(newVerse);
    setVerses(StorageService.getVerses());
    selectVerseId(created.id);
  };

  const handleDeleteCustomVerse = (verseId: string) => {
    const filtered = verses.filter((v) => v.id !== verseId);
    setVerses(filtered);
    StorageService.saveVerses(filtered);
    // Persist the new active verse too, or a reload would point at the deleted one.
    if (activeVerseId === verseId && filtered.length > 0) {
      selectVerseId(filtered[0].id);
    }
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    StorageService.saveProfile(updated);
  };

  const handleDataSynced = (
    newStats: UserStats,
    newProgress: Record<string, VerseProgress>,
    newVerses: Verse[]
  ) => {
    setStats(newStats);
    setProgressMap(newProgress);
    setVerses(newVerses);
    StorageService.saveStats(newStats);
    StorageService.saveVerses(newVerses);
    try {
      localStorage.setItem('biblica_progress_v1', JSON.stringify(newProgress));
    } catch {
      // storage unavailable (private mode); in-memory state still updated
    }
  };

  if (!activeVerse) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas font-display text-lg font-extrabold text-ink-3">
        Opening Biblica…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <Navbar
        stats={stats}
        verse={activeVerse}
        avatarSeed={profile.avatarSeed || 'biblica'}
        title={currentTab === 'account' ? 'Your progress' : undefined}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onShuffle={handleRandomVerse}
        onOpenProfile={() => setIsAccountOpen(true)}
      />

      <main id="main" className="pb-tabbar flex flex-1 flex-col">
        {currentTab === 'cloze' && (
          <FillBlankMode
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
            soundEnabled={stats.soundEnabled}
            onRate={(verseId, _rating, xp) => {
              const { stats: newStats, progress } = StorageService.saveProgress(verseId, true, xp);
              newStats.cardsReviewed = (newStats.cardsReviewed || 0) + 1;
              StorageService.saveStats(newStats);
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
            onOpenSettings={() => setIsAccountOpen(true)}
          />
        )}
      </main>

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        verses={verses}
        activeVerseId={activeVerseId}
        progressMap={progressMap}
        onSelectVerse={(verse) => selectVerseId(verse.id)}
        onAddVerse={handleAddCustomVerse}
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

      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}

export default App;
