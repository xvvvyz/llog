import type { ReactionEmoji } from '@/domain/records/reactions';
import type { ComponentType } from 'react';

import {
  Confetti,
  Fire,
  Heart,
  type IconProps as PhosphorIconProps,
  ThumbsDown,
  ThumbsUp,
} from 'phosphor-react-native';

export const REACTION_ICONS = {
  '❤️': Heart,
  '🔥': Fire,
  '🎉': Confetti,
  '👍': ThumbsUp,
  '👎': ThumbsDown,
} satisfies Record<ReactionEmoji, ComponentType<PhosphorIconProps>>;
