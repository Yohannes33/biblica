import confetti from 'canvas-confetti';

// Gold for reward, leaf green for the brand, white for sparkle.
const COLORS = ['#f6c945', '#e8a317', '#3f9a4c', '#7cc96f', '#ffffff'];

export function fireCelebrationConfetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 }, colors: COLORS });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 }, colors: COLORS });
    setTimeout(() => {
      confetti({ particleCount: 40, spread: 100, origin: { y: 0.6 }, colors: COLORS });
    }, 200);
  } catch {
    // Ignore in unsupported environments
  }
}
