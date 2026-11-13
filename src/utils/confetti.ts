import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  try {
    // Left burst
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.7 }
    });
    // Right burst
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.7 }
    });
    // Center golden burst
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#fef08a', '#eab308', '#6366f1', '#ec4899']
      });
    }, 200);
  } catch {
    // Ignore in unsupported environments
  }
}
