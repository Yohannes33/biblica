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
import type { AppTab, UserProfile, UserStats, Verse, VerseProgress } from './types/verse';
import { Bookmark, Shuffle, ChevronRight } from 'lucide-react';

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

  // Apply theme class to <html> element
  useEffect(() => {
    const currentTheme = stats.theme || 'light';
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [stats.theme]);

  // Initial data load
  useEffect(() => {
    const loadedVerses = StorageService.getVerses();
    setVerses(loadedVerses);
    const loadedStats = StorageService.getStats();
    setStats(loadedStats);
    setProfile(StorageService.getProfile());
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

  const handleEarnXP = (amount: number, deltaCorrect = true) => {
    if (!activeVerse) return;
    const { stats: newStats, progress } = StorageService.saveProgress(
      activeVerse.id,
      deltaCorrect,
      amount
    );
    setStats({ ...newStats });
    setProgressMap((prev) => ({ ...prev, [activeVerse.id]: progress }));
  };

  const handleNextVerse = () => {
    if (verses.length <= 1) return;
    const currentIndex = verses.findIndex((v) => v.id === activeVerseId);
    const nextIndex = (currentIndex + 1) % verses.length;
    const nextVerse = verses[nextIndex];
    setActiveVerseId(nextVerse.id);
    const updatedStats = { ...stats, activeVerseId: nextVerse.id };
    setStats(updatedStats);
    StorageService.saveStats(updatedStats);
  };

  const handleRandomVerse = () => {
    if (verses.length <= 1) return;
    const otherVerses = verses.filter((v) => v.id !== activeVerseId);
    const random = otherVerses[Math.floor(Math.random() * otherVerses.length)];
    setActiveVerseId(random.id);
    const updatedStats = { ...stats, activeVerseId: random.id };
    setStats(updatedStats);
    StorageService.saveStats(updatedStats);
  };

  const handleSelectVerse = (verse: Verse) => {
    setActiveVerseId(verse.id);
    const updatedStats = { ...stats, activeVerseId: verse.id };
    setStats(updatedStats);
    StorageService.saveStats(updatedStats);
  };

  const handleAddCustomVerse = (newVerse: Omit<Verse, 'id' | 'isCustom'>) => {
    const created = StorageService.addCustomVerse(newVerse);
    const updatedVerses = StorageService.getVerses();
    setVerses(updatedVerses);
    setActiveVerseId(created.id);
  };

  const handleDeleteCustomVerse = (verseId: string) => {
    const filtered = verses.filter((v) => v.id !== verseId);
    setVerses(filtered);
    StorageService.saveVerses(filtered);
    if (activeVerseId === verseId && filtered.length > 0) {
      setActiveVerseId(filtered[0].id);
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
      // storage
    }
  };

  if (!activeVerse) {
    return (
      <div className="min-h-screen theme-canvas flex items-center justify-center font-medium">
        Loading Biblica...
      </div>
    );
  }

  return (
    <div className="theme-canvas min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Clean Navbar */}
      <Navbar
        stats={stats}
        profile={profile}
        currentUser={currentUser}
        onToggleSound={handleToggleSound}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onToggleTheme={() => handleToggleTheme()}
      />

      {/* Scripture Switcher Bar */}
      {currentTab !== 'account' && (
        <div className="px-4 py-2.5 max-w-2xl mx-auto w-full">
          <div className="theme-card rounded-2xl px-4 py-2 flex items-center justify-between gap-3 shadow-sm">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white btn-press"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Bookmark className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold tracking-tight text-slate-900 dark:text-white">
                {activeVerse.reference}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                ({activeVerse.translation})
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={handleRandomVerse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-subtle text-xs font-semibold text-slate-600 dark:text-slate-300 btn-press"
              title="Shuffle Random Scripture"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-medium hidden sm:inline">Shuffle</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentTab === 'cloze' && (
          <FillBlankMode
            verse={activeVerse}
            progress={progressMap[activeVerse.id]}
            soundEnabled={stats.soundEnabled}
            onCorrect={(xp) => handleEarnXP(xp, true)}
            onNextVerse={handleNextVerse}
          />
        )}

        {currentTab === 'flashcards' && (
          <FlashcardMode
            verses={verses}
            soundEnabled={stats.soundEnabled}
            onRate={(verseId, _rating, xp) => {
              const { stats: newStats, progress } = StorageService.saveProgress(
                verseId,
                true,
                xp
              );
              setStats({ ...newStats });
              setProgressMap((prev) => ({ ...prev, [verseId]: progress }));
            }}
          />
        )}

        {currentTab === 'scramble' && (
          <WordScrambleMode
            verse={activeVerse}
            soundEnabled={stats.soundEnabled}
            onCorrect={(xp) => handleEarnXP(xp, true)}
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

        {currentTab === 'library' && (
          <div className="max-w-2xl mx-auto p-4 w-full">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="w-full py-4 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 btn-press"
            >
              <Bookmark className="w-5 h-5" />
              <span>Browse All Verses ({verses.length})</span>
            </button>
          </div>
        )}

        {currentTab === 'account' && (
          <div className="flex-1 flex flex-col">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{profile.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{profile.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAccountOpen(true)}
                className="px-4 py-2 rounded-xl theme-card border border-inherit text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white shadow-sm btn-press"
              >
                Settings & Sync
              </button>
            </div>
            <StatsView stats={stats} verses={verses} progressMap={progressMap} />
          </div>
        )}
      </main>

      {/* Library Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        verses={verses}
        activeVerseId={activeVerseId}
        progressMap={progressMap}
        onSelectVerse={handleSelectVerse}
        onAddVerse={handleAddCustomVerse}
        onDeleteCustomVerse={handleDeleteCustomVerse}
      />

      {/* Account & Supabase Settings Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        profile={profile}
        stats={stats}
        progressMap={progressMap}
        verses={verses}
        onUpdateProfile={handleUpdateProfile}
        onToggleTheme={(t) => handleToggleTheme(t)}
        onDataSynced={handleDataSynced}
      />

      {/* Floating Bottom Nav */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'library') {
            setIsLibraryOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
      />
    </div>
  );
}

export default App;
