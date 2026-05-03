import type { Tag } from '@/features/tags/types/tag';
import * as React from 'react';

import {
  createTagSearchIndex,
  findExactTagId,
  searchTagsWithIndex,
} from '@/features/tags/lib/search-tags';

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
  tags: { data: Tag[] };
}) => {
  React.useEffect(() => {
    if (!pendingCreatedTag) return;
    if (!tags.data.some((tag) => tag.id === pendingCreatedTag.id)) return;
    if (!selectedIds.has(pendingCreatedTag.id)) return;
    setPendingCreatedTag(null);
  }, [pendingCreatedTag, selectedIds, setPendingCreatedTag, tags.data]);

  const tagsWithPending = React.useMemo(() => {
    if (!pendingCreatedTag) return tags.data;

    if (tags.data.some((tag) => tag.id === pendingCreatedTag.id)) {
      return tags.data;
    }

    return [pendingCreatedTag, ...tags.data];
  }, [pendingCreatedTag, tags.data]);

  const tagSearchIndex = React.useMemo(
    () => createTagSearchIndex(tagsWithPending),
    [tagsWithPending]
  );

  const visibleTags = React.useMemo(
    () =>
      searchTagsWithIndex({
        index: tagSearchIndex,
        query,
        tags: tagsWithPending,
      }),
    [query, tagSearchIndex, tagsWithPending]
  );

  const queryExistingTagId = React.useMemo(
    () => findExactTagId(tagsWithPending, query),
    [query, tagsWithPending]
  );

  const optimisticSelectedIds = React.useMemo(() => {
    const ids = new Set(selectedIds);
    if (pendingCreatedTag) ids.add(pendingCreatedTag.id);
    return ids;
  }, [pendingCreatedTag, selectedIds]);

  return { optimisticSelectedIds, queryExistingTagId, visibleTags };
};
