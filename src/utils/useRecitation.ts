import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typing for the Web Speech recognition API (not in lib.dom yet).
interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition);

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it for this site in your browser settings.',
  'service-not-allowed': 'Speech recognition isn’t available here. Try opening Biblica in your browser.',
  'no-speech': 'Didn’t hear anything. Tap Recite and start speaking.',
  network: 'Reciting needs an internet connection.',
  'audio-capture': 'No microphone was found.',
};

/**
 * Listen to the user recite, using the browser's built-in speech recognition
 * (no backend). `onDone` receives the full transcript when listening ends.
 */
export function useRecitation(onDone: (transcript: string) => void) {
  const supported = !!getCtor();
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef('');
  const failed = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  // Some engines end without promoting the last interim result to final.
  const interimRef = useRef('');

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    finalText.current = '';
    interimRef.current = '';
    failed.current = false;
    setInterim('');
    setError(null);

    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += ` ${res[0].transcript}`;
        else live += ` ${res[0].transcript}`;
      }
      interimRef.current = `${finalText.current} ${live}`.trim();
      setInterim(interimRef.current);
    };
    r.onerror = (e) => {
      if (e.error === 'aborted') return;
      failed.current = true;
      setError(ERRORS[e.error] || 'Couldn’t listen just now. Try again.');
    };
    r.onend = () => {
      rec.current = null;
      setIsListening(false);
      const text = finalText.current.trim() || interimRef.current.trim();
      if (failed.current) return;
      if (!text) {
        setError(ERRORS['no-speech']);
        return;
      }
      onDoneRef.current(text);
    };

    rec.current = r;
    setIsListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setIsListening(false);
      setError('Couldn’t start the microphone. Try again.');
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const cancel = useCallback(() => {
    failed.current = true; // suppress onDone
    rec.current?.abort();
    rec.current = null;
    setIsListening(false);
    setInterim('');
  }, []);

  useEffect(() => cancel, [cancel]);

  return { supported, isListening, interim, error, start, stop, cancel, clearError: () => setError(null) };
}

// ---------- scoring ----------

const normalize = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, '');
const stem = (w: string) => (w.length > 4 ? w.replace(/(eth|est|ing|ed|th|s)$/, '') : w);

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// Recognisers modernise KJV spelling ("believeth" -> "believes"), so match loosely.
function sameWord(a: string, b: string) {
  if (a === b || stem(a) === stem(b)) return true;
  const longest = Math.max(a.length, b.length);
  return longest >= 4 && editDistance(a, b) <= (longest > 7 ? 2 : 1);
}

export interface RecitationResult {
  words: { text: string; matched: boolean }[];
  matched: number;
  total: number;
  percent: number;
  suggested: 'again' | 'hard' | 'good' | 'easy';
}

/** Align the transcript against the verse (longest common subsequence). */
export function scoreRecitation(verse: string, transcript: string): RecitationResult {
  const verseWords = verse.split(/\s+/).filter(Boolean);
  const v = verseWords.map(normalize);
  const t = transcript.split(/\s+/).map(normalize).filter(Boolean);
  const n = v.length;
  const m = t.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = v[i] && sameWord(v[i], t[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const matchedFlags = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (v[i] && sameWord(v[i], t[j])) {
      matchedFlags[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const matched = matchedFlags.filter(Boolean).length;
  const percent = n ? Math.round((matched / n) * 100) : 0;
  return {
    words: verseWords.map((text, i) => ({ text, matched: matchedFlags[i] })),
    matched,
    total: n,
    percent,
    suggested: percent >= 95 ? 'easy' : percent >= 80 ? 'good' : percent >= 50 ? 'hard' : 'again',
  };
}
