import type { Tag } from '@/features/tags/types/tag';
import * as React from 'react';

export const useTagSheetState = ({
  pendingCreatedTag,
  query,
  selectedIds,
  setPendingCreatedTag,
  tags,
}: {
  pendingCreatedTag: Tag | null;
  query: string;
  selectedIds: ReadonlySet<string>;
  setPendingCreatedTag: (tag: Tag | null) => void;
  tags: { data: Tag[]; isLoading: boolean; queryExistingTagId?: string };
}) => {
  const previousVisibleTagsRef = React.useRef<Tag[]>([]);
  const allTagsRef = React.useRef<Tag[]>([]);

  React.useEffect(() => {
    if (tags.isLoading) return;
    previousVisibleTagsRef.current = tags.data;
    if (!query) allTagsRef.current = tags.data;
  }, [query, tags.data, tags.isLoading]);

  React.useEffect(() => {
    if (!pendingCreatedTag) return;
    if (!tags.data.some((tag) => tag.id === pendingCreatedTag.id)) return;
    if (!selectedIds.has(pendingCreatedTag.id)) return;
    setPendingCreatedTag(null);
  }, [pendingCreatedTag, selectedIds, setPendingCreatedTag, tags.data]);

  const visibleTags = React.useMemo(() => {
    const sourceTags =
      tags.isLoading && query
        ? (allTagsRef.current.length
            ? allTagsRef.current
            : previousVisibleTagsRef.current
          ).filter((tag) =>
            tag.name.toLowerCase().includes(query.toLowerCase())
          )
        : tags.data;

    if (
      !pendingCreatedTag ||
      (query &&
        !pendingCreatedTag.name.toLowerCase().includes(query.toLowerCase())) ||
      sourceTags.some((tag) => tag.id === pendingCreatedTag.id)
    ) {
      return sourceTags;
    }

    return [pendingCreatedTag, ...sourceTags];
  }, [pendingCreatedTag, query, tags.data, tags.isLoading]);

  const queryExistingTagId = React.useMemo(
    () =>
      query
        ? (tags.queryExistingTagId ??
          visibleTags.find(
            (tag) => tag.name.toLowerCase() === query.toLowerCase()
          )?.id)
        : undefined,
    [query, tags.queryExistingTagId, visibleTags]
  );

  const optimisticSelectedIds = React.useMemo(() => {
    const ids = new Set(selectedIds);
    if (pendingCreatedTag) ids.add(pendingCreatedTag.id);
    return ids;
  }, [pendingCreatedTag, selectedIds]);

  return { optimisticSelectedIds, queryExistingTagId, visibleTags };
};
