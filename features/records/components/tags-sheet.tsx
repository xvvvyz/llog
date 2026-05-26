import { useProfile } from '@/features/account/queries/use-profile';
import { useLog } from '@/features/logs/queries/use-log';
import * as localEntry from '@/features/offline/local-entry';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedTags from '@/features/offline/queued-tags';
import * as recordTags from '@/features/records/mutations/record-tags';
import * as recordStatus from '@/domain/records/status';
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
  const outbox = useOutbox();
  const visibleTagsRef = React.useRef<Tag[]>([]);

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
  const canMutateDefinitions = canManageDefinitions;
  const canEditRecordTags = true;

  const canManageRecordTags =
    canEditRecordTags &&
    !!record?.id &&
    (canManageDefinitions ||
      (!!profile.id && profile.id === record.author?.id));

  const isRecordStatusDraft =
    recordStatus.getOptionalRecordStatus(record) === 'draft';

  const isScheduledRecord = recordStatus.recordIsScheduled(record ?? {});

  const pendingRecord = React.useMemo(
    () =>
      record?.id
        ? outbox.submissions.find(
            (submission) =>
              submission.type === 'record' &&
              submission.contentId === record.id &&
              pendingEntries.isActiveQueuedSubmission(submission)
          )
        : undefined,
    [outbox.submissions, record?.id]
  );

  const queuedRecordDraft = React.useMemo(
    () =>
      record?.id
        ? outbox.drafts.find(
            (draft) => draft.type === 'record' && draft.contentId === record.id
          )
        : undefined,
    [outbox.drafts, record?.id]
  );

  const currentRecordTags = React.useMemo(
    () =>
      isRecordStatusDraft &&
      !isScheduledRecord &&
      queuedRecordDraft?.type === 'record' &&
      queuedRecordDraft.tagsUpdated
        ? queuedRecordDraft.tags
        : pendingRecord?.type === 'record'
          ? pendingRecord.tags
          : (record?.tags ?? []),
    [
      isRecordStatusDraft,
      isScheduledRecord,
      pendingRecord,
      queuedRecordDraft,
      record?.tags,
    ]
  );

  const currentQueuedRecordTags = React.useMemo(
    () =>
      currentRecordTags.every(queuedTags.isQueuedTagSnapshot)
        ? currentRecordTags
        : undefined,
    [currentRecordTags]
  );

  const shouldMirrorQueuedDraftTags =
    isRecordStatusDraft && !isScheduledRecord && !pendingRecord;

  const selectedTagIds = React.useMemo(
    () => new Set(currentRecordTags.map((tag) => tag.id)),
    [currentRecordTags]
  );

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
    canCreateDefinitions: canMutateDefinitions,
    canCreateNewTag: canEditRecordTags && !!logId && !!record?.id && !!teamId,
    canToggleTags: canManageRecordTags,
    logId,
    onCreateTag: React.useCallback(
      ({ id, name }) => {
        if (!logId || !record?.id || !teamId) return;

        void recordTags.createRecordTag({
          color: logColorIndex,
          id,
          logId,
          name,
          recordId: record.id,
          teamId,
        });

        const tag = {
          color: logColorIndex,
          id,
          name,
          order: 0,
          teamId,
          type: 'record' as const,
        };

        if (pendingRecord) {
          outboxStore.updateQueuedRecordTagSelection({
            recordId: record.id,
            selected: true,
            tag,
            tagId: id,
          });
        }

        if (shouldMirrorQueuedDraftTags) {
          outboxStore.updateQueuedDraftRecordTagSelection({
            baseTags: currentQueuedRecordTags,
            recordId: record.id,
            selected: true,
            tag,
            tagId: id,
          });
        }
      },
      [
        currentQueuedRecordTags,
        logColorIndex,
        logId,
        pendingRecord,
        record?.id,
        shouldMirrorQueuedDraftTags,
        teamId,
      ]
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
        const tag = visibleTagsRef.current.find((tag) => tag.id === tagId);

        if (pendingRecord) {
          outboxStore.updateQueuedRecordTagSelection({
            recordId: record?.id ?? '',
            selected,
            tag,
            tagId,
          });
        }

        if (shouldMirrorQueuedDraftTags) {
          outboxStore.updateQueuedDraftRecordTagSelection({
            baseTags: currentQueuedRecordTags,
            recordId: record?.id ?? '',
            selected,
            tag,
            tagId,
          });
        }

        if (localEntry.hasLocalStatus(record)) return;

        await recordTags.toggleRecordTag({
          tagId,
          selected,
          recordId: record?.id,
        });
      },
      [
        currentQueuedRecordTags,
        pendingRecord,
        record,
        shouldMirrorQueuedDraftTags,
      ]
    ),
    scopeKey: record?.id,
    selectedIds: selectedTagIds,
    teamIds: tagTeamIds,
    type: 'record',
  });

  React.useEffect(() => {
    visibleTagsRef.current = tagSheet.visibleTags;
  }, [tagSheet.visibleTags]);

  const sheetIsLoading = isLoading;

  return (
    <Sheet
      onDismiss={() => sheetManager.close('record-tags')}
      open={sheetManager.isOpen('record-tags')}
      portalName="record-tags"
      variant="list"
    >
      <TagSheetContent
        canManageColor={canMutateDefinitions}
        canManageDefinitions={canMutateDefinitions}
        canToggleTags={canManageRecordTags}
        defaultTagColor={logColorIndex}
        emptyStateText="Create reusable tags for records in this log."
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
        sortEnabled={!tagSheet.rawQuery && canMutateDefinitions}
        tagInputAction={tagSheet.tagInputAction}
        visibleTags={tagSheet.visibleTags}
      />
    </Sheet>
  );
};
