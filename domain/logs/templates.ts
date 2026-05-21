import { recordTagFields, recordTagLogsQuery } from '@/domain/tags/query';
import type { Tag } from '@/instant.entities';
import { normalizeSearchText } from '@/lib/search';

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
  $: { fields: recordTagFields, order: { order: 'asc' as const } },
  logs: recordTagLogsQuery,
};

export const templateTagsQuery = {
  $: {
    fields: recordTagFields,
    order: { order: 'asc' as const },
    where: { type: 'record' as const },
  },
  logs: recordTagLogsQuery,
};

export const templateQuery = { log: templateLogQuery, tags: templateTagsQuery };

type OrderedTemplate = { order?: number | null };
type TemplateSearchItem = { tags?: { name: string }[]; text?: string | null };
type CopyTemplateSourceTag = Partial<Pick<Tag, 'color' | 'id' | 'name'>>;
type CopyTemplateTargetTag = Partial<Pick<Tag, 'id' | 'name'>>;

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

export const resolveCopyTemplateTagsForTargetLog = ({
  createMissingTags = false,
  sourceTags,
  targetTags,
}: {
  createMissingTags?: boolean;
  sourceTags?: CopyTemplateSourceTag[];
  targetTags?: CopyTemplateTargetTag[];
}) => {
  const targetTagIdByName = new Map<string, string>();

  for (const tag of targetTags ?? []) {
    if (!tag.id || !tag.name) continue;
    targetTagIdByName.set(normalizeSearchText(tag.name), tag.id);
  }

  const linkedTagIds: string[] = [];
  const missingTags: { color: number; name: string }[] = [];
  const seenSourceNames = new Set<string>();

  for (const tag of sourceTags ?? []) {
    if (!tag.name) continue;
    const name = tag.name.trim();
    if (!name) continue;
    const normalizedName = normalizeSearchText(name);
    if (!normalizedName || seenSourceNames.has(normalizedName)) continue;
    seenSourceNames.add(normalizedName);
    const targetTagId = targetTagIdByName.get(normalizedName);

    if (targetTagId) {
      linkedTagIds.push(targetTagId);
      continue;
    }

    if (!createMissingTags) continue;
    missingTags.push({ color: tag.color ?? 11, name });
  }

  return { linkedTagIds, missingTags };
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
