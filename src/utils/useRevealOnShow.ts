import { useEffect, useRef } from 'react';

/**
 * Scroll an element fully into view once it renders (e.g. a completion panel
 * that appears below the fold), clearing the fixed tab bar via scroll-margin.
 */
export function useRevealOnShow<T extends HTMLElement>(shown: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!shown || !ref.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ref.current.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [shown]);
  return ref;
}
