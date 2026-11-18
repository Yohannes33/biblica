import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Check, Trash2, X, RotateCw } from 'lucide-react';
import type { Verse, VerseCategory, VerseProgress, Translation } from '../types/verse';
import { languageOf, translationInfo, translationLabel, TRANSLATIONS } from '../data/translations';
import { bookNameIn, formatReference, getPassage, parseReference, translationNameIn } from '../lib/bible';
import { translateCategory, useT, type StringKey } from '../i18n';
import { Sheet } from './ui/Sheet';
import { BibleBrowser, type PickedPassage } from './BibleBrowser';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  activeVerseId: string;
  progressMap: Record<string, VerseProgress>;
  onSelectVerse: (verse: Verse) => void;
  defaultTranslation: Translation;
  onAddVerse: (verse: Omit<Verse, 'id' | 'isCustom'>) => void;
  onDeleteCustomVerse?: (verseId: string) => void;
  onPickPassage: (passage: PickedPassage) => void;
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

function masteryOf(score: number): { label: StringKey; cls: string } {
  if (score >= 80) return { label: 'mastery.Mastered', cls: 'bg-brand-soft text-brand-ink' };
  if (score >= 30) return { label: 'mastery.Learning', cls: 'bg-teal-soft text-teal-ink' };
  return { label: 'mastery.New', cls: 'bg-surface-2 text-ink-2' };
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  verses,
  activeVerseId,
  progressMap,
  onSelectVerse,
  defaultTranslation,
  onAddVerse,
  onDeleteCustomVerse,
  onPickPassage,
}) => {
  const t = useT();
  // A category's name; one saved by an older build without a string shows as it is.
  const categoryName = (c: 'All' | VerseCategory) => translateCategory(t.lang, c);
  // The reader's saved verses, or the whole Bible in their default translation.
  const [view, setView] = useState<'mine' | 'bible'>('mine');
  const showView = (next: 'mine' | 'bible') => {
    setView(next);
    if (next === 'bible') setIsAddingNew(false);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | VerseCategory>('All');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [customRef, setCustomRef] = useState('');
  const [customCategory, setCustomCategory] = useState<VerseCategory>('Custom');
  const [customTranslation, setCustomTranslation] = useState<Translation>(defaultTranslation);
  const [retryCount, setRetryCount] = useState(0);
  // The result is tagged with the lookup it answers, so a reply for an
  // earlier reference or translation never shows under the current one.
  const [lookup, setLookup] = useState<{ key: string; text?: string; error?: string; offline?: boolean } | null>(null);
  // Hold back "No book called “R”" until the reader pauses, so a half-typed
  // reference isn't flagged (or announced) on every keystroke.
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  // Each time the library opens, the add form starts in the default
  // translation, which may have changed in settings while it was closed.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCustomTranslation(defaultTranslation);
  }

  const parsed = useMemo(() => (customRef.trim() ? parseReference(customRef, t.lang) : null), [customRef, t.lang]);
  const passageRef = parsed?.ok ? parsed.ref : null;
  const formInfo = translationInfo(customTranslation);
  const reference = passageRef ? formatReference(passageRef, formInfo.language) : '';
  const lookupKey = passageRef ? `${customTranslation} ${reference} ${retryCount} ${t.lang}` : '';

  useEffect(() => {
    if (!passageRef) return;
    let cancelled = false;
    // Wait for typing to settle before fetching a book.
    const timer = window.setTimeout(() => {
      getPassage(customTranslation, passageRef, t.lang).then(
        (result) => {
          if (!cancelled) setLookup(result.ok ? { key: lookupKey, text: result.text } : { key: lookupKey, error: result.error });
        },
        () => {
          if (!cancelled) setLookup({ key: lookupKey, offline: true });
        }
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // lookupKey covers passageRef, the translation and the interface language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey]);

  const current = lookup?.key === lookupKey ? lookup : null;
  const isDuplicate =
    !!reference && verses.some((v) => v.reference === reference && v.translation === customTranslation);
  const canSave = !!current?.text && !isDuplicate;

  const filteredVerses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return verses.filter((v) => {
      const matchesSearch =
        v.reference.toLowerCase().includes(q) ||
        // Amharic references use Amharic names; v.book keeps the English one.
        `${v.book} ${v.chapter}:${v.verseNum}`.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q));
      const matchesCat =
        selectedCategory === 'All' ? true : selectedCategory === 'Custom' ? !!v.isCustom : v.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [verses, searchQuery, selectedCategory]);

  const handleCreateVerse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passageRef || !current?.text || isDuplicate) return;
    const { book, chapter, start, end } = passageRef;

    onAddVerse({
      reference,
      book: book.name,
      chapter,
      verseNum: end > start ? `${start}-${end}` : String(start),
      text: current.text,
      category: customCategory,
      translation: customTranslation,
      tags: ['custom'],
    });

    setCustomRef('');
    setLookup(null);
    setIsAddingNew(false);
  };

  let preview: React.ReactNode;
  if (!parsed || (!parsed.ok && isTyping)) {
    preview = (
      <p className="text-sm text-ink-3">
        {formInfo.newTestamentOnly
          ? t('library.hintNewTestament')
          : t('library.hintWholeBible')}
      </p>
    );
  } else if (!parsed.ok) {
    preview = <p className="text-sm font-semibold text-danger-ink">{parsed.error}</p>;
  } else if (!current) {
    preview = <p className="text-sm text-ink-3">{t('library.lookingUp', { reference })}</p>;
  } else if (current.offline) {
    preview = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold text-danger-ink">
          {t('library.loadFailed', { book: bookNameIn(passageRef!.book, t.lang) })}
        </p>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRetryCount((n) => n + 1)}>
          <RotateCw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('common.tryAgain')}
        </button>
      </div>
    );
  } else if (current.error) {
    preview = <p className="text-sm font-semibold text-danger-ink">{current.error}</p>;
  } else {
    preview = (
      <figure className="rounded-xl bg-surface-2 p-3">
        <figcaption className="mb-1 font-display text-sm font-extrabold text-ink-2">
          <span lang={formInfo.language}>{reference}</span> · <span lang={formInfo.language}>{formInfo.label}</span>
        </figcaption>
        <blockquote lang={formInfo.language} className="font-scripture leading-relaxed text-ink">
          {current.text}
        </blockquote>
        {isDuplicate && <p className="mt-2 text-sm font-semibold text-ink-2">{t('library.alreadyAdded')}</p>}
      </figure>
    );
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={t('library.title')}
      subtitle={view === 'mine' ? t.count('verses', verses.length) : translationNameIn(defaultTranslation, t.lang)}
      headerAction={
        view === 'mine' && (
          <button
            type="button"
            onClick={() => {
              // Each new verse starts in the reader's default translation.
              if (!isAddingNew) setCustomTranslation(defaultTranslation);
              setIsAddingNew(!isAddingNew);
            }}
            className={`btn btn-sm ${isAddingNew ? 'btn-secondary' : 'btn-primary'}`}
            aria-expanded={isAddingNew}
          >
            {isAddingNew ? <X className="h-[18px] w-[18px]" strokeWidth={2.5} /> : <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />}
            {isAddingNew ? t('common.cancel') : t('library.add')}
          </button>
        )
      }
    >
      <div className="segmented mb-4" role="group" aria-label={t('library.viewLabel')}>
        <button type="button" aria-pressed={view === 'mine'} onClick={() => showView('mine')}>
          {t('library.mine')}
        </button>
        <button type="button" aria-pressed={view === 'bible'} onClick={() => showView('bible')}>
          {t('library.bible')}
        </button>
      </div>

      {/* Both views stay mounted, so switching keeps the reader's place in each. */}
      <div hidden={view !== 'bible'}>
        <BibleBrowser
          key={defaultTranslation}
          translation={defaultTranslation}
          pickLabel={t('library.memorise')}
          hasReference={(ref) => verses.some((v) => v.reference === ref && v.translation === defaultTranslation)}
          onPick={(passage) => {
            onPickPassage(passage);
            showView('mine');
            onClose();
          }}
        />
      </div>

      <div hidden={view !== 'mine'}>
        {isAddingNew && (
          <form onSubmit={handleCreateVerse} className="card animate-rise mb-5 flex flex-col gap-3 p-4" aria-label={t('library.addTitle')}>
            <h3 className="font-display text-lg font-extrabold">{t('library.addTitle')}</h3>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink-2">{t('library.reference')}</span>
              <input
                type="text"
                placeholder={t('library.referencePlaceholder')}
                value={customRef}
                onChange={(e) => {
                  setCustomRef(e.target.value);
                  setIsTyping(true);
                  window.clearTimeout(typingTimer.current);
                  typingTimer.current = window.setTimeout(() => setIsTyping(false), 800);
                }}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                aria-describedby="add-verse-preview"
                className="field"
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-semibold text-ink-2">{t('library.translation')}</legend>
              <div className="grid grid-cols-4 gap-2">
                {TRANSLATIONS.map(({ id, label, language }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={customTranslation === id}
                    onClick={() => setCustomTranslation(id)}
                    className={`min-h-11 rounded-xl font-display font-extrabold transition-colors ${
                      customTranslation === id ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2'
                    }`}
                  >
                    <span lang={language}>{label}</span>
                    <span lang={id === 'AMH' ? t.lang : 'en'} className="sr-only">, {translationNameIn(id, t.lang)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div id="add-verse-preview" aria-live="polite" className="min-h-6">
              {preview}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink-2">{t('library.category')}</span>
              <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as VerseCategory)} className="field">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {categoryName(c)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary mt-1" disabled={!canSave}>
              {t('library.addToLibrary')}
            </button>
          </form>
        )}

        <div className="sticky top-0 z-10 -mx-5 bg-canvas px-5 pb-3">
          <label className="relative block">
            <span className="sr-only">{t('library.searchLabel')}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input
              type="search"
              placeholder={t('library.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field pl-11"
            />
          </label>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" role="group" aria-label={t('library.filterLabel')}>
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
                  {categoryName(cat)}
                </button>
              );
            })}
          </div>
        </div>

        {filteredVerses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-display text-lg font-extrabold">{t('library.emptyTitle')}</p>
            <p className="max-w-xs text-ink-3">
              {selectedCategory === 'Custom' && !searchQuery
                ? t('library.emptyCustom')
                : t('library.emptyFiltered')}
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
                {t('library.showAll')}
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
                <li key={verse.id} className={`relative flex items-start gap-1 ${isCurrent ? 'bg-brand-soft/60' : ''}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVerse(verse);
                      onClose();
                    }}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`flex min-w-0 flex-1 flex-col gap-1.5 p-4 text-left transition-colors ${
                      isCurrent ? '' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span lang={languageOf(verse.translation)} className="font-display text-[1.0625rem] font-extrabold">
                        {verse.reference}
                      </span>
                      <span lang={languageOf(verse.translation)} className="text-sm text-ink-3">
                        {translationLabel(verse.translation)}
                      </span>
                      {isCurrent && (
                        <span className="pill bg-brand py-0.5 text-on-brand">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                          {t('library.practicing')}
                        </span>
                      )}
                    </span>
                    <span lang={languageOf(verse.translation)} className="line-clamp-2 font-scripture leading-relaxed text-ink-2">
                      {verse.text}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-ink-3">
                      <span className={`pill py-0.5 ${m.cls}`}>
                        {t(m.label)}
                        {score > 0 && <span className="font-bold opacity-80">{score}%</span>}
                      </span>
                      <span className="truncate">{categoryName(verse.category)}</span>
                    </span>
                  </button>
                  {verse.isCustom && onDeleteCustomVerse &&
                    (confirmDeleteId === verse.id ? (
                      // Second tap confirms. Moving focus away cancels.
                      <button
                        type="button"
                        autoFocus
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onDeleteCustomVerse(verse.id);
                        }}
                        onBlur={() => setConfirmDeleteId(null)}
                        className="mt-3 mr-3 min-h-11 shrink-0 rounded-xl bg-danger px-3 font-display text-sm font-extrabold text-[var(--on-danger)]"
                        aria-label={t('library.confirmDelete', { reference: verse.reference })}
                      >
                        {t('library.delete')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(verse.id)}
                        className="icon-btn mt-3 mr-3 bg-transparent text-ink-3 hover:!bg-danger-soft hover:!text-danger-ink"
                        aria-label={t('library.deleteVerse', { reference: verse.reference })}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
};
