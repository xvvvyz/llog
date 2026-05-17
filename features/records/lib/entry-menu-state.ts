import type { EntryMenuState } from '@/features/records/types/entry-menu';

export const resolveEntryMenuState = ({
  canManageLocalPendingEntry,
  isLocalPending,
  isPublishingLocalSubmission,
  rawState,
}: {
  canManageLocalPendingEntry: boolean;
  isLocalPending: boolean;
  isPublishingLocalSubmission: boolean;
  rawState: EntryMenuState;
}): EntryMenuState => {
  const canDelete = canManageLocalPendingEntry
    ? true
    : isLocalPending
      ? false
      : rawState.canDelete;

  const canDuplicate = isLocalPending ? false : rawState.canDuplicate;
  const canEdit = isLocalPending ? true : rawState.canEdit;
  const canPin = rawState.canPin;
  const canShare = isLocalPending ? false : rawState.canShare;
  const canTag = rawState.canTag;
  const hasActionsAboveDelete = canEdit || canTag || canPin || canShare;

  const hasMenu =
    canDelete || canDuplicate || canEdit || canPin || canShare || canTag;

  const isEditDisabled =
    isPublishingLocalSubmission || (!isLocalPending && rawState.isEditDisabled);

  return {
    ...rawState,
    canDelete,
    canDuplicate,
    canEdit,
    canPin,
    canShare,
    canTag,
    hasActionsAboveDelete,
    hasMenu,
    isDeleteDisabled: canDelete
      ? !canManageLocalPendingEntry && rawState.isDeleteDisabled
      : true,
    isDuplicateDisabled: canDuplicate ? rawState.isDuplicateDisabled : true,
    isEditDisabled: canEdit ? isEditDisabled : true,
    isPinDisabled: canPin
      ? isPublishingLocalSubmission || rawState.isPinDisabled
      : true,
    isTagDisabled: canTag
      ? isPublishingLocalSubmission || rawState.isTagDisabled
      : true,
  };
};
