import { runBulkItems } from '@/api/mcp/bulk';
import * as cardActions from '@/api/cards/card-actions';
import * as content from '@/api/mcp/content';
import * as contentQueries from '@/api/mcp/content-queries';
import * as mcpFields from '@/api/mcp/fields';
import { RECORD_TEXT_DESCRIPTION } from '@/api/mcp/formatting';
import { replaceLinkTransactions } from '@/api/mcp/links';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpRecord } from '@/api/mcp/types';
import { getVisibleLog, requireVisibleLog } from '@/api/mcp/viewer';
import * as push from '@/api/push/web-push';
import * as recordScheduler from '@/api/records/record-scheduler';
import * as recordIdentity from '@/domain/records/identity-fields';
import * as recordPublish from '@/domain/records/publish';
import { scheduledRecordWhere } from '@/domain/records/query';
import * as recordStatus from '@/domain/records/status';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordsActionSchema = z.enum(['list', 'get', 'save', 'update']);

const recordItemSchema = z.object({
  date: z.string().datetime().optional(),
  include: z.array(mcpSchemas.recordIncludeSchema).max(4).optional(),
  links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  logId: z.string().min(1).optional(),
  mode: mcpSchemas.saveModeSchema,
  recordId: z.string().min(1).optional(),
  recordUrl: z.string().url().optional(),
  replyLimit: z.number().int().min(1).max(100).optional(),
  status: mcpSchemas.contentStatusSchema,
  text: z.string().max(10240).optional().describe(RECORD_TEXT_DESCRIPTION),
});

const draftRecordError = () =>
  new Error(
    'Draft record not found. For published records, use action: update.'
  );

const isFutureDate = (date: string, now: string) =>
  new Date(date).getTime() > new Date(now).getTime();

export const registerRecordTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const queuePublishedRecordCardRefreshes = (record: McpRecord) => {
    const logId = record.log?.id;
    const recordTagIds = record.tags?.map((tag) => tag.id) ?? [];
    if (!logId || !recordTagIds.length) return;

    ctx.executionCtx.waitUntil(
      cardActions.queuePublishedRecordCardRefreshes({
        dbClient: ctx.notificationDb,
        env: ctx.env,
        logId,
        recordTagIds,
      })
    );
  };

  const listRecords = async ({
    limit = 25,
    logId,
    status = 'published',
  }: {
    limit?: number;
    logId?: string;
    status?: recordStatus.RecordStatus;
  }) => {
    if (!logId) throw new Error('logId is required to list records');
    const viewer = await requireVisibleLog(ctx, logId);
    const profileId = viewer.profile?.id;

    if (status !== 'published' && !profileId) {
      throw new Error('Profile not found');
    }

    const where =
      status === 'draft'
        ? recordIdentity.getDraftRecordLookupWhere({
            authorId: profileId!,
            logId,
          })
        : status === 'scheduled'
          ? { ...scheduledRecordWhere, authorId: profileId!, logId }
          : recordIdentity.getPublishedLogRecordWhere(logId);

    const { records } = (await ctx.db.query({
      records: {
        $: {
          fields: [
            'date' as const,
            'id' as const,
            'isPinned' as const,
            'status' as const,
            'teamId' as const,
            'text' as const,
          ],
          limit,
          order: { date: 'desc' },
          where,
        },
        ...contentQueries.recordSummaryQuery,
      },
    })) as unknown as { records?: McpRecord[] };

    const items = (records ?? [])
      .filter((record) => recordStatus.getRecordStatus(record) === status)
      .map((record) => mcpFields.recordSummaryFields(record, fieldOptions));

    return mcpFields.textResult(
      { records: items },
      mcpFields.table(
        ['Date', 'Status', 'Text', 'Tags', 'Replies', 'URL'],
        items.map((record) => [
          String(record.date),
          record.status,
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
  }: {
    include?: contentQueries.RecordInclude[];
    recordId?: string;
    recordUrl?: string;
    replyLimit?: number;
  }) => {
    const resolvedRecordId = recordId ?? content.recordIdFromUrl(recordUrl);

    if (!resolvedRecordId) {
      throw new Error('recordId or recordUrl is required to get a record');
    }

    const includeSet = new Set(include);

    const detailQuery = contentQueries.recordDetailQuery({
      include: includeSet,
      replyLimit,
    });

    const { record } = await content.getReadableRecord(ctx, resolvedRecordId, {
      query: detailQuery,
    });

    const replyCount = await content.getPublishedReplyCount(ctx, record.id);

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
        mcpFields.textBlock('Text', item.text),
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
    date,
    links,
    logId,
    mode = 'publish',
    recordId,
    text,
  }: {
    date?: string;
    links?: z.infer<typeof mcpSchemas.linkInputSchema>[];
    logId?: string;
    mode?: 'draft' | 'publish';
    recordId?: string;
    text?: string;
  }) => {
    if (mode === 'draft') {
      if (recordId) {
        const { record } = await content
          .getCallerDraftRecord(ctx, recordId)
          .catch(() => {
            throw draftRecordError();
          });

        if (!record.teamId) throw new Error('Invalid record draft');

        const recordUpdate = {
          ...(text != null ? { text } : {}),
          ...(date ? { date } : {}),
        };

        const transactions = [
          ...(Object.keys(recordUpdate).length
            ? [ctx.db.tx.records[recordId].update(recordUpdate)]
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
      const { log, viewer } = await getVisibleLog(ctx, logId);
      const profile = viewer.profile;
      if (!profile?.id) throw new Error('Profile not found');
      const teamId = log.teamId;

      const { records } = (await ctx.db.query({
        records: {
          $: {
            limit: 1,
            where: recordIdentity.getDraftRecordLookupWhere({
              authorId: profile.id,
              logId,
            }),
          },
          links: {},
        },
      })) as { records?: McpRecord[] };

      const draftRecordId = records?.[0]?.id ?? id();
      const now = new Date().toISOString();

      await ctx.db.transact([
        ctx.db.tx.records[draftRecordId]
          .update({
            ...recordIdentity.getRecordIdentityFields({
              authorId: profile.id,
              logId,
            }),
            date: date ?? records?.[0]?.date ?? now,
            ...recordIdentity.getStatusFields('draft'),
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
      const { record } = await content
        .getCallerDraftRecord(ctx, recordId, {
          query: contentQueries.recordPublishQuery,
        })
        .catch(() => {
          throw draftRecordError();
        });

      const nextText = (text ?? record.text ?? '').trim();
      const nextLinks = links ?? record.links ?? [];

      const hasContent = content.hasLinkedContent({
        files: record.files,
        links: nextLinks,
        text: nextText,
      });

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

      if (date && isFutureDate(date, now)) {
        await ctx.db.transact([
          ctx.db.tx.records[recordId].update({
            date,
            ...recordIdentity.getStatusFields('scheduled'),
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

        await recordScheduler.scheduleRecordPublish(ctx.env, {
          publishAt: date,
          recordId,
        });

        return mcpFields.textResult(
          { recordId, status: 'scheduled' },
          `Scheduled record: ${recordId} for ${date}`
        );
      }

      const notificationLog = await content.getNotificationLog(
        ctx,
        record.log.id
      );

      await ctx.db.transact([
        ...recordPublish.buildPublishDraftRecordTransactions({
          activityDate: now,
          activityId: id(),
          actorId: record.author.id,
          contentDate: date,
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

      queuePublishedRecordCardRefreshes(record);

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

    if (!content.hasLinkedContent({ links: nextLinks, text: trimmedText })) {
      throw new Error('Record content cannot be empty');
    }

    const viewer = await requireVisibleLog(ctx, logId);
    const profile = viewer.profile;
    if (!profile?.id) throw new Error('Profile not found');
    const log = await content.getNotificationLog(ctx, logId);
    if (!log?.teamId) throw new Error('Invalid log');
    const teamId = log.teamId;
    const newRecordId = id();
    const now = new Date().toISOString();

    if (date && isFutureDate(date, now)) {
      await ctx.db.transact([
        ctx.db.tx.records[newRecordId]
          .update({
            ...recordIdentity.getRecordIdentityFields({
              authorId: profile.id,
              logId,
            }),
            date,
            ...recordIdentity.getStatusFields('scheduled'),
            teamId,
            ...(trimmedText ? { text: trimmedText } : {}),
          })
          .link({ author: profile.id, log: logId }),
        ...replaceLinkTransactions({
          db: ctx.db,
          links: nextLinks,
          target: 'record',
          targetId: newRecordId,
          teamId,
        }),
      ]);

      await recordScheduler.scheduleRecordPublish(ctx.env, {
        publishAt: date,
        recordId: newRecordId,
      });

      return mcpFields.textResult(
        { recordId: newRecordId, status: 'scheduled' },
        `Scheduled record: ${newRecordId} for ${date}`
      );
    }

    await ctx.db.transact([
      ...recordPublish.buildCreatePublishedRecordTransactions({
        activityId: id(),
        authorId: profile.id,
        contentDate: date,
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

  const updateRecord = async ({
    links,
    recordId,
    recordUrl,
    text,
  }: {
    links?: z.infer<typeof mcpSchemas.linkInputSchema>[];
    recordId?: string;
    recordUrl?: string;
    text?: string;
  }) => {
    const resolvedRecordId = recordId ?? content.recordIdFromUrl(recordUrl);

    if (!resolvedRecordId) {
      throw new Error('recordId or recordUrl is required to update a record');
    }

    if (text === undefined && links === undefined) {
      throw new Error('text or links is required to update a record');
    }

    const { record } = await content.getVisibleRecord(ctx, resolvedRecordId, {
      query: contentQueries.recordPublishQuery,
    });

    if (record.author?.user?.id !== ctx.props.userId) {
      throw new Error('Only the record author can update a published record');
    }

    if (!record.teamId) throw new Error('Invalid record');
    const nextText = text === undefined ? (record.text ?? '') : text.trim();
    const nextLinks = links ?? record.links ?? [];

    const hasContent = content.hasLinkedContent({
      files: record.files,
      links: nextLinks,
      text: nextText,
    });

    if (!hasContent) throw new Error('Record content cannot be empty');

    const transactions = [
      ...(text !== undefined
        ? [ctx.db.tx.records[record.id].update({ text: nextText })]
        : []),
      ...(links
        ? replaceLinkTransactions({
            db: ctx.db,
            existingLinks: record.links,
            links,
            target: 'record',
            targetId: record.id,
            teamId: record.teamId,
          })
        : []),
    ];

    await ctx.db.transact(transactions);
    queuePublishedRecordCardRefreshes(record);

    return mcpFields.textResult(
      { recordId: record.id, status: 'published' },
      `Updated record: ${record.id}`
    );
  };

  registerMcpTool(
    server,
    'records',
    {
      description:
        'Batch list, read, draft, publish, and update records with items. Set date (ISO 8601) to backdate a record, or a future date to schedule it.',
      inputSchema: {
        action: recordsActionSchema,
        items: z.array(recordItemSchema).min(1).max(25),
      },
      outputSchema: mcpSchemas.recordsOutputSchema,
    },
    async ({ action, items }) => {
      switch (action) {
        case 'list': {
          return runBulkItems({ action, handler: listRecords, items });
        }

        case 'get': {
          return runBulkItems({ action, handler: getRecord, items });
        }

        case 'save': {
          return runBulkItems({ action, handler: saveRecord, items });
        }

        case 'update': {
          return runBulkItems({ action, handler: updateRecord, items });
        }
      }
    }
  );
};
