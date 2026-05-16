import { runBulkItems } from '@/api/mcp/bulk';
import * as content from '@/api/mcp/content';
import * as contentQueries from '@/api/mcp/content-queries';
import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpReply } from '@/api/mcp/types';
import * as push from '@/api/push/web-push';
import * as recordPublish from '@/domain/records/publish';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const repliesActionSchema = z.enum(['get', 'save']);

const repliesItemSchema = z.object({
  include: z.array(mcpSchemas.replyIncludeSchema).max(3).optional(),
  links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
  mode: mcpSchemas.saveModeSchema,
  recordId: z.string().min(1).optional(),
  replyId: z.string().min(1).optional(),
  text: z.string().max(10240).optional(),
});

export const registerReplyTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const getReply = async ({
    include = [],
    replyId,
  }: {
    include?: contentQueries.ReplyInclude[];
    replyId?: string;
  }) => {
    if (!replyId) throw new Error('replyId is required to get a reply');
    const includeSet = new Set(include);
    const query = contentQueries.replyDetailQuery({ include: includeSet });
    const { reply } = await content.getReadableReply(ctx, replyId, { query });
    const record = reply.record;
    if (!record) throw new Error('Invalid reply');

    const detailFieldOptions = {
      ...fieldOptions,
      includeFiles: includeSet.has('files'),
      includeLinks: includeSet.has('links'),
      includeReactions: includeSet.has('reactions'),
    };

    const item = {
      ...mcpFields.replyFields(reply, detailFieldOptions),
      record: mcpFields.recordRefFields(record, detailFieldOptions),
    };

    return mcpFields.textResult(
      { reply: item },
      [
        'Reply',
        item.record.url ? `Record: ${item.record.url}` : undefined,
        record.log?.name ? `Log: ${record.log.name}` : undefined,
        item.record.tags?.length
          ? mcpFields.table(
              ['Record tag'],
              item.record.tags.map((tag) => [tag.name])
            )
          : undefined,
        mcpFields.textBlock('Text', item.text),
        item.files?.length
          ? mcpFields.table(
              ['File', 'Type', 'URL'],
              item.files.map((file) => [
                file.name ?? 'File',
                file.type,
                file.url,
              ])
            )
          : undefined,
        item.links?.length
          ? mcpFields.table(
              ['Link', 'URL'],
              item.links.map((link) => [link.label, link.url])
            )
          : undefined,
      ]
        .filter(Boolean)
        .join('\n\n')
    );
  };

  const saveReply = async ({
    links,
    mode = 'publish',
    recordId,
    replyId,
    text,
  }: {
    links?: z.infer<typeof mcpSchemas.linkInputSchema>[];
    mode?: 'draft' | 'publish';
    recordId?: string;
    replyId?: string;
    text?: string;
  }) => {
    if (mode === 'draft') {
      if (replyId) {
        const { reply } = await content.getCallerDraftReply(ctx, replyId);
        if (!reply.teamId) throw new Error('Invalid reply draft');

        const transactions = [
          ...(text != null
            ? [ctx.db.tx.replies[replyId].update({ text })]
            : []),
          ...(links
            ? replaceLinkTransactions({
                db: ctx.db,
                existingLinks: reply.links,
                links,
                target: 'reply',
                targetId: replyId,
                teamId: reply.teamId,
              })
            : []),
        ];

        if (transactions.length) await ctx.db.transact(transactions);

        return mcpFields.textResult(
          { replyId, status: 'draft' },
          `Draft reply: ${replyId}`
        );
      }

      if (!recordId) throw new Error('recordId is required to create a draft');
      const { record, viewer } = await content.getVisibleRecord(ctx, recordId);
      const profile = viewer.profile;

      if (!profile?.id || !record.teamId) {
        throw new Error('Invalid reply target');
      }

      const { replies } = (await ctx.db.query({
        replies: {
          $: {
            limit: 1,
            where: { author: profile.id, isDraft: true, record: recordId },
          },
          links: {},
        },
      })) as { replies?: McpReply[] };

      const draftReplyId = replies?.[0]?.id ?? id();
      const now = new Date().toISOString();

      await ctx.db.transact([
        ctx.db.tx.replies[draftReplyId]
          .update({
            date: replies?.[0]?.date ?? now,
            isDraft: true,
            teamId: record.teamId,
            text: text ?? replies?.[0]?.text ?? '',
          })
          .link({ author: profile.id, record: recordId }),
        ...(links
          ? replaceLinkTransactions({
              db: ctx.db,
              existingLinks: replies?.[0]?.links,
              links,
              target: 'reply',
              targetId: draftReplyId,
              teamId: record.teamId,
            })
          : []),
      ]);

      return mcpFields.textResult(
        { replyId: draftReplyId, status: 'draft' },
        `Draft reply: ${draftReplyId}`
      );
    }

    if (replyId) {
      const { reply } = await content.getCallerDraftReply(ctx, replyId, {
        query: contentQueries.replyPublishQuery,
      });

      const nextText = (text ?? reply.text ?? '').trim();
      const nextLinks = links ?? reply.links ?? [];

      const hasContent = content.hasLinkedContent({
        files: reply.files,
        links: nextLinks,
        text: nextText,
      });

      if (
        !hasContent ||
        !reply.author?.id ||
        !reply.author.name ||
        !reply.record?.id ||
        !reply.record.log?.id ||
        !reply.record.log.name ||
        !reply.teamId
      ) {
        throw new Error('Invalid reply draft');
      }

      const notificationLog = await content.getNotificationLog(
        ctx,
        reply.record.log.id
      );

      const now = new Date().toISOString();

      await ctx.db.transact([
        ...recordPublish.buildPublishDraftReplyTransactions({
          activityDate: now,
          activityId: id(),
          actorId: reply.author.id,
          db: ctx.db,
          logId: reply.record.log.id,
          recordId: reply.record.id,
          replyId,
          teamId: reply.teamId,
          text: nextText,
        }),
        ...(links
          ? replaceLinkTransactions({
              db: ctx.db,
              existingLinks: reply.links,
              links,
              target: 'reply',
              targetId: replyId,
              teamId: reply.teamId,
            })
          : []),
      ]);

      await push.sendPushNotifications(
        ctx.env,
        push.collectRecipientSubscriptions({
          actorUserId: ctx.props.userId,
          logProfiles: notificationLog.profiles,
          roles: notificationLog.team?.roles,
        }),
        push.buildReplyNotification({
          authorName: reply.author.name,
          logName: reply.record.log.name ?? notificationLog.name,
          recordId: reply.record.id,
          replyId,
          text: nextText,
        }),
        { staleSubscriptionDb: ctx.notificationDb }
      );

      return mcpFields.textResult(
        { replyId, status: 'published' },
        `Published reply: ${replyId}`
      );
    }

    if (!recordId) throw new Error('recordId is required to publish a reply');
    const nextLinks = links ?? [];
    const trimmedText = (text ?? '').trim();

    if (!content.hasLinkedContent({ links: nextLinks, text: trimmedText })) {
      throw new Error('Reply content cannot be empty');
    }

    const { record, viewer } = await content.getVisibleRecord(ctx, recordId, {
      query: contentQueries.replyTargetRecordQuery,
    });

    const profile = viewer.profile;

    if (!profile?.id || !record.log?.id || !record.teamId) {
      throw new Error('Invalid reply target');
    }

    const notificationLog = await content.getNotificationLog(
      ctx,
      record.log.id
    );

    const teamId = record.teamId;
    const newReplyId = id();
    const now = new Date().toISOString();

    await ctx.db.transact([
      ...recordPublish.buildCreatePublishedReplyTransactions({
        activityId: id(),
        authorId: profile.id,
        db: ctx.db,
        logId: record.log.id,
        now,
        recordId,
        replyId: newReplyId,
        teamId,
        text: trimmedText,
      }),
      ...replaceLinkTransactions({
        db: ctx.db,
        links: nextLinks,
        target: 'reply',
        targetId: newReplyId,
        teamId,
      }),
    ]);

    await push.sendPushNotifications(
      ctx.env,
      push.collectRecipientSubscriptions({
        actorUserId: ctx.props.userId,
        logProfiles: notificationLog.profiles,
        roles: notificationLog.team?.roles,
      }),
      push.buildReplyNotification({
        authorName: profile.name,
        logName: record.log.name ?? notificationLog.name,
        recordId,
        replyId: newReplyId,
        text: trimmedText,
      }),
      { staleSubscriptionDb: ctx.notificationDb }
    );

    return mcpFields.textResult(
      { replyId: newReplyId, status: 'published' },
      `Published reply: ${newReplyId}`
    );
  };

  registerMcpTool(
    server,
    'replies',
    {
      description:
        'Batch read, draft, publish, and update replies on records with items.',
      inputSchema: {
        action: repliesActionSchema,
        items: z.array(repliesItemSchema).min(1).max(25),
      },
      outputSchema: mcpSchemas.repliesOutputSchema,
    },
    async ({ action, items }) => {
      switch (action) {
        case 'get': {
          return runBulkItems({ action, handler: getReply, items });
        }

        case 'save': {
          return runBulkItems({ action, handler: saveReply, items });
        }
      }
    }
  );
};
