import React, { useEffect, useState } from 'react';

interface AvatarProps {
  seed: string;
  size: number;
  className?: string;
}

// DiceBear is ~45 kB gzipped, so it loads in its own chunk after first paint.
const loadRenderer = () => import('../../utils/avatarSvg');
const cache = new Map<string, string>();

/**
 * DiceBear "Adventurer Neutral" avatar, rendered in the browser (works offline,
 * and nothing about the user is sent to a server). Art by Lisa Wischofsky,
 * CC BY 4.0; credited in Settings.
 */
export const Avatar: React.FC<AvatarProps> = ({ seed, size, className = '' }) => {
  // Already-rendered seeds come straight from the cache; others load async.
  const [loaded, setLoaded] = useState<{ seed: string; uri: string } | null>(null);
  const src = cache.get(seed) ?? (loaded?.seed === seed ? loaded.uri : undefined);

  useEffect(() => {
    if (cache.has(seed)) return;
    let live = true;
    loadRenderer().then(({ avatarDataUri }) => {
      const uri = avatarDataUri(seed);
      cache.set(seed, uri);
      if (live) setLoaded({ seed, uri });
    });
    return () => {
      live = false;
    };
  }, [seed]);

  return src ? (
    <img src={src} alt="" width={size} height={size} className={`shrink-0 rounded-full ${className}`} draggable={false} />
  ) : (
    <span className={`block shrink-0 rounded-full bg-brand-soft ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
  );
};
