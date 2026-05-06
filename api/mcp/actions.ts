import { textResult } from '@/api/mcp/fields';
import { getVisibleRecord } from '@/api/mcp/records';
import type { McpContext } from '@/api/mcp/types';
import * as recordReactions from '@/domain/records/reactions';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordActionsActionSchema = z.enum(['reaction', 'pin']);
const reactionEmojiSchema = z.enum(recordReactions.REACTION_EMOJIS);

export const registerActionTools = (server: McpServer, ctx: McpContext) => {
  const setReaction = async ({
    emoji,
    recordId,
    replyId,
  }: {
    emoji?: recordReactions.ReactionEmoji | null;
    recordId?: string;
    replyId?: string;
  }) => {
    if (!recordId) throw new Error('recordId is required to set a reaction');
    const { record, viewer } = await getVisibleRecord(ctx, recordId);
    const profile = viewer.profile;

    if (!profile?.id || !record.teamId || !record.log?.id) {
      throw new Error('Invalid reaction target');
    }

    const reply = replyId
      ? (record.replies ?? []).find((reply) => reply.id === replyId)
      : undefined;

    if (replyId && !reply) throw new Error('Reply not found or not visible');

    const reactions = replyId
      ? (reply?.reactions ?? [])
      : (record.reactions ?? []);

    const existing = reactions.find(
      (reaction) => reaction.author?.id === profile.id
    );

    if (!emoji) {
      if (existing?.id) {
        await ctx.db.transact(ctx.db.tx.reactions[existing.id].delete());
      }

      return textResult(
        { removed: !!existing },
        existing ? 'Reaction removed.' : 'No reaction to remove.'
      );
    }

    if (existing?.id) {
      await ctx.db.transact(ctx.db.tx.reactions[existing.id].update({ emoji }));

      return textResult(
        { reactionId: existing.id },
        `Reaction updated: ${existing.id}`
      );
    }

    const reactionId = id();
    const activityId = id();

    await ctx.db.transact([
      ctx.db.tx.reactions[reactionId]
        .update({ emoji, teamId: record.teamId })
        .link({
          activity: activityId,
          author: profile.id,
          ...(replyId ? { reply: replyId } : { record: recordId }),
        }),
      ctx.db.tx.activities[activityId]
        .update({
          date: new Date().toISOString(),
          emoji,
          teamId: record.teamId,
          type: 'reaction_added',
        })
        .link({
          actor: profile.id,
          log: record.log.id,
          record: recordId,
          ...(replyId ? { reply: replyId } : {}),
          team: record.teamId,
        }),
    ]);

    return textResult({ reactionId }, `Reaction added: ${reactionId}`);
  };

  const setRecordPin = async ({
    isPinned,
    recordId,
  }: {
    isPinned?: boolean;
    recordId?: string;
  }) => {
    if (!recordId) throw new Error('recordId is required to pin a record');

    if (isPinned == null) {
      throw new Error('isPinned is required to pin a record');
    }

    const { record, viewer } = await getVisibleRecord(ctx, recordId);

    const role = record.teamId
      ? viewer.rolesByTeamId.get(record.teamId)?.role
      : undefined;

    if (!permissions.getTeamPermissionFlags(role).canPinRecords) {
      throw new Error('Only team owners and admins can pin records');
    }

    await ctx.db.transact(ctx.db.tx.records[recordId].update({ isPinned }));

    return textResult(
      { isPinned },
      isPinned ? 'Record pinned.' : 'Record unpinned.'
    );
  };

  server.registerTool(
    'record_actions',
    {
      description: 'Set record/reply reactions or pin state.',
      inputSchema: {
        action: recordActionsActionSchema,
        emoji: reactionEmojiSchema.nullable().optional(),
        isPinned: z.boolean().optional(),
        recordId: z.string().min(1).optional(),
        replyId: z.string().min(1).optional(),
      },
    },
    async ({ action, emoji, isPinned, recordId, replyId }) => {
      switch (action) {
        case 'reaction': {
          return setReaction({ emoji, recordId, replyId });
        }

        case 'pin': {
          return setRecordPin({ isPinned, recordId });
        }
      }
    }
  );
};
