import {
  Confetti,
  HandsPraying,
  Heart,
  Smiley,
  ThumbsDown,
  ThumbsUp,
} from 'phosphor-react-native';

export const REACTION_EMOJIS = ['👍', '👎', '❤️', '😊', '🎉', '🙏'] as const;

export const REACTION_ICONS = {
  '👍': ThumbsUp,
  '👎': ThumbsDown,
  '❤️': Heart,
  '😊': Smiley,
  '🎉': Confetti,
  '🙏': HandsPraying,
} as const;
