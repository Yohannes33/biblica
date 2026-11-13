import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FillBlankMode } from './components/modes/FillBlankMode';
import { FlashcardMode } from './components/modes/FlashcardMode';
import { WordScrambleMode } from './components/modes/WordScrambleMode';
import { TriviaQuizMode } from './components/modes/TriviaQuizMode';
import { LibraryModal } from './components/LibraryModal';
import { StatsView } from './components/StatsView';
import { StorageService } from './utils/storage';
import type { AppTab, UserStats, Verse, VerseProgress } from './types/verse';
import { Bookmark, Shuffle, ChevronRight } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [activeVerseId, setActiveVerseId] = useState<string>('');
  const [stats, setStats] = useState<UserStats>(StorageService.getStats());
  const [progressMap, setProgressMap] = useState<Record<string, VerseProgress>>({});
  const [currentTab, setCurrentTab] = useState<AppTab>('cloze');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const loadedVerses = StorageService.getVerses();
    setVerses(loadedVerses);
    const loadedStats = StorageService.getStats();
    setStats(loadedStats);
    setProgressMap(StorageService.getProgressMap());

    if (loadedVerses.length > 0) {
      setActiveVerseId(loadedStats.activeVerseId || loadedVerses[0].id);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const activeVerse = verses.find((v) => v.id === activeVerseId) || verses[0];

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleToggleSound = () => {
    const updated = { ...stats, soundEnabled: !stats.soundEnabled };
    setStats(updated);
    StorageService.saveStats(updated);
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

  if (!activeVerse) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-400">
        Loading Biblica...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Apple-style Translucent Header */}
      <Navbar
        stats={stats}
        onToggleSound={handleToggleSound}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        canInstall={!!deferredPrompt}
        onInstall={handleInstallClick}
      />

      {/* Quick Scripture Navigation Island */}
      {currentTab !== 'stats' && (
        <div className="px-4 py-2.5 max-w-2xl mx-auto w-full">
          <div className="apple-glass rounded-2xl px-3.5 py-1.5 flex items-center justify-between gap-2 border border-white/[0.08]">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white btn-press"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white tracking-tight">{activeVerse.reference}</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                ({activeVerse.translation})
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={handleRandomVerse}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 btn-press"
              title="Shuffle Random Verse"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Shuffle</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Mode View */}
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
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 btn-press"
            >
              <Bookmark className="w-5 h-5" />
              <span>Browse All Verses ({verses.length})</span>
            </button>
          </div>
        )}

        {currentTab === 'stats' && (
          <StatsView
            stats={stats}
            verses={verses}
            progressMap={progressMap}
          />
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

      {/* iOS Floating Island Tab Bar */}
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
