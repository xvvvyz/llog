import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import { recordTagsQuery } from '@/api/mcp/tag-query';
import type { McpContext, McpLog, McpRecord } from '@/api/mcp/types';
import { getViewer, requireVisibleLog } from '@/api/mcp/viewer';
import * as push from '@/api/push/web-push';
import { visibleFileQuery } from '@/domain/files/query';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordQuery = {
  author: { image: {}, user: {} },
  files: visibleFileQuery,
  links: {},
  log: { team: { $: { fields: ['id' as const] } } },
  reactions: { author: {} },
  tags: recordTagsQuery,
  replies: {
    $: { order: { date: 'asc' as const }, where: { isDraft: { $not: true } } },
    author: { image: {} },
    files: visibleFileQuery,
    links: {},
    reactions: { author: {} },
  },
};

const countFileQuery = { $: { fields: ['id' as const] } };
const countLinkQuery = { $: { fields: ['id' as const] } };
const countReactionQuery = { $: { fields: ['emoji' as const, 'id' as const] } };

const searchFileQuery = {
  $: {
    fields: [
      'id' as const,
      'name' as const,
      'tracks' as const,
      'transcript' as const,
    ],
  },
};

const searchLinkQuery = { $: { fields: ['id' as const, 'label' as const] } };
const summaryProfileQuery = { $: { fields: ['id' as const, 'name' as const] } };

const recordSummaryQuery = {
  files: countFileQuery,
  links: countLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: countReactionQuery,
  replies: {
    $: {
      fields: ['id' as const, 'isDraft' as const],
      where: { isDraft: { $not: true } },
    },
  },
  tags: recordTagsQuery,
};

export const recordSearchQuery = {
  files: searchFileQuery,
  links: searchLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: countReactionQuery,
  replies: {
    $: {
      fields: [
        'date' as const,
        'id' as const,
        'isDraft' as const,
        'text' as const,
      ],
      order: { date: 'asc' as const },
      where: { isDraft: { $not: true } },
    },
    files: searchFileQuery,
    links: searchLinkQuery,
    reactions: countReactionQuery,
  },
  tags: recordTagsQuery,
};

const recordQueryWithSubscriptions = {
  ...recordQuery,
  log: {
    profiles: { user: { subscriptions: {} } },
    team: { roles: { user: { subscriptions: {} } } },
  },
};

const recordsActionSchema = z.enum(['list', 'get', 'save']);
type RecordInclude = z.infer<typeof mcpSchemas.recordIncludeSchema>;

const recordDetailQuery = ({
  include,
  replyLimit,
}: {
  include: Set<RecordInclude>;
  replyLimit: number;
}) => {
  const includeFiles = include.has('files');
  const includeLinks = include.has('links');

  return {
    author: summaryProfileQuery,
    files: includeFiles ? visibleFileQuery : countFileQuery,
    links: includeLinks ? {} : countLinkQuery,
    log: { $: { fields: ['color' as const, 'id' as const, 'name' as const] } },
    reactions: countReactionQuery,
    replies: {
      $: {
        fields: [
          'date' as const,
          'id' as const,
          'isDraft' as const,
          'text' as const,
        ],
        limit: replyLimit,
        order: { date: 'asc' as const },
        where: { isDraft: { $not: true } },
      },
      author: summaryProfileQuery,
      files: includeFiles ? visibleFileQuery : countFileQuery,
      links: includeLinks ? {} : countLinkQuery,
      reactions: countReactionQuery,
    },
    tags: recordTagsQuery,
  };
};

const getPublishedReplyCount = async (ctx: McpContext, recordId: string) => {
  const { replies } = (await ctx.db.query({
    replies: {
      $: {
        fields: ['id' as const],
        where: { isDraft: { $not: true }, record: recordId },
      },
    },
  })) as { replies?: Array<{ id: string }> };

  return replies?.length ?? 0;
};

export const getVisibleRecord = async (
  ctx: McpContext,
  recordId: string,
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const queryShape =
    query ?? (withSubscriptions ? recordQueryWithSubscriptions : recordQuery);

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, isDraft: false } },
        ...(queryShape as typeof recordQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];

  if (!record?.log?.id || !viewer.visibleLogIds.has(record.log.id)) {
    throw new Error('Record not found or not visible');
  }

  return { record, viewer };
};

export const getCallerDraftRecord = async (
  ctx: McpContext,
  recordId: string,
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const queryShape =
    query ?? (withSubscriptions ? recordQueryWithSubscriptions : recordQuery);

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, isDraft: true } },
        ...(queryShape as typeof recordQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];

  if (
    !record?.log?.id ||
    !viewer.profile?.id ||
    record.author?.id !== viewer.profile.id ||
    !viewer.visibleLogIds.has(record.log.id)
  ) {
    throw new Error('Draft record not found or not visible');
  }

  return { record, viewer };
};

export const getReadableRecord = async (
  ctx: McpContext,
  recordId: string,
  {
    query,
    withSubscriptions = false,
  }: { query?: object; withSubscriptions?: boolean } = {}
) => {
  const queryShape =
    query ?? (withSubscriptions ? recordQueryWithSubscriptions : recordQuery);

  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId } },
        ...(queryShape as typeof recordQuery),
      },
    }) as Promise<{ records?: McpRecord[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const record = records?.[0];

  if (!record?.log?.id || !viewer.visibleLogIds.has(record.log.id)) {
    throw new Error('Record not found or not visible');
  }

  if (
    record.isDraft &&
    (!viewer.profile?.id || record.author?.id !== viewer.profile.id)
  ) {
    throw new Error('Record not found or not visible');
  }

  return { record, viewer };
};

export const registerRecordTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const listRecords = async ({
    limit = 25,
    logId,
    status = 'published',
  }: {
    limit?: number;
    logId?: string;
    status?: 'draft' | 'published';
  }) => {
    if (!logId) throw new Error('logId is required to list records');
    const viewer = await requireVisibleLog(ctx, logId);
    const profileId = viewer.profile?.id;
    if (status === 'draft' && !profileId) throw new Error('Profile not found');

    const { records } = (await ctx.db.query({
      records: {
        $: {
          fields: [
            'date' as const,
            'id' as const,
            'isDraft' as const,
            'isPinned' as const,
            'teamId' as const,
            'text' as const,
          ],
          limit,
          order: { date: 'desc' },
          where:
            status === 'draft'
              ? { author: profileId, isDraft: true, log: logId }
              : { isDraft: false, log: logId },
        },
        ...recordSummaryQuery,
      },
    })) as { records?: McpRecord[] };

    const items = (records ?? []).map((record) =>
      mcpFields.recordSummaryFields(record)
    );

    return mcpFields.textResult(
      { records: items },
      mcpFields.table(
        ['Date', 'Text', 'Tags', 'Replies', 'ID'],
        items.map((record) => [
          String(record.date),
          record.text,
          record.tags?.map((tag) => tag.name).join(', '),
          record.replyCount,
          record.id,
        ])
      )
    );
  };

  const getRecord = async ({
    include = [],
    recordId,
    replyLimit = 25,
    status,
  }: {
    include?: RecordInclude[];
    recordId?: string;
    replyLimit?: number;
    status?: 'draft' | 'published';
  }) => {
    if (!recordId) throw new Error('recordId is required to get a record');
    const includeSet = new Set(include);
    const detailQuery = recordDetailQuery({ include: includeSet, replyLimit });

    const { record } =
      status === 'draft'
        ? await getCallerDraftRecord(ctx, recordId, { query: detailQuery })
        : status === 'published'
          ? await getVisibleRecord(ctx, recordId, { query: detailQuery })
          : await getReadableRecord(ctx, recordId, { query: detailQuery });

    const replyCount = await getPublishedReplyCount(ctx, record.id);

    const detailFieldOptions = {
      ...fieldOptions,
      includeFiles: includeSet.has('files'),
      includeLinks: includeSet.has('links'),
      includeReactions: includeSet.has('reactions'),
    };

    const replies = (record.replies ?? []).map((reply) =>
      includeSet.has('replies')
        ? mcpFields.replyFields(reply, detailFieldOptions)
        : mcpFields.replySummaryFields(reply)
    );

    const item = {
      ...mcpFields.recordFields(record, detailFieldOptions),
      replyCount,
      replies,
    };

    return mcpFields.textResult(
      { record: item },
      [
        `Record ${item.id}`,
        item.log?.name ? `Log: ${item.log.name}` : undefined,
        item.text
          ? `Text: ${mcpFields.textPreview(item.text, 600)}`
          : undefined,
        item.tags?.length
          ? mcpFields.table(
              ['Tag', 'ID'],
              item.tags.map((tag) => [tag.name, tag.id])
            )
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
        item.replies?.length
          ? mcpFields.table(
              ['Reply', 'Text'],
              item.replies.map((reply) => [
                reply.id,
                mcpFields.textPreview(reply.text, 120),
              ])
            )
          : undefined,
      ]
        .filter(Boolean)
        .join('\n\n')
    );
  };

  const saveRecord = async ({
    links,
    logId,
    mode = 'publish',
    recordId,
    text,
  }: {
    links?: Array<z.infer<typeof mcpSchemas.linkInputSchema>>;
    logId?: string;
    mode?: 'draft' | 'publish';
    recordId?: string;
    text?: string;
  }) => {
    if (mode === 'draft') {
      if (recordId) {
        const { record } = await getCallerDraftRecord(ctx, recordId);
        if (!record.teamId) throw new Error('Invalid record draft');

        const transactions = [
          ...(text != null
            ? [ctx.db.tx.records[recordId].update({ text })]
            : []),
          ...(links
            ? replaceLinkTransactions({
                db: ctx.db,
                existingLinks: record.links,
                links,
                target: 'record',
                targetId: recordId,
                teamId: record.teamId,
              })
            : []),
        ];

        if (transactions.length) await ctx.db.transact(transactions);

        return mcpFields.textResult(
          { recordId, status: 'draft' },
          `Draft record: ${recordId}`
        );
      }

      if (!logId) throw new Error('logId is required to create a draft');
      const viewer = await requireVisibleLog(ctx, logId);
      const profile = viewer.profile;
      if (!profile?.id) throw new Error('Profile not found');

      const { logs } = (await ctx.db.query({
        logs: { $: { where: { id: logId } } },
      })) as { logs?: McpLog[] };

      const log = logs?.[0];
      if (!log?.teamId) throw new Error('Invalid log');
      const teamId = log.teamId;

      const { records } = (await ctx.db.query({
        records: {
          $: {
            limit: 1,
            where: { author: profile.id, isDraft: true, log: logId },
          },
          links: {},
        },
      })) as { records?: McpRecord[] };

      const draftRecordId = records?.[0]?.id ?? id();
      const now = new Date().toISOString();

      await ctx.db.transact([
        ctx.db.tx.records[draftRecordId]
          .update({
            date: records?.[0]?.date ?? now,
            isDraft: true,
            teamId,
            text: text ?? records?.[0]?.text ?? '',
          })
          .link({ author: profile.id, log: logId }),
        ...(links
          ? replaceLinkTransactions({
              db: ctx.db,
              existingLinks: records?.[0]?.links,
              links,
              target: 'record',
              targetId: draftRecordId,
              teamId,
            })
          : []),
      ]);

      return mcpFields.textResult(
        { recordId: draftRecordId, status: 'draft' },
        `Draft record: ${draftRecordId}`
      );
    }

    if (recordId) {
      const { record } = await getCallerDraftRecord(ctx, recordId, {
        withSubscriptions: true,
      });

      const nextText = (text ?? record.text ?? '').trim();
      const nextLinks = links ?? record.links ?? [];

      const hasContent =
        !!nextText || !!record.files?.length || nextLinks.length > 0;

      if (
        !hasContent ||
        !record.author?.id ||
        !record.author.name ||
        !record.log?.id ||
        !record.log.name ||
        !record.teamId
      ) {
        throw new Error('Invalid record draft');
      }

      const now = new Date().toISOString();

      await ctx.db.transact([
        ctx.db.tx.records[recordId].update({
          date: now,
          isDraft: false,
          text: nextText,
        }),
        ctx.db.tx.activities[id()]
          .update({
            date: now,
            teamId: record.teamId,
            type: 'record_published',
          })
          .link({
            actor: record.author.id,
            log: record.log.id,
            record: recordId,
            team: record.teamId,
          }),
        ...(links
          ? replaceLinkTransactions({
              db: ctx.db,
              existingLinks: record.links,
              links,
              target: 'record',
              targetId: recordId,
              teamId: record.teamId,
            })
          : []),
      ]);

      await push.sendPushNotifications(
        ctx.env,
        push.collectRecipientSubscriptions({
          actorUserId: ctx.props.userId,
          logProfiles: record.log.profiles,
          roles: record.log.team?.roles,
        }),
        push.buildRecordNotification({
          authorName: record.author.name,
          logName: record.log.name,
          recordId,
          text: nextText,
        })
      );

      return mcpFields.textResult(
        { recordId, status: 'published' },
        `Published record: ${recordId}`
      );
    }

    if (!logId) throw new Error('logId is required to publish a new record');
    const nextLinks = links ?? [];
    const trimmedText = (text ?? '').trim();

    if (!trimmedText && nextLinks.length === 0) {
      throw new Error('Record content cannot be empty');
    }

    const viewer = await requireVisibleLog(ctx, logId);
    const profile = viewer.profile;
    if (!profile?.id) throw new Error('Profile not found');

    const { logs } = (await ctx.db.query({
      logs: {
        $: { where: { id: logId } },
        profiles: { user: { subscriptions: {} } },
        team: { roles: { user: { subscriptions: {} } } },
      },
    })) as { logs?: McpLog[] };

    const log = logs?.[0];
    if (!log?.teamId) throw new Error('Invalid log');
    const teamId = log.teamId;
    const newRecordId = id();
    const now = new Date().toISOString();

    await ctx.db.transact([
      ctx.db.tx.records[newRecordId]
        .update({ date: now, isDraft: false, teamId, text: trimmedText })
        .link({ author: profile.id, log: logId }),
      ctx.db.tx.activities[id()]
        .update({ date: now, teamId, type: 'record_published' })
        .link({
          actor: profile.id,
          log: logId,
          record: newRecordId,
          team: teamId,
        }),
      ...replaceLinkTransactions({
        db: ctx.db,
        links: nextLinks,
        target: 'record',
        targetId: newRecordId,
        teamId,
      }),
    ]);

    await push.sendPushNotifications(
      ctx.env,
      push.collectRecipientSubscriptions({
        actorUserId: ctx.props.userId,
        logProfiles: log.profiles,
        roles: log.team?.roles,
      }),
      push.buildRecordNotification({
        authorName: profile.name,
        logName: log.name,
        recordId: newRecordId,
        text: trimmedText,
      })
    );

    return mcpFields.textResult(
      { recordId: newRecordId, status: 'published' },
      `Published record: ${newRecordId}`
    );
  };

  registerMcpTool(
    server,
    'records',
    {
      description: 'List, get, save, or publish records.',
      inputSchema: {
        action: recordsActionSchema,
        links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        include: z.array(mcpSchemas.recordIncludeSchema).max(4).optional(),
        logId: z.string().min(1).optional(),
        mode: mcpSchemas.saveModeSchema,
        recordId: z.string().min(1).optional(),
        replyLimit: z.number().int().min(1).max(100).optional(),
        status: mcpSchemas.contentStatusSchema,
        text: z.string().max(10240).optional(),
      },
      outputSchema: mcpSchemas.recordsOutputSchema,
    },
    async ({
      action,
      include,
      links,
      limit,
      logId,
      mode,
      recordId,
      replyLimit,
      status,
      text,
    }) => {
      switch (action) {
        case 'list': {
          return listRecords({ limit, logId, status });
        }

        case 'get': {
          return getRecord({ include, recordId, replyLimit, status });
        }

        case 'save': {
          return saveRecord({ links, logId, mode, recordId, text });
        }
      }
    }
  );
};
