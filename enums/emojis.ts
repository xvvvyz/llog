import {
  Confetti,
  Fire,
  HandsPraying,
  Heart,
  Smiley,
  ThumbsDown,
  ThumbsUp,
} from 'phosphor-react-native';

export const REACTION_EMOJIS = [
  '❤️',
  '🔥',
  '🎉',
  '😊',
  '👍',
  '👎',
  '🙏',
] as const;

export type Emoji = (typeof REACTION_EMOJIS)[number];

export const REACTION_ICONS = {
  '👍': ThumbsUp,
  '👎': ThumbsDown,
  '❤️': Heart,
  '😊': Smiley,
  '🎉': Confetti,
  '🙏': HandsPraying,
  '🔥': Fire,
} as const;
