import { useTagSheetState } from '@/features/tags/hooks/use-tag-sheet-state';
import { useTags } from '@/features/tags/queries/use-tags';
import type { Tag, TagType } from '@/features/tags/types/tag';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { id as generateId } from '@instantdb/react-native';
import * as React from 'react';

type NewTagInput = { id: string; name: string; order: number };

export const useTagSheetController = ({
  buildPendingTag,
  canCreateDefinitions = true,
  canCreateNewTag = true,
  canToggleTags = true,
  logId,
  onCreateTag,
  onReorder,
  onToggleTag,
  scopeKey,
  selectedIds,
  teamIds,
  type = 'log',
}: {
  buildPendingTag: (tag: NewTagInput) => Tag | null | undefined;
  canCreateDefinitions?: boolean;
  canCreateNewTag?: boolean;
  canToggleTags?: boolean;
  logId?: string;
  onCreateTag: (tag: NewTagInput) => void | Promise<void>;
  onReorder: (tags: Tag[]) => void | Promise<void>;
  onToggleTag: (tagId: string, selected: boolean) => Promise<void>;
  scopeKey?: string | null;
  selectedIds: ReadonlySet<string>;
  teamIds?: string[];
  type?: TagType;
}) => {
  const [rawQuery, setRawQuery] = React.useState('');

  const [pendingCreatedTag, setPendingCreatedTag] = React.useState<Tag | null>(
    null
  );

  const query = React.useMemo(() => rawQuery.trim(), [rawQuery]);
  const tags = useTags({ logId, teamIds, type });

  const { optimisticSelectedIds, queryExistingTagId, visibleTags } =
    useTagSheetState({
      pendingCreatedTag,
      query,
      selectedIds,
      setPendingCreatedTag,
      tags,
    });

  const { getSelected, setSelected } = useOptimisticSelection({
    onChange: React.useCallback(
      async (tagId: string, selected: boolean) => {
        if (!canToggleTags) return;
        await onToggleTag(tagId, selected);
      },
      [canToggleTags, onToggleTag]
    ),
    scopeKey,
    selectedIds: optimisticSelectedIds,
  });

  const handleSubmitTag = React.useCallback(() => {
    if (!query || !canToggleTags || tags.isLoading) return;

    if (queryExistingTagId) {
      void setSelected(queryExistingTagId, true);
      setRawQuery('');
      return;
    }

    if (!canCreateDefinitions || !canCreateNewTag) return;
    const tagId = generateId();
    const order = -Date.now();
    const pendingTag = buildPendingTag({ id: tagId, name: query, order });
    if (!pendingTag) return;
    setPendingCreatedTag(pendingTag);
    void onCreateTag({ id: tagId, name: query, order });
    setRawQuery('');
  }, [
    buildPendingTag,
    canCreateDefinitions,
    canCreateNewTag,
    canToggleTags,
    onCreateTag,
    query,
    queryExistingTagId,
    setSelected,
    tags.isLoading,
  ]);

  const handleReorder = React.useCallback(
    (orderedTags: Tag[]) => {
      void onReorder(orderedTags);
    },
    [onReorder]
  );

  const handleSelectTag = React.useCallback(
    (tagId: string, selected: boolean) => {
      if (!canToggleTags) return;
      void setSelected(tagId, selected);
    },
    [canToggleTags, setSelected]
  );

  const canCreateTag =
    canToggleTags &&
    canCreateDefinitions &&
    canCreateNewTag &&
    !tags.isLoading &&
    !!query &&
    !queryExistingTagId;

  return {
    canCreateTag,
    getSelected,
    handleReorder,
    handleSelectTag,
    handleSubmitTag,
    hasPendingCreatedTag: !!pendingCreatedTag,
    query,
    rawQuery,
    setRawQuery,
    tagsIsLoading: tags.isLoading,
    visibleTags,
  };
};
