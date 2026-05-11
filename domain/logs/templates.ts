import { recordTagFields, recordTagLogsQuery } from '@/domain/tags/query';

export const logTemplateFields = [
  'id' as const,
  'order' as const,
  'teamId' as const,
  'text' as const,
];

export const templateLogQuery = {
  $: { fields: ['id' as const, 'name' as const, 'teamId' as const] },
};

export const templateTagQuery = {
  $: { fields: recordTagFields },
  logs: recordTagLogsQuery,
};

export const templateTagsQuery = {
  $: { fields: recordTagFields, where: { type: 'record' as const } },
  logs: recordTagLogsQuery,
};

export const templateQuery = { log: templateLogQuery, tags: templateTagsQuery };

type OrderedTemplate = { order?: number | null };
type TemplateSearchItem = { tags?: { name: string }[]; text?: string | null };

export const getNextTemplateOrder = (templates: OrderedTemplate[]) =>
  templates.reduce((max, template) => Math.max(max, template.order ?? -1), -1) +
  1;

export const uniqueTemplateTagIds = (tagIds?: readonly string[]) => [
  ...new Set(tagIds ?? []),
];

export const getTemplateTagChanges = ({
  currentTagIds,
  nextTagIds,
}: {
  currentTagIds?: readonly string[];
  nextTagIds?: readonly string[];
}) => {
  const currentTagIdSet = new Set(currentTagIds ?? []);
  const nextUniqueTagIds = uniqueTemplateTagIds(nextTagIds);
  const nextTagIdSet = new Set(nextUniqueTagIds);

  return {
    linkTagIds: nextUniqueTagIds.filter((tagId) => !currentTagIdSet.has(tagId)),
    nextTagIds: nextUniqueTagIds,
    unlinkTagIds: [...currentTagIdSet].filter(
      (tagId) => !nextTagIdSet.has(tagId)
    ),
  };
};

export const filterTemplatesByQuery = <T extends TemplateSearchItem>(
  templates: T[],
  query?: string
) => {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return templates;

  return templates.filter(
    (template) =>
      (template.text ?? '').toLowerCase().includes(normalizedQuery) ||
      template.tags?.some((tag) =>
        tag.name.toLowerCase().includes(normalizedQuery)
      )
  );
};
