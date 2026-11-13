import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Check, 
  BookMarked, 
  Sparkles,
  Trash2
} from 'lucide-react';
import type { Verse, VerseCategory, VerseProgress, Translation } from '../types/verse';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  activeVerseId: string;
  progressMap: Record<string, VerseProgress>;
  onSelectVerse: (verse: Verse) => void;
  onAddVerse: (verse: Omit<Verse, 'id' | 'isCustom'>) => void;
  onDeleteCustomVerse?: (verseId: string) => void;
}

const CATEGORIES: ('All' | VerseCategory)[] = [
  'All',
  'Essential Classics',
  'Peace & Anxiety',
  'Strength & Courage',
  'Love & Kindness',
  'Faith & Salvation',
  'Wisdom & Guidance',
  'Hope & Comfort',
  'Custom',
];

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  verses,
  activeVerseId,
  progressMap,
  onSelectVerse,
  onAddVerse,
  onDeleteCustomVerse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | VerseCategory>('All');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [customRef, setCustomRef] = useState('');
  const [customText, setCustomText] = useState('');
  const [customCategory, setCustomCategory] = useState<VerseCategory>('Custom');
  const [customTranslation, setCustomTranslation] = useState<Translation>('KJV');

  const filteredVerses = useMemo(() => {
    return verses.filter((v) => {
      const matchesSearch =
        v.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Custom'
          ? !!v.isCustom
          : v.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [verses, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleCreateVerse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRef.trim() || !customText.trim()) return;

    const parts = customRef.trim().split(' ');
    const book = parts.slice(0, -1).join(' ') || 'Scripture';
    const chAndV = parts[parts.length - 1] || '1:1';
    const [ch, num] = chAndV.split(':');

    onAddVerse({
      reference: customRef.trim(),
      book,
      chapter: parseInt(ch) || 1,
      verseNum: num || '1',
      text: customText.trim(),
      category: customCategory,
      translation: customTranslation,
      tags: ['custom'],
    });

    setCustomRef('');
    setCustomText('');
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] apple-card rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-white/[0.12]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Scripture Library</h2>
              <p className="text-xs text-slate-400">Select a verse to practice or create your own</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-white btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reference, book, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/30 btn-press shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingNew ? 'Cancel' : 'Add Custom Verse'}</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-white/[0.06] bg-black/20">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap btn-press ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'bg-white/[0.05] text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Custom Verse Creator Form */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateVerse}
            className="p-5 bg-black/40 border-b border-white/[0.08] flex flex-col gap-3 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add Custom Scripture to Your Deck</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Reference (e.g. Romans 12:2)"
                value={customRef}
                onChange={(e) => setCustomRef(e.target.value)}
                required
                className="px-3.5 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={customTranslation}
                  onChange={(e) => setCustomTranslation(e.target.value as Translation)}
                  className="px-3 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="KJV">KJV</option>
                  <option value="NIV">NIV</option>
                  <option value="ESV">ESV</option>
                  <option value="NLT">NLT</option>
                </select>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as VerseCategory)}
                  className="flex-1 px-3 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Custom">Custom</option>
                  <option value="Essential Classics">Essential Classics</option>
                  <option value="Peace & Anxiety">Peace & Anxiety</option>
                  <option value="Strength & Courage">Strength & Courage</option>
                  <option value="Love & Kindness">Love & Kindness</option>
                  <option value="Faith & Salvation">Faith & Salvation</option>
                  <option value="Wisdom & Guidance">Wisdom & Guidance</option>
                  <option value="Hope & Comfort">Hope & Comfort</option>
                </select>
              </div>
            </div>
            <textarea
              placeholder="Paste or type scripture text here..."
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              required
              className="px-3.5 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-sm text-slate-100 focus:border-blue-500 focus:outline-none font-scripture"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold btn-press shadow-md"
              >
                Save Verse
              </button>
            </div>
          </form>
        )}

        {/* Verses Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredVerses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No verses found matching your search.
            </div>
          ) : (
            filteredVerses.map((verse) => {
              const isCurrent = verse.id === activeVerseId;
              const progress = progressMap[verse.id];
              const score = progress ? progress.masteryScore : 0;

              let statusLabel = 'New';
              let statusColor = 'bg-white/[0.06] text-slate-400 border-white/[0.08]';
              if (score >= 80) {
                statusLabel = 'Mastered';
                statusColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
              } else if (score >= 30) {
                statusLabel = 'Learning';
                statusColor = 'bg-blue-500/15 text-blue-300 border-blue-500/25';
              }

              return (
                <div
                  key={verse.id}
                  onClick={() => {
                    onSelectVerse(verse);
                    onClose();
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 btn-press ${
                    isCurrent
                      ? 'bg-blue-600/15 border-blue-400/50 shadow-lg'
                      : 'apple-card hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        {verse.reference}
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-slate-400">
                        ({verse.translation})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${statusColor}`}
                      >
                        {statusLabel} ({score}%)
                      </span>
                      {verse.isCustom && onDeleteCustomVerse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomVerse(verse.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete custom verse"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 font-scripture line-clamp-2 italic leading-relaxed">
                    "{verse.text}"
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 border border-white/[0.06]">
                      {verse.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
