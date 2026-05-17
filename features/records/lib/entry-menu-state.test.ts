import { resolveEntryMenuState } from '@/features/records/lib/entry-menu-state';
import type { EntryMenuState } from '@/features/records/types/entry-menu';
import { describe, expect, test } from 'bun:test';

const state = (overrides: Partial<EntryMenuState> = {}): EntryMenuState => ({
  canDelete: true,
  canDuplicate: true,
  canEdit: true,
  canPin: false,
  canShare: true,
  canTag: false,
  copyTargetLogs: [],
  hasActionsAboveDelete: true,
  hasMenu: true,
  isDeleteDisabled: false,
  isDuplicateDisabled: false,
  isEditDisabled: false,
  isPinDisabled: false,
  isTagDisabled: false,
  ...overrides,
});

describe('resolveEntryMenuState', () => {
  test('hides unavailable local actions', () => {
    expect(
      resolveEntryMenuState({
        canManageLocalPendingEntry: true,
        isLocalPending: true,
        isPublishingLocalSubmission: false,
        rawState: state(),
      })
    ).toMatchObject({
      canDelete: true,
      canDuplicate: false,
      canEdit: true,
      canShare: false,
      canTag: false,
      isDeleteDisabled: false,
      isDuplicateDisabled: true,
      isTagDisabled: true,
    });
  });

  test('keeps local tags when allowed', () => {
    expect(
      resolveEntryMenuState({
        canManageLocalPendingEntry: true,
        isLocalPending: true,
        isPublishingLocalSubmission: false,
        rawState: state({ canTag: true }),
      }).canTag
    ).toBe(true);
  });

  test('hides unmanageable local delete', () => {
    expect(
      resolveEntryMenuState({
        canManageLocalPendingEntry: false,
        isLocalPending: true,
        isPublishingLocalSubmission: false,
        rawState: state(),
      }).canDelete
    ).toBe(false);
  });

  test('locks publishing edits', () => {
    expect(
      resolveEntryMenuState({
        canManageLocalPendingEntry: true,
        isLocalPending: true,
        isPublishingLocalSubmission: true,
        rawState: state({ canPin: true, canTag: true }),
      })
    ).toMatchObject({
      isEditDisabled: true,
      isPinDisabled: true,
      isTagDisabled: true,
    });
  });
});
