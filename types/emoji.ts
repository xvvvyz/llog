import { Confetti } from 'phosphor-react-native/lib/module/icons/Confetti';
import { Fire } from 'phosphor-react-native/lib/module/icons/Fire';
import { Heart } from 'phosphor-react-native/lib/module/icons/Heart';
import { ThumbsDown } from 'phosphor-react-native/lib/module/icons/ThumbsDown';
import { ThumbsUp } from 'phosphor-react-native/lib/module/icons/ThumbsUp';

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
