import { runBulkItems } from '@/api/mcp/bulk';
import { textResult } from '@/api/mcp/fields';
import { getVisibleRecord } from '@/api/mcp/content';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext } from '@/api/mcp/types';
import * as recordReactions from '@/domain/records/reactions';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordActionsActionSchema = z.enum(['reaction', 'pin']);
const reactionEmojiSchema = z.enum(recordReactions.REACTION_EMOJIS);

const recordActionsItemSchema = z.object({
  emoji: reactionEmojiSchema.nullable().optional(),
  isPinned: z.boolean().optional(),
  recordId: z.string().min(1).optional(),
  replyId: z.string().min(1).optional(),
});

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

    await ctx.db.transact(
      recordReactions.buildAddReactionTransactions({
        activityId,
        db: ctx.db,
        emoji,
        logId: record.log.id,
        now: new Date().toISOString(),
        profileId: profile.id,
        reactionId,
        recordId,
        replyId,
        teamId: record.teamId,
      })
    );

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
      { pinned: isPinned },
      isPinned ? 'Record pinned.' : 'Record unpinned.'
    );
  };

  registerMcpTool(
    server,
    'record_actions',
    {
      description:
        'Batch reactions and pin updates for records or replies with items.',
      inputSchema: {
        action: recordActionsActionSchema,
        items: z.array(recordActionsItemSchema).min(1).max(50),
      },
      outputSchema: mcpSchemas.recordActionsOutputSchema,
    },
    async ({ action, items }) => {
      switch (action) {
        case 'reaction': {
          return runBulkItems({ action, handler: setReaction, items });
        }

        case 'pin': {
          return runBulkItems({ action, handler: setRecordPin, items });
        }
      }
    }
  );
};
