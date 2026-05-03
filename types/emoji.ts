export const REACTION_EMOJIS = ['❤️', '🔥', '🎉', '👍', '👎'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
const DEFAULT_REACTION_EMOJI = REACTION_EMOJIS[0];
const REACTION_EMOJI_SET = new Set<string>(REACTION_EMOJIS);

export const isReactionEmoji = (value: unknown): value is ReactionEmoji =>
  typeof value === 'string' && REACTION_EMOJI_SET.has(value);

export const normalizeReactionEmoji = (value: unknown): ReactionEmoji =>
  isReactionEmoji(value) ? value : DEFAULT_REACTION_EMOJI;
