import {
  Confetti,
  Fire,
  Heart,
  ThumbsDown,
  ThumbsUp,
} from 'phosphor-react-native';

export const REACTION_EMOJIS = ['❤️', '🔥', '🎉', '👍', '👎'] as const;
export type Emoji = (typeof REACTION_EMOJIS)[number];

export const isEmoji = (value: unknown): value is Emoji =>
  typeof value === 'string' && REACTION_EMOJIS.some((emoji) => emoji === value);

export const REACTION_ICONS = {
  '👍': ThumbsUp,
  '👎': ThumbsDown,
  '❤️': Heart,
  '🎉': Confetti,
  '🔥': Fire,
} as const;
