import * as mcpFields from '@/api/mcp/fields';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpTag, McpTemplate } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as logTemplates from '@/domain/logs/templates';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const templateActionsSchema = z.enum(['list', 'get', 'save', 'delete']);

const requireManageTemplates = ({
  teamId,
  viewer,
}: {
  teamId?: string | null;
  viewer: Awaited<ReturnType<typeof getViewer>>;
}) => {
  const role = teamId ? viewer.rolesByTeamId.get(teamId)?.role : undefined;

  if (!permissions.canManageTeam(role)) {
    throw new Error('Only team owners and admins can manage templates');
  }
};

const getTemplateLog = async (ctx: McpContext, logId: string) => {
  const viewer = await getViewer(ctx.db, ctx.props.userId);
  const log = viewer.visibleLogs.find((log) => log.id === logId);
  if (!log?.teamId) throw new Error('Log not found or not visible');
  return { log: { id: log.id, name: log.name, teamId: log.teamId }, viewer };
};

const getTemplate = async (ctx: McpContext, templateId: string) => {
  const [{ templates }, viewer] = await Promise.all([
    ctx.db.query({
      templates: {
        $: {
          fields: logTemplates.logTemplateFields,
          where: { id: templateId },
        },
        ...logTemplates.templateQuery,
      },
    }) as Promise<{ templates?: McpTemplate[] }>,
    getViewer(ctx.db, ctx.props.userId),
  ]);

  const template = templates?.[0];

  if (
    !template?.log?.id ||
    !template.teamId ||
    !viewer.visibleLogIds.has(template.log.id)
  ) {
    throw new Error('Template not found or not visible');
  }

  return { template, viewer };
};

const loadNextTemplateOrder = async (ctx: McpContext, logId: string) => {
  const { templates } = (await ctx.db.query({
    templates: {
      $: {
        fields: ['order' as const],
        order: { order: 'desc' },
        where: { logId },
      },
    },
  })) as { templates?: Pick<McpTemplate, 'order'>[] };

  return logTemplates.getNextTemplateOrder(templates ?? []);
};

const validateTemplateTags = async ({
  ctx,
  logId,
  tagIds,
  teamId,
}: {
  ctx: McpContext;
  logId: string;
  tagIds?: string[];
  teamId: string;
}) => {
  const ids = logTemplates.uniqueTemplateTagIds(tagIds);
  if (!ids.length) return ids;

  const { tags } = (await ctx.db.query({
    tags: {
      $: { ...logTemplates.templateTagQuery.$, where: { id: { $in: ids } } },
      logs: logTemplates.templateTagQuery.logs,
    },
  })) as { tags?: McpTag[] };

  const tagsById = new Map((tags ?? []).map((tag) => [tag.id, tag]));

  for (const tagId of ids) {
    const tag = tagsById.get(tagId);
    if (!tag) throw new Error(`Record tag not found: ${tagId}`);

    if (tag.type !== 'record') {
      throw new Error(`Tag is not a record tag: ${tagId}`);
    }

    if (tag.teamId !== teamId) {
      throw new Error(`Tag belongs to another team: ${tagId}`);
    }

    if (!tag.logs?.some((log) => log.id === logId)) {
      throw new Error(`Tag is not available for this log: ${tagId}`);
    }
  }

  return ids;
};

export const registerTemplateTools = (server: McpServer, ctx: McpContext) => {
  const listTemplates = async ({
    limit = 50,
    logId,
    query,
  }: {
    limit?: number;
    logId?: string;
    query?: string;
  }) => {
    if (!logId) throw new Error('logId is required to list templates');
    await getTemplateLog(ctx, logId);

    const { templates } = (await ctx.db.query({
      templates: {
        $: {
          fields: logTemplates.logTemplateFields,
          order: { order: 'asc' },
          where: { logId },
        },
        ...logTemplates.templateQuery,
      },
    })) as { templates?: McpTemplate[] };

    const items = logTemplates
      .filterTemplatesByQuery(templates ?? [], query)
      .slice(0, limit)
      .map(mcpFields.templateFields);

    return mcpFields.textResult(
      { templates: items },
      mcpFields.table(
        ['Text', 'Tags', 'ID'],
        items.map((template) => [
          mcpFields.textPreview(template.text, 120),
          template.tags?.map((tag) => tag.name).join(', '),
          template.id,
        ])
      )
    );
  };

  const getTemplateDetail = async ({ templateId }: { templateId?: string }) => {
    if (!templateId) {
      throw new Error('templateId is required to get a template');
    }

    const { template } = await getTemplate(ctx, templateId);
    const item = mcpFields.templateFields(template);

    return mcpFields.textResult(
      { template: item },
      [
        `Template: ${item.id}`,
        item.log?.name ? `Log: ${item.log.name}` : undefined,
        item.tags?.length
          ? mcpFields.table(
              ['Tag'],
              item.tags.map((tag) => [tag.name])
            )
          : undefined,
        mcpFields.textBlock('Text', item.text),
      ]
        .filter(Boolean)
        .join('\n\n')
    );
  };

  const saveTemplate = async ({
    logId,
    tagIds,
    templateId,
    text,
  }: {
    logId?: string;
    tagIds?: string[];
    templateId?: string;
    text?: string;
  }) => {
    if (templateId) {
      const { template, viewer } = await getTemplate(ctx, templateId);

      if (!template.log?.id || !template.teamId) {
        throw new Error('Invalid template');
      }

      requireManageTemplates({ teamId: template.teamId, viewer });
      const fields: { text?: string } = {};

      if (text !== undefined) {
        const trimmedText = text.trim();
        if (!trimmedText) throw new Error('text cannot be empty');
        fields.text = text;
      }

      const transactions = Object.keys(fields).length
        ? [ctx.db.tx.templates[templateId].update(fields)]
        : [];

      if (tagIds !== undefined) {
        const nextTagIds = await validateTemplateTags({
          ctx,
          logId: template.log.id,
          tagIds,
          teamId: template.teamId,
        });

        const { linkTagIds, unlinkTagIds } = logTemplates.getTemplateTagChanges(
          { currentTagIds: template.tags?.map((tag) => tag.id), nextTagIds }
        );

        transactions.push(
          ...linkTagIds.map((tagId) =>
            ctx.db.tx.templates[templateId].link({ tags: tagId })
          ),
          ...unlinkTagIds.map((tagId) =>
            ctx.db.tx.templates[templateId].unlink({ tags: tagId })
          )
        );
      }

      if (!transactions.length) throw new Error('No template changes provided');
      await ctx.db.transact(transactions);
      const { template: savedTemplate } = await getTemplate(ctx, templateId);
      const item = mcpFields.templateFields(savedTemplate);

      return mcpFields.textResult(
        { template: item, templateId },
        `Updated template: ${templateId}`
      );
    }

    if (!logId) throw new Error('logId is required to create a template');
    const { log, viewer } = await getTemplateLog(ctx, logId);
    requireManageTemplates({ teamId: log.teamId, viewer });
    const templateText = text;

    if (!templateText?.trim()) {
      throw new Error('text is required to create a template');
    }

    const nextTagIds = await validateTemplateTags({
      ctx,
      logId: log.id,
      tagIds,
      teamId: log.teamId,
    });

    const newTemplateId = id();

    await ctx.db.transact([
      ctx.db.tx.templates[newTemplateId]
        .update({
          logId: log.id,
          order: await loadNextTemplateOrder(ctx, log.id),
          teamId: log.teamId,
          text: templateText,
        })
        .link({ log: log.id }),
      ...nextTagIds.map((tagId) =>
        ctx.db.tx.templates[newTemplateId].link({ tags: tagId })
      ),
    ]);

    const { template } = await getTemplate(ctx, newTemplateId);
    const item = mcpFields.templateFields(template);

    return mcpFields.textResult(
      { template: item, templateId: newTemplateId },
      `Created template: ${newTemplateId}`
    );
  };

  const deleteTemplate = async ({ templateId }: { templateId?: string }) => {
    if (!templateId) {
      throw new Error('templateId is required to delete a template');
    }

    const { template, viewer } = await getTemplate(ctx, templateId);
    requireManageTemplates({ teamId: template.teamId, viewer });
    await ctx.db.transact(ctx.db.tx.templates[templateId].delete());

    return mcpFields.textResult(
      { deleted: true, templateId },
      `Deleted template: ${templateId}`
    );
  };

  registerMcpTool(
    server,
    'templates',
    {
      description:
        'List, create, copy, update, and delete reusable record templates.',
      inputSchema: {
        action: templateActionsSchema,
        limit: z.number().int().min(1).max(100).optional(),
        logId: z.string().min(1).optional(),
        query: z.string().trim().min(1).optional(),
        tagIds: z.array(z.string().min(1)).max(50).optional(),
        templateId: z.string().min(1).optional(),
        text: z.string().max(10240).optional(),
      },
      outputSchema: mcpSchemas.templatesOutputSchema,
    },
    async ({ action, limit, logId, query, tagIds, templateId, text }) => {
      switch (action) {
        case 'list': {
          return listTemplates({ limit, logId, query });
        }

        case 'get': {
          return getTemplateDetail({ templateId });
        }

        case 'save': {
          return saveTemplate({ logId, tagIds, templateId, text });
        }

        case 'delete': {
          return deleteTemplate({ templateId });
        }
      }
    }
  );
};
