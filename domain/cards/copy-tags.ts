import { normalizeSearchText } from '@/lib/search';

type CopyCardSourceTag = { color?: number | null; name?: string | null };
type CopyCardTargetTag = { id?: string | null; name?: string | null };

export const resolveCopyCardTagsForTargetLog = ({
  sourceTags,
  targetTags,
}: {
  sourceTags?: CopyCardSourceTag[];
  targetTags?: CopyCardTargetTag[];
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
    const name = tag.name?.trim();
    if (!name) continue;
    const normalizedName = normalizeSearchText(name);
    if (!normalizedName || seenSourceNames.has(normalizedName)) continue;
    seenSourceNames.add(normalizedName);
    const targetTagId = targetTagIdByName.get(normalizedName);

    if (targetTagId) {
      linkedTagIds.push(targetTagId);
      continue;
    }

    missingTags.push({ color: tag.color ?? 11, name });
  }

  return { linkedTagIds, missingTags };
};
