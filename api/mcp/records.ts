import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpLog, McpRecord } from '@/api/mcp/types';
import { getViewer, requireVisibleLog } from '@/api/mcp/viewer';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as push from '@/api/push/web-push';
import { visibleFileQuery } from '@/domain/files/query';
import * as recordPublish from '@/domain/records/publish';
import * as recordQueries from '@/domain/records/query';
import { recordTagsQuery } from '@/domain/tags/query';
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

const recordSummaryQuery = {
  files: recordQueries.countFileQuery,
  links: recordQueries.countLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: recordQueries.countReactionQuery,
  replies: {
    $: {
      fields: ['id' as const, 'isDraft' as const],
      where: { isDraft: { $not: true } },
    },
  },
  tags: recordTagsQuery,
};

const recordPublishQuery = {
  ...recordQuery,
  log: { $: { fields: ['id' as const, 'name' as const, 'teamId' as const] } },
};

const recordsActionSchema = z.enum(['list', 'get', 'save']);
type RecordInclude = z.infer<typeof mcpSchemas.recordIncludeSchema>;

const recordIdFromUrl = (recordUrl?: string) => {
  if (!recordUrl) return undefined;

  try {
    const url = new URL(recordUrl);
    const [, resource, recordId] = url.pathname.split('/');

    return resource === 'records' && recordId
      ? decodeURIComponent(recordId)
      : undefined;
  } catch {
    return undefined;
  }
};

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
    author: recordQueries.summaryProfileQuery,
    files: includeFiles ? visibleFileQuery : recordQueries.countFileQuery,
    links: includeLinks ? {} : recordQueries.countLinkQuery,
    log: { $: { fields: ['id' as const, 'name' as const] } },
    reactions: recordQueries.countReactionQuery,
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
      author: recordQueries.summaryProfileQuery,
      files: includeFiles ? visibleFileQuery : recordQueries.countFileQuery,
      links: includeLinks ? {} : recordQueries.countLinkQuery,
      reactions: recordQueries.countReactionQuery,
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
  { query }: { query?: object } = {}
) => {
  const queryShape = query ?? recordQuery;

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
  if (!record?.log?.id) throw new Error('Record not found or not visible');
  return { record, viewer };
};

export const getCallerDraftRecord = async (
  ctx: McpContext,
  recordId: string,
  { query }: { query?: object } = {}
) => {
  const queryShape = query ?? recordQuery;

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
    record.author?.id !== viewer.profile.id
  ) {
    throw new Error('Draft record not found or not visible');
  }

  return { record, viewer };
};

export const getReadableRecord = async (
  ctx: McpContext,
  recordId: string,
  { query }: { query?: object } = {}
) => {
  const queryShape = query ?? recordQuery;

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
  if (!record?.log?.id) throw new Error('Record not found or not visible');

  if (
    record.isDraft &&
    (!viewer.profile?.id || record.author?.id !== viewer.profile.id)
  ) {
    throw new Error('Record not found or not visible');
  }

  return { record, viewer };
};

export const getNotificationLog = async (ctx: McpContext, logId: string) => {
  const { logs } = (await ctx.notificationDb.query({
    logs: {
      $: {
        fields: ['id' as const, 'name' as const, 'teamId' as const],
        where: { id: logId },
      },
      ...notificationRecipientLogQuery,
    },
  })) as { logs?: McpLog[] };

  const log = logs?.[0];
  if (!log?.id) throw new Error('Notification log not found');
  return log;
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
    })) as unknown as { records?: McpRecord[] };

    const items = (records ?? []).map((record) =>
      mcpFields.recordSummaryFields(record, fieldOptions)
    );

    return mcpFields.textResult(
      { records: items },
      mcpFields.table(
        ['Date', 'Text', 'Tags', 'Replies', 'URL'],
        items.map((record) => [
          String(record.date),
          record.text,
          record.tags?.map((tag) => tag.name).join(', '),
          record.replyCount,
          record.url,
        ])
      )
    );
  };

  const getRecord = async ({
    include = [],
    recordId,
    recordUrl,
    replyLimit = 25,
    status,
  }: {
    include?: RecordInclude[];
    recordId?: string;
    recordUrl?: string;
    replyLimit?: number;
    status?: 'draft' | 'published';
  }) => {
    const resolvedRecordId = recordId ?? recordIdFromUrl(recordUrl);

    if (!resolvedRecordId) {
      throw new Error('recordId or recordUrl is required to get a record');
    }

    const includeSet = new Set(include);
    const detailQuery = recordDetailQuery({ include: includeSet, replyLimit });

    const { record } =
      status === 'draft'
        ? await getCallerDraftRecord(ctx, resolvedRecordId, {
            query: detailQuery,
          })
        : status === 'published'
          ? await getVisibleRecord(ctx, resolvedRecordId, {
              query: detailQuery,
            })
          : await getReadableRecord(ctx, resolvedRecordId, {
              query: detailQuery,
            });

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
        'Record',
        item.log?.name ? `Log: ${item.log.name}` : undefined,
        item.url ? `URL: ${item.url}` : undefined,
        item.text
          ? `Text: ${mcpFields.textPreview(item.text, 600)}`
          : undefined,
        item.tags?.length
          ? mcpFields.table(
              ['Tag'],
              item.tags.map((tag) => [tag.name])
            )
          : undefined,
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
        item.replies?.length
          ? mcpFields.table(
              ['Reply'],
              item.replies.map((reply) => [
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
        query: recordPublishQuery,
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

      const notificationLog = await getNotificationLog(ctx, record.log.id);
      const now = new Date().toISOString();

      await ctx.db.transact([
        ...recordPublish.buildPublishDraftRecordTransactions({
          activityDate: now,
          activityId: id(),
          actorId: record.author.id,
          db: ctx.db,
          logId: record.log.id,
          recordId,
          teamId: record.teamId,
          text: nextText,
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
          logProfiles: notificationLog.profiles,
          roles: notificationLog.team?.roles,
        }),
        push.buildRecordNotification({
          authorName: record.author.name,
          logName: record.log.name ?? notificationLog.name,
          recordId,
          text: nextText,
        }),
        { staleSubscriptionDb: ctx.notificationDb }
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
    const log = await getNotificationLog(ctx, logId);
    if (!log?.teamId) throw new Error('Invalid log');
    const teamId = log.teamId;
    const newRecordId = id();
    const now = new Date().toISOString();

    await ctx.db.transact([
      ...recordPublish.buildCreatePublishedRecordTransactions({
        activityId: id(),
        authorId: profile.id,
        db: ctx.db,
        logId,
        now,
        recordId: newRecordId,
        teamId,
        text: trimmedText,
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
      }),
      { staleSubscriptionDb: ctx.notificationDb }
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
        recordUrl: z.string().url().optional(),
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
      recordUrl,
      replyLimit,
      status,
      text,
    }) => {
      switch (action) {
        case 'list': {
          return listRecords({ limit, logId, status });
        }

        case 'get': {
          return getRecord({
            include,
            recordId,
            recordUrl,
            replyLimit,
            status,
          });
        }

        case 'save': {
          return saveRecord({ links, logId, mode, recordId, text });
        }
      }
    }
  );
};
