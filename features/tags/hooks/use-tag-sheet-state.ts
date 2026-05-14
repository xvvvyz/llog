import * as tagSearch from '@/domain/tags/search-tags';
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
  tags: { data: Tag[] };
}) => {
  React.useEffect(() => {
    if (!pendingCreatedTag) return;
    if (!tags.data.some((tag) => tag.id === pendingCreatedTag.id)) return;
    setPendingCreatedTag(null);
  }, [pendingCreatedTag, setPendingCreatedTag, tags.data]);

  const tagsWithPending = React.useMemo(() => {
    if (!pendingCreatedTag) return tags.data;

    if (tags.data.some((tag) => tag.id === pendingCreatedTag.id)) {
      return tags.data;
    }

    return [pendingCreatedTag, ...tags.data];
  }, [pendingCreatedTag, tags.data]);

  const tagSearchIndex = React.useMemo(
    () => tagSearch.createTagSearchIndex(tagsWithPending),
    [tagsWithPending]
  );

  const visibleTags = React.useMemo(
    () =>
      tagSearch.searchTagsWithIndex({
        index: tagSearchIndex,
        query,
        tags: tagsWithPending,
      }),
    [query, tagSearchIndex, tagsWithPending]
  );

  const queryExistingTagId = React.useMemo(
    () => tagSearch.findExactTagId(tagsWithPending, query),
    [query, tagsWithPending]
  );

  return {
    optimisticSelectedIds: selectedIds,
    queryExistingTagId,
    visibleTags,
  };
};
