import { useCallback, useEffect, useRef, useState } from 'react';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return (
    english.find((v) => v.localService && v.default) ||
    english.find((v) => v.localService) ||
    english[0]
  );
}

/**
 * Read text aloud with the Web Speech API; a second call stops it.
 *
 * Phones fail here quietly: an iPhone on silent mutes web speech, Android
 * Chrome can leave the queue paused, and some browsers have no voices at all.
 * None of these throw, so we surface them as `error` / `hint` for the UI.
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdog = useRef<number | undefined>(undefined);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Voices load asynchronously on Chrome; asking once warms the list.
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
  }, [supported]);

  const stop = useCallback(() => {
    window.clearTimeout(watchdog.current);
    current.current = null;
    if (supported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const toggle = useCallback(
    (text: string) => {
      if (!supported) return;
      if (isSpeaking) {
        stop();
        return;
      }
      setError(null);
      const synth = window.speechSynthesis;
      synth.cancel();
      synth.resume(); // Android Chrome can be left paused after a cancel

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      const voice = pickEnglishVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      current.current = utterance;

      // Ignore events from an utterance we've already replaced or stopped.
      const isCurrent = () => current.current === utterance;
      utterance.onstart = () => {
        if (isCurrent()) window.clearTimeout(watchdog.current);
      };
      utterance.onend = () => {
        if (!isCurrent()) return;
        window.clearTimeout(watchdog.current);
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        if (!isCurrent() || e.error === 'interrupted' || e.error === 'canceled') return;
        window.clearTimeout(watchdog.current);
        setIsSpeaking(false);
        setError(
          synth.getVoices().length === 0
            ? 'This device has no text-to-speech voice installed.'
            : 'Couldn’t read aloud on this device. Try again in a moment.'
        );
      };

      setIsSpeaking(true);
      synth.speak(utterance);

      // If speech never starts, don't leave the button stuck on "Stop".
      window.clearTimeout(watchdog.current);
      watchdog.current = window.setTimeout(() => {
        if (!isCurrent() || synth.speaking) return;
        current.current = null;
        setIsSpeaking(false);
        setError('Read-aloud didn’t start. Check your volume and try again.');
      }, 2500);
    },
    [isSpeaking, stop, supported]
  );

  // Stop talking when the screen using it goes away.
  useEffect(() => stop, [stop]);

  // iOS still "speaks" with the ring switch on silent, just inaudibly.
  const hint = isSpeaking && isIOS() ? 'Can’t hear it? Turn off Silent Mode and turn the volume up.' : null;

  return { isSpeaking, toggle, stop, supported, error, hint, clearError: () => setError(null) };
}
