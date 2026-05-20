import * as recordTags from '@/features/records/mutations/record-tags';
import { TagSheetContent } from '@/features/tags/components/tag-sheet-content';
import { useTagSheetController } from '@/features/tags/hooks/use-tag-sheet-controller';
import { reorderTags } from '@/features/tags/mutations/reorder-tags';
import { updateTag } from '@/features/tags/mutations/update-tag';
import type { Tag } from '@/features/tags/types/tag';
import { type Color } from '@/theme/spectrum';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const CardTagsPickerSheet = ({
  logColorIndex,
  logId,
  onClose,
  onSelectedTagIdsChange,
  open,
  selectedTagIds,
  teamId,
}: {
  logColorIndex: Color;
  logId?: string;
  onClose: () => void;
  onSelectedTagIdsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  open: boolean;
  selectedTagIds: ReadonlySet<string>;
  teamId?: string;
}) => {
  const tagTeamIds = React.useMemo(
    () => (teamId && logId ? [teamId] : []),
    [logId, teamId]
  );

  const handleColorChange = React.useCallback((tagId: string, color: Color) => {
    void updateTag({ id: tagId, color });
  }, []);

  const tagSheet = useTagSheetController({
    buildPendingTag: React.useCallback(
      ({ id, name, order }) =>
        teamId
          ? ({
              color: logColorIndex,
              id,
              name,
              order,
              teamId,
              type: 'record',
            } as Tag)
          : null,
      [logColorIndex, teamId]
    ),
    canCreateNewTag: !!logId && !!teamId,
    logId,
    onCreateTag: React.useCallback(
      ({ id, name }) => {
        if (!logId || !teamId) return;
        onSelectedTagIdsChange((ids) => new Set(ids).add(id));

        void recordTags.createRecordTagDefinition({
          color: logColorIndex,
          id,
          logId,
          name,
          teamId,
        });
      },
      [logColorIndex, logId, onSelectedTagIdsChange, teamId]
    ),
    onReorder: React.useCallback(
      (orderedTags: Tag[]) => {
        if (!logId || !teamId) return;

        void reorderTags({
          logId,
          orderedIds: orderedTags.map((tag) => tag.id),
          teamId,
          type: 'record',
        });
      },
      [logId, teamId]
    ),
    onToggleTag: React.useCallback(
      async (tagId: string, selected: boolean) => {
        onSelectedTagIdsChange((ids) => {
          const nextIds = new Set(ids);

          if (selected) nextIds.add(tagId);
          else nextIds.delete(tagId);

          return nextIds;
        });
      },
      [onSelectedTagIdsChange]
    ),
    scopeKey: `card:${logId ?? ''}`,
    selectedIds: selectedTagIds,
    teamIds: tagTeamIds,
    type: 'record',
  });

  const sheetIsLoading =
    tagSheet.tagsIsLoading && !tagSheet.hasPendingCreatedTag;

  return (
    <Sheet
      onDismiss={onClose}
      open={open}
      portalName="log-card-tags"
      variant="list"
    >
      <TagSheetContent
        canCreateTag={tagSheet.canCreateTag}
        canManageColor
        defaultTagColor={logColorIndex}
        emptyStateText="Create reusable tags for records in this log."
        getSelected={tagSheet.getSelected}
        isLoading={sheetIsLoading}
        onClose={onClose}
        onColorChange={handleColorChange}
        onReorder={tagSheet.handleReorder}
        onSelectTag={tagSheet.handleSelectTag}
        onSubmitTag={tagSheet.handleSubmitTag}
        query={tagSheet.query}
        rawQuery={tagSheet.rawQuery}
        setRawQuery={tagSheet.setRawQuery}
        sortEnabled={!tagSheet.rawQuery}
        visibleTags={tagSheet.visibleTags}
      />
    </Sheet>
  );
};
