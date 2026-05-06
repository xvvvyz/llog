import * as mcpFields from '@/api/mcp/fields';
import { getCallerDraftRecord, getVisibleRecord } from '@/api/mcp/records';
import * as mcpSchemas from '@/api/mcp/schemas';
import { recordTagFields, recordTagLogsQuery } from '@/api/mcp/tag-query';
import type { McpContext, McpLog, McpRecord, McpTag } from '@/api/mcp/types';
import { requireVisibleLog } from '@/api/mcp/viewer';
import { findExactTagId, searchTags } from '@/domain/tags/search-tags';
import * as permissions from '@/domain/teams/permissions';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const recordTagQuery = {
  $: { fields: recordTagFields },
  logs: recordTagLogsQuery,
};

const recordTagsActionSchema = z.enum(['list', 'set', 'create']);

const byTagOrder = (a: McpTag, b: McpTag) =>
  (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

const getRecordForTagging = async (
  ctx: McpContext,
  recordId: string,
  status: 'draft' | 'published'
) =>
  status === 'draft'
    ? getCallerDraftRecord(ctx, recordId)
    : getVisibleRecord(ctx, recordId);

const getLogForRecordTags = async (ctx: McpContext, logId: string) => {
  await requireVisibleLog(ctx, logId);

  const { logs } = (await ctx.db.query({
    logs: {
      $: {
        fields: [
          'color' as const,
          'id' as const,
          'name' as const,
          'teamId' as const,
        ],
        where: { id: logId },
      },
    },
  })) as { logs?: McpLog[] };

  const log = logs?.[0];
  const teamId = log?.teamId;
  if (!teamId) throw new Error('Log not found or not visible');
  return { ...log, teamId };
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
  limit,
  logId,
  query,
}: {
  ctx: McpContext;
  limit?: number;
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

  const orderedTags = [...(tags ?? [])].sort(byTagOrder);
  const matchingTags = query ? searchTags(orderedTags, query) : orderedTags;

  return typeof limit === 'number'
    ? matchingTags.slice(0, limit)
    : matchingTags;
};

export const registerTagTools = (server: McpServer, ctx: McpContext) => {
  const listRecordTags = async ({
    limit = 50,
    logId,
    query,
  }: {
    limit?: number;
    logId?: string;
    query?: string;
  }) => {
    if (!logId) throw new Error('logId is required to list record tags');
    const tags = await listRecordTagsForLog({ ctx, limit, logId, query });
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
    status = 'published',
    tagId,
  }: {
    recordId?: string;
    selected?: boolean;
    status?: 'draft' | 'published';
    tagId?: string;
  }) => {
    if (!recordId) throw new Error('recordId is required to set a record tag');

    if (selected == null) {
      throw new Error('selected is required to set a record tag');
    }

    if (!tagId) throw new Error('tagId is required to set a record tag');

    const [{ record, viewer }, tag] = await Promise.all([
      getRecordForTagging(ctx, recordId, status),
      getRecordTag(ctx, tagId),
    ]);

    const target = requireRecordTagAccess(record, viewer);
    requireRecordTagMatchesRecord({ ...target, tag });
    const alreadySelected = record.tags?.some((item) => item.id === tag.id);

    if (selected && !alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].link({ tags: tag.id })
      );
    }

    if (!selected && alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].unlink({ tags: tag.id })
      );
    }

    return mcpFields.textResult(
      { recordId: record.id, selected, tag: mcpFields.tagFields(tag) },
      selected ? 'Record tag added.' : 'Record tag removed.'
    );
  };

  const createRecordTag = async ({
    name,
    recordId,
    status = 'published',
  }: {
    name?: string;
    recordId?: string;
    status?: 'draft' | 'published';
  }) => {
    if (!name) throw new Error('name is required to create a record tag');

    if (!recordId) {
      throw new Error('recordId is required to create a record tag');
    }

    const trimmedName = name.trim();
    const { record, viewer } = await getRecordForTagging(ctx, recordId, status);
    const target = requireRecordTagAccess(record, viewer);

    if (!target.canManageDefinitions) {
      throw new Error('Only team owners and admins can create record tags');
    }

    const [recordTags, log] = await Promise.all([
      listRecordTagsForLog({ ctx, logId: target.logId }),
      getLogForRecordTags(ctx, target.logId),
    ]);

    const existingTagId = findExactTagId(recordTags, trimmedName);
    const existingTag = recordTags.find((tag) => tag.id === existingTagId);

    const newTag = {
      color: resolveSpectrumColor(log.color),
      id: id(),
      logs: [{ id: target.logId, name: record.log?.name ?? '' }],
      name: trimmedName,
      order: -Date.now(),
      teamId: target.teamId,
      type: 'record',
    };

    const tag = existingTag ?? newTag;
    const alreadySelected = record.tags?.some((item) => item.id === tag.id);

    if (!existingTag) {
      await ctx.db.transact([
        ctx.db.tx.tags[tag.id]
          .update({
            color: newTag.color,
            name: tag.name,
            order: newTag.order,
            teamId: target.teamId,
            type: 'record',
          })
          .link({ logs: target.logId, team: target.teamId }),
        ctx.db.tx.records[record.id].link({ tags: tag.id }),
      ]);
    } else if (!alreadySelected) {
      await ctx.db.transact(
        ctx.db.tx.records[record.id].link({ tags: tag.id })
      );
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

  server.registerTool(
    'record_tags',
    {
      description: 'List, apply, remove, or create record tags.',
      inputSchema: {
        action: recordTagsActionSchema,
        limit: z.number().int().min(1).max(100).optional(),
        logId: z.string().min(1).optional(),
        name: z.string().trim().min(1).max(16).optional(),
        query: z.string().trim().min(1).optional(),
        recordId: z.string().min(1).optional(),
        selected: z.boolean().optional(),
        status: mcpSchemas.contentStatusSchema,
        tagId: z.string().min(1).optional(),
      },
    },
    async ({
      action,
      limit,
      logId,
      name,
      query,
      recordId,
      selected,
      status,
      tagId,
    }) => {
      switch (action) {
        case 'list': {
          return listRecordTags({ limit, logId, query });
        }

        case 'set': {
          return setRecordTag({ recordId, selected, status, tagId });
        }

        case 'create': {
          return createRecordTag({ name, recordId, status });
        }
      }
    }
  );
};
