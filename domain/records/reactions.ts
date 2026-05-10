import schema from '@/instant.schema';
import type { db as clientDb } from '@/lib/db';
import type { TransactionChunk } from '@instantdb/react-native';

export const REACTION_EMOJIS = ['❤️', '🔥', '🎉', '👍', '👎'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

const DEFAULT_REACTION_EMOJI = REACTION_EMOJIS[0];
const REACTION_EMOJI_SET = new Set<string>(REACTION_EMOJIS);

export const isReactionEmoji = (value: unknown): value is ReactionEmoji =>
  typeof value === 'string' && REACTION_EMOJI_SET.has(value);

export const normalizeReactionEmoji = (value: unknown): ReactionEmoji =>
  isReactionEmoji(value) ? value : DEFAULT_REACTION_EMOJI;

type Transaction = TransactionChunk<
  typeof schema,
  keyof (typeof schema)['entities']
>;

type DbWithTransactions = { tx: typeof clientDb.tx };

export const buildAddReactionTransactions = ({
  activityId,
  db,
  emoji,
  logId,
  now,
  profileId,
  reactionId,
  recordId,
  replyId,
  teamId,
}: {
  activityId?: string;
  db: DbWithTransactions;
  emoji: ReactionEmoji;
  logId?: string;
  now?: string;
  profileId: string;
  reactionId: string;
  recordId: string;
  replyId?: string;
  teamId: string;
}): Transaction[] => {
  const hasActivity = !!activityId && !!logId;
  const targetLink = replyId ? { reply: replyId } : { record: recordId };

  const transactions: Transaction[] = [
    db.tx.reactions[reactionId]
      .update({ emoji, teamId })
      .link({
        ...(hasActivity ? { activity: activityId } : {}),
        author: profileId,
        ...targetLink,
      }),
  ];

  if (activityId && logId) {
    transactions.push(
      db.tx.activities[activityId]
        .update({
          date: now ?? new Date().toISOString(),
          emoji,
          teamId,
          type: 'reaction_added',
        })
        .link({
          actor: profileId,
          log: logId,
          record: recordId,
          ...(replyId ? { reply: replyId } : {}),
          team: teamId,
        })
    );
  }

  return transactions;
};
