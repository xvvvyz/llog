import { normalizeSearchText } from '@/lib/search';

export type CopyRecordTag = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  logs?: { id?: string | null }[];
};

export type CopyTargetTag = { id?: string | null; name?: string | null };

export const resolveCopyDraftTagIdsForTargetLog = ({
  sourceTags,
  targetLogId,
  targetTags,
}: {
  sourceTags?: CopyRecordTag[];
  targetLogId: string;
  targetTags?: CopyTargetTag[];
}) => {
  const sourceRecordTags = (sourceTags ?? []).filter(
    (tag) => tag.type === 'record' && !!tag.id
  );

  const directTagIds = sourceRecordTags
    .filter((tag) => tag.logs?.some((log) => log.id === targetLogId))
    .map((tag) => tag.id as string);

  const sourceTagNames = [
    ...new Set(
      sourceRecordTags
        .map((tag) => (tag.name ? normalizeSearchText(tag.name) : ''))
        .filter(Boolean)
    ),
  ];

  if (!sourceTagNames.length) return directTagIds;
  const targetTagIdByName = new Map<string, string>();

  for (const tag of targetTags ?? []) {
    if (!tag.id || !tag.name) continue;
    targetTagIdByName.set(normalizeSearchText(tag.name), tag.id);
  }

  return [
    ...new Set([
      ...directTagIds,
      ...sourceTagNames.flatMap((name) => {
        const tagId = targetTagIdByName.get(name);
        return tagId ? [tagId] : [];
      }),
    ]),
  ];
};
