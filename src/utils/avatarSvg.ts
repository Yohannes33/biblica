import { createAvatar } from '@dicebear/core';
import * as adventurerNeutral from '@dicebear/adventurer-neutral';

// Soft tints of the app palette (green, gold, peach, teal) behind the face.
const BACKGROUNDS = ['c8e6c4', 'f6dfa0', 'f4cbb5', 'cfe3ea'];

export const avatarDataUri = (seed: string) =>
  createAvatar(adventurerNeutral, { seed, backgroundColor: BACKGROUNDS, radius: 50 }).toDataUri();
