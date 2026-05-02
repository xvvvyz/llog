import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { getVisibleRecord } from '@/api/mcp/records';
import * as mcpSchemas from '@/api/mcp/schemas';
import { recordTagsQuery } from '@/api/mcp/tag-query';
import type { McpContext, McpLog, McpRecord, McpReply } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as push from '@/api/push/web-push';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const repliesActionSchema = z.enum(['get', 'save']);
type ReplyInclude = z.infer<typeof mcpSchemas.replyIncludeSchema>;
const countFileQuery = { $: { fields: ['id' as const] } };
const countLinkQuery = { $: { fields: ['id' as const] } };
const countReactionQuery = { $: { fields: ['emoji' as const, 'id' as const] } };
const summaryProfileQuery = { $: { fields: ['id' as const, 'name' as const] } };

const replyDetailQuery = ({ include }: { include: Set<ReplyInclude> }) => ({
  author: summaryProfileQuery,
  files: include.has('files') ? {} : countFileQuery,
  links: include.has('links') ? {} : countLinkQuery,
  reactions: countReactionQuery,
  record: {
    $: { fields: ['id' as const, 'teamId' as const] },
    log: { $: { fields: ['color' as const, 'id' as const, 'name' as const] } },
    tags: recordTagsQuery,
  },
});

export const getCallerDraftReply = async (
  ctx: McpContext,
  replyId: string,
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId, isDraft: true } },
        ...(query ?? {
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
            tags: recordTagsQuery,
          },
        }),
      },
    }) as Promise<{
      replies?: Array<
        McpReply & {
          record?: Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog };
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
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId, isDraft: false } },
        ...(query ?? {
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
            tags: recordTagsQuery,
          },
        }),
      },
    }) as Promise<{
      replies?: Array<
        McpReply & {
          record?: Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog };
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

export const getReadableReply = async (
  ctx: McpContext,
  replyId: string,
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const [{ replies }, viewer] = await Promise.all([
    ctx.db.query({
      replies: {
        $: { where: { id: replyId } },
        ...(query ?? {
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
            tags: recordTagsQuery,
          },
        }),
      },
    }) as Promise<{
      replies?: Array<
        McpReply & {
          record?: Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog };
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

  if (
    reply.isDraft &&
    (!viewer.profile?.id || reply.author?.id !== viewer.profile.id)
  ) {
    throw new Error('Reply not found or not visible');
  }

  return { reply, viewer };
};

export const registerReplyTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const getReply = async ({
    include = [],
    replyId,
    status,
  }: {
    include?: ReplyInclude[];
    replyId?: string;
    status?: 'draft' | 'published';
  }) => {
    if (!replyId) throw new Error('replyId is required to get a reply');
    const includeSet = new Set(include);
    const query = replyDetailQuery({ include: includeSet });

    const { reply } =
      status === 'draft'
        ? await getCallerDraftReply(ctx, replyId, { query })
        : status === 'published'
          ? await getVisibleReply(ctx, replyId, { query })
          : await getReadableReply(ctx, replyId, { query });

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
      record: {
        id: record.id,
        log: record.log,
        tags: (record.tags ?? []).map(mcpFields.tagFields),
      },
    };

    return mcpFields.textResult(
      { reply: item },
      [
        `Reply ${item.id}`,
        `Record: ${record.id}`,
        record.log?.name ? `Log: ${record.log.name}` : undefined,
        item.record.tags?.length
          ? mcpFields.table(
              ['Record tag', 'ID'],
              item.record.tags.map((tag) => [tag.name, tag.id])
            )
          : undefined,
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
  };

  const saveReply = async ({
    links,
    mode = 'publish',
    recordId,
    replyId,
    text,
  }: {
    links?: Array<z.infer<typeof mcpSchemas.linkInputSchema>>;
    mode?: 'draft' | 'publish';
    recordId?: string;
    replyId?: string;
    text?: string;
  }) => {
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

      if (!recordId) throw new Error('recordId is required to create a draft');
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
  };

  server.registerTool(
    'replies',
    {
      description: 'Get, save, or publish replies.',
      inputSchema: {
        action: repliesActionSchema,
        links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
        include: z.array(mcpSchemas.replyIncludeSchema).max(3).optional(),
        mode: mcpSchemas.saveModeSchema,
        recordId: z.string().min(1).optional(),
        replyId: z.string().min(1).optional(),
        status: mcpSchemas.contentStatusSchema,
        text: z.string().max(10240).optional(),
      },
    },
    async ({
      action,
      include,
      links,
      mode,
      recordId,
      replyId,
      status,
      text,
    }) => {
      switch (action) {
        case 'get':
          return getReply({ include, replyId, status });
        case 'save':
          return saveReply({ links, mode, recordId, replyId, text });
      }
    }
  );
};
