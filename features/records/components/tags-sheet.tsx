import { useProfile } from '@/features/account/queries/use-profile';
import { useLog } from '@/features/logs/queries/use-log';
import * as recordTags from '@/features/records/mutations/record-tags';
import { useRecordTagsTarget } from '@/features/records/queries/use-record-tags-target';
import { TagSheetContent } from '@/features/tags/components/tag-sheet-content';
import { useTagSheetController } from '@/features/tags/hooks/use-tag-sheet-controller';
import { reorderTags } from '@/features/tags/mutations/reorder-tags';
import { updateTag } from '@/features/tags/mutations/update-tag';
import type { Tag } from '@/features/tags/types/tag';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { resolveSpectrumColor, type Color } from '@/theme/spectrum';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';

export const RecordTagsSheet = () => {
  const sheetManager = useSheetManager();
  const recordId = sheetManager.getId('record-tags');
  const profile = useProfile();

  const target = useRecordTagsTarget({
    payload: sheetManager.getPayload('record-tags'),
    recordId,
  });

  const record = target.record;
  const teamId = target.teamId;
  const logId = target.logId;
  const needsLogColor = !!logId && target.logColor == null;
  const log = useLog({ id: needsLogColor ? logId : undefined });
  const logColorIndex = resolveSpectrumColor(target.logColor ?? log.color);
  const myRole = useMyRole({ teamId });
  const canManageDefinitions = !!myRole.canManage;

  const canManageRecordTags =
    !!record?.id &&
    (canManageDefinitions ||
      (!!profile.id && profile.id === record.author?.id));

  const isLoading =
    target.isLoading ||
    (needsLogColor && log.isLoading) ||
    (!!teamId && myRole.isLoading);

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
    canCreateDefinitions: canManageDefinitions,
    canCreateNewTag: !!logId && !!record?.id && !!teamId,
    canToggleTags: canManageRecordTags,
    logId,
    onCreateTag: React.useCallback(
      ({ id, name, order }) => {
        if (!logId || !record?.id || !teamId) return;

        void recordTags.createRecordTag({
          color: logColorIndex,
          id,
          logId,
          name,
          order,
          recordId: record.id,
          teamId,
        });
      },
      [logColorIndex, logId, record?.id, teamId]
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
        await recordTags.toggleRecordTag({
          tagId,
          selected,
          recordId: record?.id,
        });
      },
      [record?.id]
    ),
    scopeKey: record?.id,
    selectedIds: target.selectedTagIds,
    teamIds: tagTeamIds,
    type: 'record',
  });

  const sheetIsLoading =
    isLoading || (tagSheet.tagsIsLoading && !tagSheet.hasPendingCreatedTag);

  return (
    <Sheet
      loading={sheetIsLoading}
      onDismiss={() => sheetManager.close('record-tags')}
      open={sheetManager.isOpen('record-tags')}
      portalName="record-tags"
      variant="list"
    >
      <TagSheetContent
        canCreateTag={tagSheet.canCreateTag}
        canManageColor={canManageDefinitions}
        canManageDefinitions={canManageDefinitions}
        canToggleTags={canManageRecordTags}
        colorFallback={logColorIndex}
        getSelected={tagSheet.getSelected}
        isLoading={sheetIsLoading}
        onClose={() => sheetManager.close('record-tags')}
        onColorChange={handleColorChange}
        onReorder={tagSheet.handleReorder}
        onSelectTag={tagSheet.handleSelectTag}
        onSubmitTag={tagSheet.handleSubmitTag}
        query={tagSheet.query}
        rawQuery={tagSheet.rawQuery}
        setRawQuery={tagSheet.setRawQuery}
        sortEnabled={!tagSheet.rawQuery && canManageDefinitions}
        visibleTags={tagSheet.visibleTags}
      />
    </Sheet>
  );
};
