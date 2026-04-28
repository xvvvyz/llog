import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { getVisibleRecord } from '@/api/mcp/records';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpLog, McpRecord, McpReply } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as push from '@/api/push/web-push';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

export const getCallerDraftReply = async (
  ctx: McpContext,
  replyId: string,
  { withSubscriptions = false } = {}
) => {
  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId, isDraft: true } },
        author: { image: {}, user: {} },
        files: {},
        links: {},
        record: {
          $: { fields: ['id', 'teamId'] },
          log: withSubscriptions
            ? {
                profiles: { user: { subscriptions: {} } },
                team: { roles: { user: { subscriptions: {} } } },
              }
            : { team: { $: { fields: ['id' as const] } } },
        },
      },
    }) as Promise<{
      replies?: Array<
        McpReply & {
          record?: Pick<McpRecord, 'id' | 'teamId'> & { log?: McpLog };
        }
      >;
    }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const reply = replies?.[0];

  if (
    !reply?.record?.id ||
    !reply.record.log?.id ||
    !viewer.profile?.id ||
    reply.author?.id !== viewer.profile.id ||
    !viewer.visibleLogIds.has(reply.record.log.id)
  ) {
    throw new Error('Draft reply not found or not visible');
  }

  return { reply, viewer };
};

export const getVisibleReply = async (
  ctx: McpContext,
  replyId: string,
  { withSubscriptions = false } = {}
) => {
  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId, isDraft: false } },
        author: { image: {}, user: {} },
        files: {},
        links: {},
        reactions: { author: {} },
        record: {
          $: { fields: ['id', 'teamId'] },
          log: withSubscriptions
            ? {
                profiles: { user: { subscriptions: {} } },
                team: { roles: { user: { subscriptions: {} } } },
              }
            : {
                $: {
                  fields: ['color' as const, 'id' as const, 'name' as const],
                },
              },
        },
      },
    }) as Promise<{
      replies?: Array<
        McpReply & {
          record?: Pick<McpRecord, 'id' | 'teamId'> & { log?: McpLog };
        }
      >;
    }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const reply = replies?.[0];

  if (
    !reply?.record?.log?.id ||
    !viewer.visibleLogIds.has(reply.record.log.id)
  ) {
    throw new Error('Reply not found or not visible');
  }

  return { reply, viewer };
};

export const registerReplyTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  server.registerTool(
    'get_reply',
    {
      description: 'Get a reply.',
      inputSchema: {
        replyId: z.string().min(1),
        status: mcpSchemas.contentStatusSchema,
      },
    },
    async ({ replyId, status = 'published' }) => {
      const { reply } =
        status === 'draft'
          ? await getCallerDraftReply(ctx, replyId)
          : await getVisibleReply(ctx, replyId);

      const record = reply.record;
      if (!record) throw new Error('Invalid reply');

      const item = {
        ...mcpFields.replyFields(reply, fieldOptions),
        record: { id: record.id, log: record.log },
      };

      return mcpFields.textResult(
        { reply: item },
        [
          `Reply ${item.id}`,
          `Record: ${record.id}`,
          record.log?.name ? `Log: ${record.log.name}` : undefined,
          item.text
            ? `Text: ${mcpFields.textPreview(item.text, 600)}`
            : undefined,
          item.files?.length
            ? mcpFields.table(
                ['File', 'Type', 'URL'],
                item.files.map((file) => [
                  file.name ?? file.id,
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
    }
  );

  server.registerTool(
    'save_reply',
    {
      description: 'Save a reply.',
      inputSchema: {
        links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
        mode: mcpSchemas.saveModeSchema,
        recordId: z.string().min(1).optional(),
        replyId: z.string().min(1).optional(),
        text: z.string().max(10240).optional(),
      },
    },
    async ({ links, mode = 'publish', recordId, replyId, text }) => {
      if (mode === 'draft') {
        if (replyId) {
          const { reply } = await getCallerDraftReply(ctx, replyId);
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

        if (!recordId) {
          throw new Error('recordId is required to create a draft');
        }

        const { record, viewer } = await getVisibleRecord(ctx, recordId);
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
        const { reply } = await getCallerDraftReply(ctx, replyId, {
          withSubscriptions: true,
        });

        const nextText = (text ?? reply.text ?? '').trim();
        const nextLinks = links ?? reply.links ?? [];

        const hasContent =
          !!nextText || !!reply.files?.length || nextLinks.length > 0;

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

        const now = new Date().toISOString();

        await ctx.db.transact([
          ctx.db.tx.replies[replyId].update({
            date: now,
            isDraft: false,
            text: nextText,
          }),
          ctx.db.tx.activities[id()]
            .update({ date: now, teamId: reply.teamId, type: 'reply_posted' })
            .link({
              actor: reply.author.id,
              log: reply.record.log.id,
              record: reply.record.id,
              reply: replyId,
              team: reply.teamId,
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
            logProfiles: reply.record.log.profiles,
            roles: reply.record.log.team?.roles,
          }),
          push.buildReplyNotification({
            authorName: reply.author.name,
            logName: reply.record.log.name,
            recordId: reply.record.id,
            replyId,
            text: nextText,
          })
        );

        return mcpFields.textResult(
          { replyId, status: 'published' },
          `Published reply: ${replyId}`
        );
      }

      if (!recordId) throw new Error('recordId is required to publish a reply');
      const nextLinks = links ?? [];
      const trimmedText = (text ?? '').trim();

      if (!trimmedText && nextLinks.length === 0) {
        throw new Error('Reply content cannot be empty');
      }

      const { record, viewer } = await getVisibleRecord(ctx, recordId, {
        withSubscriptions: true,
      });

      const profile = viewer.profile;

      if (!profile?.id || !record.log?.id || !record.teamId) {
        throw new Error('Invalid reply target');
      }

      const teamId = record.teamId;
      const newReplyId = id();
      const now = new Date().toISOString();

      await ctx.db.transact([
        ctx.db.tx.replies[newReplyId]
          .update({ date: now, isDraft: false, teamId, text: trimmedText })
          .link({ author: profile.id, record: recordId }),
        ctx.db.tx.activities[id()]
          .update({ date: now, teamId, type: 'reply_posted' })
          .link({
            actor: profile.id,
            log: record.log.id,
            record: recordId,
            reply: newReplyId,
            team: teamId,
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
          logProfiles: record.log.profiles,
          roles: record.log.team?.roles,
        }),
        push.buildReplyNotification({
          authorName: profile.name,
          logName: record.log.name,
          recordId,
          replyId: newReplyId,
          text: trimmedText,
        })
      );

      return mcpFields.textResult(
        { replyId: newReplyId, status: 'published' },
        `Published reply: ${newReplyId}`
      );
    }
  );
};
