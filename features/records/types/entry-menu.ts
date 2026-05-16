import type { CopyTargetLog } from '@/features/records/queries/use-copy-targets';

export type EntryMenuState = {
  canDelete: boolean;
  canDuplicate: boolean;
  canEdit: boolean;
  canPin: boolean;
  canShare: boolean;
  canTag: boolean;
  copyTargetLogs: CopyTargetLog[];
  hasActionsAboveDelete: boolean;
  hasMenu: boolean;
  isDeleteDisabled: boolean;
  isDuplicateDisabled: boolean;
  isEditDisabled: boolean;
  isPinDisabled: boolean;
  isTagDisabled: boolean;
};
