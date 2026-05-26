import { runBulkItems } from '@/api/mcp/bulk';
import * as cardActions from '@/api/cards/card-actions';
import * as mcpFields from '@/api/mcp/fields';
import { getReadableRecord } from '@/api/mcp/content';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpRecord, McpTag } from '@/api/mcp/types';
import { getVisibleLog } from '@/api/mcp/viewer';
import * as recordStatus from '@/domain/records/status';
import { recordTagFields, recordTagLogsQuery } from '@/domain/tags/query';
import { findExactTagId, searchTags } from '@/domain/tags/search-tags';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordTagQuery = {
  $: { fields: recordTagFields, order: { order: 'asc' as const } },
  logs: recordTagLogsQuery,
};

const recordTagsActionSchema = z.enum(['list', 'set', 'create']);

const recordTagsItemSchema = z.object({
  logId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(16).optional(),
  query: z.string().trim().min(1).optional(),
  recordId: z.string().min(1).optional(),
  selected: z.boolean().optional(),
  tagId: z.string().min(1).optional(),
});

const getRecordForTagging = async (ctx: McpContext, recordId: string) =>
  getReadableRecord(ctx, recordId);

const getLogForRecordTags = async (ctx: McpContext, logId: string) => {
  const { log } = await getVisibleLog(ctx, logId);
  return log;
};

const requireRecordTagAccess = (
  record: McpRecord,
  viewer: Awaited<ReturnType<typeof getRecordForTagging>>['viewer']
) => {
  const role = record.teamId
    ? viewer.rolesByTeamId.get(record.teamId)?.role
    : undefined;

  const canManageDefinitions = permissions.canManageTeam(role);

  const isAuthor =
    !!viewer.profile?.id && record.author?.id === viewer.profile.id;

  if (
    !record.teamId ||
    !record.log?.id ||
    (!isAuthor && !canManageDefinitions)
  ) {
    throw new Error(
      'Only record authors and team owners/admins can tag records'
    );
  }

  return { canManageDefinitions, logId: record.log.id, teamId: record.teamId };
};

const getRecordTag = async (ctx: McpContext, tagId: string) => {
  const { tags } = (await ctx.db.query({
    tags: {
      $: { ...recordTagQuery.$, where: { id: tagId } },
      logs: recordTagQuery.logs,
    },
  })) as { tags?: McpTag[] };

  const tag = tags?.[0];
  if (!tag) throw new Error('Record tag not found');
  return tag;
};

const requireRecordTagMatchesRecord = ({
  logId,
  tag,
  teamId,
}: {
  logId: string;
  tag: McpTag;
  teamId: string;
}) => {
  if (tag.type !== 'record') throw new Error('Tag is not a record tag');
  if (tag.teamId !== teamId) throw new Error('Tag belongs to another team');

  if (!tag.logs?.some((log) => log.id === logId)) {
    throw new Error('Tag is not available for this record log');
  }
};

const listRecordTagsForLog = async ({
  ctx,
  logId,
  query,
}: {
  ctx: McpContext;
  logId: string;
  query?: string;
}) => {
  const log = await getLogForRecordTags(ctx, logId);

  const { tags } = (await ctx.db.query({
    tags: {
      $: {
        ...recordTagQuery.$,
        where: { logs: logId, teamId: log.teamId, type: 'record' },
      },
      logs: recordTagQuery.logs,
    },
  })) as { tags?: McpTag[] };

  return query ? searchTags(tags ?? [], query) : (tags ?? []);
};

export const registerTagTools = (server: McpServer, ctx: McpContext) => {
  const queueChangedRecordTagCardsRefresh = ({
    logId,
    record,
    tagId,
  }: {
    logId: string;
    record: McpRecord;
    tagId: string;
  }) => {
    if (!recordStatus.recordIsPublished(record)) return;

    ctx.executionCtx.waitUntil(
      cardActions.queuePublishedRecordCardRefreshes({
        dbClient: ctx.notificationDb,
        env: ctx.env,
        logId,
        recordTagIds: [tagId],
      })
    );
  };

  const listRecordTags = async ({
    logId,
    query,
  }: {
    logId?: string;
    query?: string;
  }) => {
    if (!logId) throw new Error('logId is required to list record tags');
    const tags = await listRecordTagsForLog({ ctx, logId, query });
    const items = tags.map(mcpFields.tagFields);

    return mcpFields.textResult(
      { tags: items },
      mcpFields.table(
        ['Name', 'ID'],
        items.map((tag) => [tag.name, tag.id])
      )
    );
  };

  const setRecordTag = async ({
    recordId,
    selected,
    tagId,
  }: {
    recordId?: string;
    selected?: boolean;
    tagId?: string;
  }) => {
    if (!recordId) throw new Error('recordId is required to set a record tag');

    if (selected == null) {
      throw new Error('selected is required to set a record tag');
    }

    if (!tagId) throw new Error('tagId is required to set a record tag');

    const [{ record, viewer }, tag] = await Promise.all([
      getRecordForTagging(ctx, recordId),
      getRecordTag(ctx, tagId),
    ]);

    const target = requireRecordTagAccess(record, viewer);
    requireRecordTagMatchesRecord({ ...target, tag });
    const alreadySelected = record.tags?.some((item) => item.id === tag.id);
    let changed = false;

    if (selected && !alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].link({ tags: tag.id })
      );

      changed = true;
    }

    if (!selected && alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].unlink({ tags: tag.id })
      );

      changed = true;
    }

    if (changed) {
      queueChangedRecordTagCardsRefresh({
        logId: target.logId,
        record,
        tagId: tag.id,
      });
    }

    return mcpFields.textResult(
      { recordId: record.id, selected, tag: mcpFields.tagFields(tag) },
      selected ? 'Record tag added.' : 'Record tag removed.'
    );
  };

  const createRecordTag = async ({
    name,
    recordId,
  }: {
    name?: string;
    recordId?: string;
  }) => {
    if (!name) throw new Error('name is required to create a record tag');

    if (!recordId) {
      throw new Error('recordId is required to create a record tag');
    }

    const trimmedName = name.trim();
    const { record, viewer } = await getRecordForTagging(ctx, recordId);
    const target = requireRecordTagAccess(record, viewer);

    if (!target.canManageDefinitions) {
      throw new Error('Only team owners and admins can create record tags');
    }

    const recordTags = await listRecordTagsForLog({ ctx, logId: target.logId });
    const existingTagId = findExactTagId(recordTags, trimmedName);
    const existingTag = recordTags.find((tag) => tag.id === existingTagId);

    const newTag = {
      id: id(),
      logs: [{ id: target.logId, name: record.log?.name ?? '' }],
      name: trimmedName,
      order: 0,
      teamId: target.teamId,
      type: 'record',
    };

    const tag = existingTag ?? newTag;
    const alreadySelected = record.tags?.some((item) => item.id === tag.id);
    let changed = false;

    if (!existingTag) {
      await ctx.db.transact([
        ctx.db.tx.tags[tag.id]
          .update({
            name: tag.name,
            order: newTag.order,
            teamId: target.teamId,
            type: 'record',
          })
          .link({ logs: target.logId, team: target.teamId }),
        ...recordTags.map((tag, index) =>
          ctx.db.tx.tags[tag.id].update({ order: index + 1 })
        ),
        ctx.db.tx.records[record.id].link({ tags: tag.id }),
      ]);

      changed = true;
    } else if (!alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].link({ tags: tag.id })
      );

      changed = true;
    }

    if (changed) {
      queueChangedRecordTagCardsRefresh({
        logId: target.logId,
        record,
        tagId: tag.id,
      });
    }

    return mcpFields.textResult(
      {
        created: !existingTag,
        recordId: record.id,
        selected: true,
        tag: mcpFields.tagFields(tag),
      },
      `${existingTag ? 'Applied' : 'Created'} record tag: ${tag.name} (${tag.id})`
    );
  };

  registerMcpTool(
    server,
    'record_tags',
    {
      description:
        'Batch list, create, apply, and remove record tags with items.',
      inputSchema: {
        action: recordTagsActionSchema,
        items: z.array(recordTagsItemSchema).min(1).max(50),
      },
      outputSchema: mcpSchemas.recordTagsOutputSchema,
    },
    async ({ action, items }) => {
      switch (action) {
        case 'list': {
          return runBulkItems({ action, handler: listRecordTags, items });
        }

        case 'set': {
          return runBulkItems({ action, handler: setRecordTag, items });
        }

        case 'create': {
          return runBulkItems({ action, handler: createRecordTag, items });
        }
      }
    }
  );
};
