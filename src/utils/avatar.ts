/** A random, non-identifying seed. The avatar is generated locally from it. */
export const newAvatarSeed = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
