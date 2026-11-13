import { useCallback, useEffect, useState } from 'react';

/** Read text aloud with the Web Speech API; toggles off on a second call. */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, stop, supported]
  );

  // Stop talking when the screen using it goes away.
  useEffect(() => stop, [stop]);

  return { isSpeaking, toggle, stop, supported };
}
