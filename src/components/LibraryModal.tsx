import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, Trash2, X } from 'lucide-react';
import type { Verse, VerseCategory, VerseProgress, Translation } from '../types/verse';
import { Sheet } from './ui/Sheet';

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

function masteryOf(score: number) {
  if (score >= 80) return { label: 'Mastered', cls: 'bg-brand-soft text-brand-ink' };
  if (score >= 30) return { label: 'Learning', cls: 'bg-teal-soft text-teal-ink' };
  return { label: 'New', cls: 'bg-surface-2 text-ink-2' };
}

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
    const q = searchQuery.toLowerCase();
    return verses.filter((v) => {
      const matchesSearch =
        v.reference.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q));
      const matchesCat =
        selectedCategory === 'All' ? true : selectedCategory === 'Custom' ? !!v.isCustom : v.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [verses, searchQuery, selectedCategory]);

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
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="Library"
      subtitle={`${verses.length} verses`}
      headerAction={
        <button
          type="button"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className={`btn btn-sm ${isAddingNew ? 'btn-secondary' : 'btn-primary'}`}
          aria-expanded={isAddingNew}
        >
          {isAddingNew ? <X className="h-[18px] w-[18px]" strokeWidth={2.5} /> : <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />}
          {isAddingNew ? 'Cancel' : 'Add'}
        </button>
      }
    >
      {isAddingNew && (
        <form onSubmit={handleCreateVerse} className="card animate-rise mb-5 flex flex-col gap-3 p-4" aria-label="Add your own verse">
          <h3 className="font-display text-lg font-extrabold">Add your own verse</h3>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-2">Reference</span>
            <input
              type="text"
              placeholder="e.g. Romans 12:2"
              value={customRef}
              onChange={(e) => setCustomRef(e.target.value)}
              required
              className="field"
            />
          </label>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Translation</span>
              <select value={customTranslation} onChange={(e) => setCustomTranslation(e.target.value as Translation)} className="field">
                <option value="KJV">KJV</option>
                <option value="NIV">NIV</option>
                <option value="ESV">ESV</option>
                <option value="NLT">NLT</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Category</span>
              <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as VerseCategory)} className="field">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-2">Verse text</span>
            <textarea
              placeholder="Type or paste the verse"
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              required
              className="field font-scripture text-[1.0625rem] leading-relaxed"
            />
          </label>
          <button type="submit" className="btn btn-primary mt-1">
            Save verse
          </button>
        </form>
      )}

      <div className="sticky top-0 z-10 -mx-5 bg-canvas px-5 pb-3">
        <label className="relative block">
          <span className="sr-only">Search verses</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search reference or words"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field pl-11"
          />
        </label>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-10 shrink-0 rounded-full px-4 font-display text-sm font-extrabold whitespace-nowrap transition-colors ${
                  active ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {filteredVerses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-display text-lg font-extrabold">No verses found</p>
          <p className="max-w-xs text-ink-3">
            {selectedCategory === 'Custom' && !searchQuery
              ? 'Verses you add yourself will show up here.'
              : 'Try another word, or clear the filter.'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              Show all verses
            </button>
          )}
        </div>
      ) : (
        <ul className="group-list">
          {filteredVerses.map((verse) => {
            const isCurrent = verse.id === activeVerseId;
            const score = progressMap[verse.id]?.masteryScore ?? 0;
            const m = masteryOf(score);
            return (
              <li key={verse.id} className="relative flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectVerse(verse);
                    onClose();
                  }}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`flex min-w-0 flex-1 flex-col gap-1.5 p-4 text-left transition-colors hover:bg-surface-2 ${
                    isCurrent ? 'bg-brand-soft/60' : ''
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-display text-[1.0625rem] font-extrabold">{verse.reference}</span>
                    <span className="text-sm text-ink-3">{verse.translation}</span>
                    {isCurrent && (
                      <span className="pill bg-brand py-0.5 text-on-brand">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                        Practicing
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 font-scripture leading-relaxed text-ink-2">{verse.text}</span>
                  <span className="flex items-center gap-2 text-sm text-ink-3">
                    <span className={`pill py-0.5 ${m.cls}`}>
                      {m.label}
                      {score > 0 && <span className="font-bold opacity-80">{score}%</span>}
                    </span>
                    <span className="truncate">{verse.category}</span>
                  </span>
                </button>
                {verse.isCustom && onDeleteCustomVerse && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomVerse(verse.id)}
                    className="icon-btn mt-3 mr-3 bg-transparent text-ink-3 hover:!bg-danger-soft hover:!text-danger-ink"
                    aria-label={`Delete ${verse.reference}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
};
