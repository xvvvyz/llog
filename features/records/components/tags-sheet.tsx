import { useProfile } from '@/features/account/queries/use-profile';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as recordTags from '@/features/records/mutations/record-tags';
import { useRecordTagsTarget } from '@/features/records/queries/use-record-tags-target';
import { TagSheetContent } from '@/features/tags/components/tag-sheet-content';
import { useTagSheetController } from '@/features/tags/hooks/use-tag-sheet-controller';
import { reorderTags } from '@/features/tags/mutations/reorder-tags';
import type { Tag } from '@/features/tags/types/tag';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
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
  const logColor = useLogColor({ id: logId });
  const myRole = useMyRole({ teamId });
  const canManageDefinitions = !!myRole.canManage;

  const canManageRecordTags =
    !!record?.id &&
    (canManageDefinitions ||
      (!!profile.id && profile.id === record.author?.id));

  const isLoading = target.isLoading || (!!teamId && myRole.isLoading);

  const tagTeamIds = React.useMemo(
    () => (teamId && logId ? [teamId] : []),
    [logId, teamId]
  );

  const tagSheet = useTagSheetController({
    buildPendingTag: React.useCallback(
      ({ id, name, order }) =>
        teamId ? ({ id, name, order, teamId, type: 'record' } as Tag) : null,
      [teamId]
    ),
    canCreateDefinitions: canManageDefinitions,
    canCreateNewTag: !!logId && !!record?.id && !!teamId,
    canToggleTags: canManageRecordTags,
    logId,
    onCreateTag: React.useCallback(
      ({ id, name, order }) => {
        if (!logId || !record?.id || !teamId) return;

        void recordTags.createRecordTag({
          id,
          logId,
          name,
          order,
          recordId: record.id,
          teamId,
        });
      },
      [logId, record?.id, teamId]
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

  return (
    <Sheet
      className="md:rounded-3xl"
      loading={isLoading}
      onDismiss={() => sheetManager.close('record-tags')}
      open={sheetManager.isOpen('record-tags')}
      portalName="record-tags"
    >
      <TagSheetContent
        canCreateTag={tagSheet.canCreateTag}
        canManageDefinitions={canManageDefinitions}
        canToggleTags={canManageRecordTags}
        checkedColor={logColor.default}
        getSelected={tagSheet.getSelected}
        isLoading={isLoading}
        onClose={() => sheetManager.close('record-tags')}
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
