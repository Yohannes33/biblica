import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Shuffle, ChevronLeft, ChevronRight, Square, RefreshCw, Mic, ArrowLeftRight, PartyPopper } from 'lucide-react';
import type { Verse, VerseProgress } from '../../types/verse';
import { playSound } from '../../utils/audio';
import { fireCelebrationConfetti } from '../../utils/confetti';
import { useSpeech } from '../../utils/useSpeech';
import { scoreRecitation, useRecitation, type RecitationResult } from '../../utils/useRecitation';
import {
  buildReviewQueue,
  formatDueDate,
  formatInterval,
  isNewCard,
  nextDueAfterToday,
  nextInterval,
  type Rating,
} from '../../utils/srs';

interface FlashcardModeProps {
  verses: Verse[];
  progressMap: Record<string, VerseProgress>;
  dailyNew: number; // the Daily goal setting: new cards introduced per day
  soundEnabled: boolean;
  onRate: (verseId: string, rating: Rating, xp: number) => void;
}

// How many cards later an "Again" card comes back in the same session.
const AGAIN_GAP = 3;

const RATINGS: { id: Rating; label: string; xp: number; cls: string }[] = [
  { id: 'again', label: 'Again', xp: 2, cls: 'bg-danger-soft text-danger-ink [--edge:var(--danger)]' },
  { id: 'hard', label: 'Hard', xp: 8, cls: 'bg-flame-soft text-flame-ink [--edge:var(--flame)]' },
  { id: 'good', label: 'Good', xp: 15, cls: 'bg-teal-soft text-teal-ink [--edge:var(--teal)]' },
  { id: 'easy', label: 'Easy', xp: 25, cls: 'bg-brand-soft text-brand-ink [--edge:var(--brand)]' },
];

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ verses, progressMap, dailyNew, soundEnabled, onRate }) => {
  const [deck, setDeck] = useState<'review' | 'all'>('review');
  // The review queue is fixed for the session so rating a card doesn't reshuffle it.
  const [session, setSession] = useState(() => buildReviewQueue(verses, progressMap, dailyNew));
  const [pos, setPos] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipMode, setFlipMode] = useState<'ref-to-text' | 'text-to-ref'>('ref-to-text');
  const [result, setResult] = useState<RecitationResult | null>(null);
  const speech = useSpeech();
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const flipFocus = useRef(false);

  // A verse deleted (or replaced by sync) mid-session drops out of the queue
  // instead of ending the session early.
  const queue = useMemo(() => session.ids.filter((id) => verses.some((v) => v.id === id)), [session.ids, verses]);
  const currentVerse: Verse | undefined =
    deck === 'review' ? verses.find((v) => v.id === queue[pos]) : verses[currentIndex] || verses[0];
  const cardKey = deck === 'review' ? `r${pos}` : `a${currentIndex}`;

  const startReview = () => {
    setSession(buildReviewQueue(verses, progressMap, dailyNew));
    setPos(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setDeck('review');
  };

  const recite = useRecitation((transcript) => {
    if (!currentVerse) return;
    const scored = scoreRecitation(currentVerse.text, transcript);
    setResult(scored);
    playSound.cardFlip(soundEnabled);
    flipFocus.current = true;
    setIsFlipped(true);
    if (scored.percent >= 95) {
      playSound.correct(soundEnabled);
      fireCelebrationConfetti();
    }
  });
  const canRecite = recite.supported && flipMode === 'ref-to-text';

  const { stop: stopSpeech, clearError: clearSpeechError } = speech;
  const { cancel: cancelRecite, clearError: clearReciteError } = recite;
  // A new card (or prompt mode) starts clean: no audio, no mic, no old score.
  useEffect(() => {
    stopSpeech();
    clearSpeechError();
    cancelRecite();
    clearReciteError();
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey, flipMode]);

  // Move focus to the face that is now showing, so keyboard and screen-reader
  // users aren't left on a control that just became hidden.
  useEffect(() => {
    if (!flipFocus.current) return;
    flipFocus.current = false;
    // After the last card the card is gone, so land on the "All caught up" heading.
    const target = !currentVerse ? doneRef.current : isFlipped ? backRef.current : frontRef.current;
    target?.focus({ preventScroll: true });
  }, [isFlipped, cardKey]);

  const handleFlip = () => {
    if (recite.isListening) recite.cancel();
    playSound.cardFlip(soundEnabled);
    flipFocus.current = true;
    setIsFlipped(!isFlipped);
  };

  const goTo = (index: number) => {
    setIsFlipped(false);
    setCurrentIndex(index);
  };

  const handleRate = (rating: Rating, xp: number) => {
    if (!currentVerse) return;
    if (rating === 'easy' || rating === 'good') {
      playSound.correct(soundEnabled);
      if (rating === 'easy') fireCelebrationConfetti();
    } else {
      playSound.incorrect(soundEnabled);
    }
    onRate(currentVerse.id, rating, xp);
    flipFocus.current = true;
    setIsFlipped(false);
    if (deck === 'review') {
      setReviewedCount((n) => n + 1);
      if (rating === 'again') {
        // Show it again a few cards from now, before the session ends.
        setSession((q) => {
          const ids = [...queue];
          ids.splice(Math.min(pos + 1 + AGAIN_GAP, ids.length), 0, currentVerse.id);
          return { ...q, ids };
        });
      }
      setPos((p) => p + 1);
    } else {
      setCurrentIndex((i) => (i + 1) % verses.length);
    }
  };

  const remaining = deck === 'review' ? Math.max(0, queue.length - pos) : 0;
  const nextDue = nextDueAfterToday(verses, progressMap);
  const cardIsNew = currentVerse ? isNewCard(progressMap[currentVerse.id]) : false;

  const status = recite.error || speech.error || speech.hint;
  const faceBase = 'card absolute inset-0 flex flex-col p-6 backface-hidden sm:p-8';
  // Hidden faces must never take taps (WebKit can hit-test a backface).
  const hiddenFace = 'pointer-events-none';

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4">
      <div className="flex items-center gap-2">
        <div className="segmented flex-1" role="group" aria-label="Deck">
          <button type="button" aria-pressed={deck === 'review'} onClick={startReview}>
            Review
          </button>
          <button
            type="button"
            aria-pressed={deck === 'all'}
            onClick={() => {
              setDeck('all');
              setIsFlipped(false);
            }}
          >
            All cards
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setFlipMode(flipMode === 'ref-to-text' ? 'text-to-ref' : 'ref-to-text');
            setIsFlipped(false);
          }}
          className="icon-btn h-12 w-12"
          aria-pressed={flipMode === 'text-to-ref'}
          aria-label="Show the verse first, guess the reference"
          title={flipMode === 'ref-to-text' ? 'Show the verse first' : 'Show the reference first'}
        >
          <ArrowLeftRight className="h-5 w-5" />
        </button>
        {deck === 'all' && (
          <button
            type="button"
            onClick={() => goTo(Math.floor(Math.random() * verses.length))}
            className="icon-btn h-12 w-12"
            aria-label="Random card"
            title="Random card"
          >
            <Shuffle className="h-5 w-5" />
          </button>
        )}
      </div>

      <p className="px-1 font-display text-sm font-extrabold text-ink-3 tabular-nums" aria-live="polite">
        {deck === 'review'
          ? currentVerse
            ? `${remaining} left today${cardIsNew ? ' · new card' : ''}`
            : `${reviewedCount} reviewed this session`
          : `Card ${currentIndex + 1} of ${verses.length}`}
      </p>

      {!currentVerse ? (
        <section className="card animate-rise flex flex-col items-center gap-4 p-6 text-center sm:p-8" aria-live="polite">
          <span className="animate-pop grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand-ink">
            <PartyPopper className="h-8 w-8" strokeWidth={2.25} />
          </span>
          <div>
            <h2 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-extrabold tracking-tight outline-none">
              All caught up!
            </h2>
            <p className="mt-1 max-w-sm text-ink-2">
              {reviewedCount > 0
                ? `You reviewed ${reviewedCount} ${reviewedCount === 1 ? 'card' : 'cards'}. `
                : 'Nothing is due right now. '}
              {nextDue
                ? `Next review: ${formatDueDate(nextDue.at)} (${nextDue.count} ${nextDue.count === 1 ? 'verse' : 'verses'}).`
                : 'Rate a few cards and Biblica will schedule them for you.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeck('all');
              setIsFlipped(false);
            }}
            className="btn btn-secondary w-full sm:w-auto"
          >
            Practice all cards
          </button>
          <p className="text-sm text-ink-3">New cards per day follow your Daily goal in Profile &amp; settings.</p>
        </section>
      ) : (
        <>
      {/* Flip card */}
      <div className="perspective-1000 h-[22rem] w-full sm:h-96">
        <div
          className={`transform-style-preserve-3d relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front: tapping the card flips it; the Flip button below is the keyboard path. */}
          <div
            ref={frontRef}
            tabIndex={-1}
            role="region"
            aria-label="Card front"
            aria-hidden={isFlipped}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('button') && !recite.isListening) handleFlip();
            }}
            className={`${faceBase} cursor-pointer items-center justify-center text-center shadow-[0_6px_0_var(--line)] outline-none ${
              isFlipped ? hiddenFace : ''
            }`}
          >
            <span className="absolute top-5 left-6 text-sm text-ink-3 sm:left-8">{currentVerse.category}</span>
            {deck === 'review' && (
              <span className={`pill absolute top-4 right-5 sm:right-7 ${cardIsNew ? 'bg-teal-soft text-teal-ink' : 'bg-surface-2 text-ink-2'}`}>
                {cardIsNew ? 'New' : 'Review'}
              </span>
            )}
            {flipMode === 'ref-to-text' ? (
              <>
                <span className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{currentVerse.reference}</span>
                <span className="pill mt-3 bg-surface-2 text-ink-2">{currentVerse.translation}</span>
                {recite.isListening ? (
                  <span className="mt-5 line-clamp-3 max-w-sm font-scripture text-lg leading-relaxed text-ink-2" aria-live="polite">
                    {recite.interim || 'Listening…'}
                  </span>
                ) : (
                  <span className="mt-5 max-w-xs text-ink-2">
                    {canRecite ? 'Recite it out loud and Biblica will check you.' : 'Recite it from memory, then flip to check.'}
                  </span>
                )}
                {canRecite && (
                  <button
                    type="button"
                    tabIndex={isFlipped ? -1 : 0}
                    onClick={() => (recite.isListening ? recite.stop() : recite.start())}
                    aria-pressed={recite.isListening}
                    className={`btn btn-sm mt-5 ${recite.isListening ? 'btn-primary animate-slot' : 'btn-secondary'}`}
                  >
                    {recite.isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                    {recite.isListening ? 'Done' : 'Recite'}
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="max-h-48 overflow-y-auto font-scripture text-xl leading-relaxed sm:text-2xl">
                  {currentVerse.text}
                </span>
                <span className="mt-6 text-ink-2">Which verse is this?</span>
              </>
            )}
            {!recite.isListening && (
              <span className="absolute bottom-5 flex items-center gap-1.5 font-display text-sm font-extrabold text-brand-ink" aria-hidden="true">
                <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
                Tap to flip
              </span>
            )}
          </div>

          {/* Back */}
          <div
            ref={backRef}
            tabIndex={-1}
            role="region"
            aria-label={`Answer: ${currentVerse.reference}`}
            aria-hidden={!isFlipped}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('button')) handleFlip();
            }}
            className={`${faceBase} rotate-y-180 cursor-pointer border-2 border-brand outline-none ${isFlipped ? '' : hiddenFace}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold">{currentVerse.reference}</p>
                <p className="text-sm text-ink-3">{currentVerse.translation}</p>
              </div>
              {speech.supported && (
                <button
                  type="button"
                  tabIndex={isFlipped ? 0 : -1}
                  onClick={() => speech.toggle(currentVerse.text)}
                  className="icon-btn"
                  aria-pressed={speech.isSpeaking}
                  aria-label={speech.isSpeaking ? 'Stop reading' : 'Read verse aloud'}
                >
                  {speech.isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}
            </div>
            <p className="my-auto max-h-56 overflow-y-auto py-3 text-center font-scripture text-xl leading-relaxed sm:text-2xl">
              {result
                ? result.words.map((w, i) => (
                    <React.Fragment key={i}>
                      <span className={w.matched ? '' : 'text-danger-ink underline decoration-wavy decoration-2 underline-offset-4'}>
                        {w.text}
                      </span>{' '}
                    </React.Fragment>
                  ))
                : currentVerse.text}
            </p>
            <p className="text-center text-sm text-ink-3">
              {result ? (
                <>
                  You got{' '}
                  <span className="font-display font-extrabold text-ink tabular-nums">
                    {result.matched} of {result.total}
                  </span>{' '}
                  words. Missed words are underlined.
                </>
              ) : (
                'How well did you remember it?'
              )}
            </p>
          </div>
        </div>
      </div>

      {status && (
        <p role="status" className="animate-rise rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-2">
          {status}
        </p>
      )}

      {isFlipped ? (
        <div className="animate-rise grid grid-cols-4 gap-2" role="group" aria-label="Rate your recall">
          {RATINGS.map((r) => {
            const suggested = result?.suggested === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRate(r.id, r.xp)}
                className={`btn relative flex-col gap-0 px-1 ${r.cls} ${suggested ? 'ring-2 ring-current ring-offset-2 ring-offset-canvas' : ''}`}
                aria-describedby="suggested-rating"
              >
                <span>{r.label}</span>
                <span className="text-xs font-bold opacity-80">
                  {formatInterval(nextInterval(progressMap[currentVerse.id], r.id))}
                </span>
              </button>
            );
          })}
          <p id="suggested-rating" className="col-span-4 mt-1 text-center text-sm text-ink-3">
            {result ? 'Suggested from your recitation. ' : ''}Your answer sets when you’ll see this verse again.
          </p>
        </div>
      ) : deck === 'review' ? (
        <button type="button" onClick={handleFlip} className="btn btn-primary w-full">
          Flip card
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo((currentIndex - 1 + verses.length) % verses.length)}
            className="btn btn-secondary w-14 px-0"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={handleFlip} className="btn btn-primary flex-1">
            Flip card
          </button>
          <button
            type="button"
            onClick={() => goTo((currentIndex + 1) % verses.length)}
            className="btn btn-secondary w-14 px-0"
            aria-label="Next card"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
