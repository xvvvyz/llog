import * as mcpFields from '@/api/mcp/fields';
import { replaceLinkTransactions } from '@/api/mcp/links';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpLog, McpRecord } from '@/api/mcp/types';
import { getViewer, requireVisibleLog } from '@/api/mcp/viewer';
import * as push from '@/api/push/web-push';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

export const recordQuery = {
  author: { image: {}, user: {} },
  files: {},
  links: {},
  log: { team: { $: { fields: ['id' as const] } } },
  reactions: { author: {} },
  replies: {
    $: { order: { date: 'asc' as const }, where: { isDraft: { $not: true } } },
    author: { image: {} },
    files: {},
    links: {},
    reactions: { author: {} },
  },
};

const recordQueryWithSubscriptions = {
  ...recordQuery,
  log: {
    profiles: { user: { subscriptions: {} } },
    team: { roles: { user: { subscriptions: {} } } },
  },
};

export const getVisibleRecord = async (
  ctx: McpContext,
  recordId: string,
  { withSubscriptions = false } = {}
) => {
  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, isDraft: false } },
        ...(withSubscriptions ? recordQueryWithSubscriptions : recordQuery),
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
  { withSubscriptions = false } = {}
) => {
  const [{ records }, viewer] = await Promise.all([
    ctx.db.query({
      records: {
        $: { where: { id: recordId, isDraft: true } },
        ...(withSubscriptions ? recordQueryWithSubscriptions : recordQuery),
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

export const registerRecordTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  server.registerTool(
    'list_records',
    {
      description: 'List records.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        logId: z.string().min(1),
      },
    },
    async ({ limit = 25, logId }) => {
      await requireVisibleLog(ctx, logId);

      const { records } = (await ctx.db.query({
        records: {
          $: {
            limit,
            order: { date: 'desc' },
            where: { isDraft: false, log: logId },
          },
          ...recordQuery,
        },
      })) as { records?: McpRecord[] };

      const items = (records ?? []).map((record) =>
        mcpFields.recordSummaryFields(record, fieldOptions)
      );

      return mcpFields.textResult(
        { records: items },
        mcpFields.table(
          ['Date', 'Text', 'Replies', 'ID'],
          items.map((record) => [
            String(record.date),
            record.text,
            record.replyCount,
            record.id,
          ])
        )
      );
    }
  );

  server.registerTool(
    'get_record',
    {
      description: 'Get a record.',
      inputSchema: {
        recordId: z.string().min(1),
        status: mcpSchemas.contentStatusSchema,
      },
    },
    async ({ recordId, status = 'published' }) => {
      const { record } =
        status === 'draft'
          ? await getCallerDraftRecord(ctx, recordId)
          : await getVisibleRecord(ctx, recordId);

      const item = {
        ...mcpFields.recordFields(record, fieldOptions),
        replies: (record.replies ?? []).map((reply) =>
          mcpFields.replyFields(reply, fieldOptions)
        ),
      };

      return mcpFields.textResult(
        { record: item },
        [
          `Record ${item.id}`,
          item.log?.name ? `Log: ${item.log.name}` : undefined,
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
    }
  );

  server.registerTool(
    'save_record',
    {
      description: 'Save a record.',
      inputSchema: {
        links: z.array(mcpSchemas.linkInputSchema).max(20).optional(),
        logId: z.string().min(1).optional(),
        mode: mcpSchemas.saveModeSchema,
        recordId: z.string().min(1).optional(),
        text: z.string().max(10240).optional(),
      },
    },
    async ({ links, logId, mode = 'publish', recordId, text }) => {
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
    }
  );
};
