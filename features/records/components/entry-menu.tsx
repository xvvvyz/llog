import * as recordPermissions from '@/domain/records/permissions';
import { canDeleteOwnOrManagedResource } from '@/domain/teams/permissions';
import { useProfile } from '@/features/account/queries/use-profile';
import * as outboxStore from '@/features/offline/outbox-store';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import * as route from '@/features/records/lib/route';
import { createRecordCopyDraft } from '@/features/records/mutations/create-record-copy-draft';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import * as copyTargetQueries from '@/features/records/queries/use-copy-targets';
import type { EntryMenuState } from '@/features/records/types/entry-menu';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import type { Tag as RecordTag } from '@/features/tags/types/tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { shareUrl } from '@/lib/share';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

import {
  DotsThreeVertical,
  NotePencil,
  PushPin,
  ShareNetwork,
  StackSimple,
  Tag,
  Trash,
} from 'phosphor-react-native';

type EntryMenuProps = {
  accentColor?: string;
  authorId?: string;
  className?: string;
  replyId?: string;
  isDetail?: boolean;
  isLocalPending?: boolean;
  isPinned?: boolean;
  logId?: string;
  recordId: string;
  tags?: RecordTag[];
  teamId?: string;
};

export const useEntryMenuState = ({
  authorId,
  authorRole,
  hasSelectedRecordTags,
  logId,
  replyId,
  teamId,
}: Pick<EntryMenuProps, 'authorId' | 'logId' | 'replyId' | 'teamId'> & {
  authorRole?: string | null;
  hasSelectedRecordTags?: boolean;
}): EntryMenuState => {
  const myRole = useMyRole({ teamId });
  const profile = useProfile();
  const isAuthor = !!profile.id && profile.id === authorId;

  const canDelete = canDeleteOwnOrManagedResource({
    actorRole: myRole.role,
    isAuthor,
  });

  const canEdit = recordPermissions.canEditEntry({
    actorRole: myRole.role,
    isAuthor,
    targetRole: authorRole,
  });

  const recordTags = useHasRecordTagsForLog({
    enabled: !replyId && isAuthor && !myRole.isLoading && !myRole.canManage,
    logId,
    teamId,
  });

  const canTag =
    !replyId &&
    (myRole.canManage ||
      (isAuthor && (hasSelectedRecordTags || recordTags.hasRecordTags)));

  const canDuplicateRecord = !replyId && isAuthor;

  const copyTargets = copyTargetQueries.useCopyTargets({
    enabled: canDuplicateRecord && !!logId,
  });

  const canDuplicate =
    canDuplicateRecord &&
    !!logId &&
    (copyTargets.logs.length > 0 || copyTargets.isLoading);

  const canPin = !replyId && myRole.canPinRecords;
  const canShare = true;
  const hasActionsAboveDelete = canEdit || canTag || canPin || canShare;

  const hasMenu =
    canDelete || canDuplicate || canEdit || canPin || canShare || canTag;

  return {
    canDelete,
    canDuplicate,
    canEdit,
    canPin,
    canShare,
    canTag,
    copyTargetLogs: copyTargets.logs,
    hasActionsAboveDelete,
    hasMenu,
    isDeleteDisabled: false,
    isDuplicateDisabled: copyTargets.isLoading,
    isEditDisabled: false,
    isPinDisabled: false,
    isTagDisabled: false,
  };
};

const EntryMenuDropdownContent = ({
  accentColor,
  authorId,
  logId,
  replyId,
  isDetail,
  isLocalPending,
  isPinned,
  recordId,
  state,
  tags,
  teamId,
}: Omit<EntryMenuProps, 'className'> & { state: EntryMenuState }) => {
  const sheetManager = useSheetManager();
  const menu = Menu.useContext();
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const {
    canDelete,
    canDuplicate,
    canEdit,
    canPin,
    canShare,
    canTag,
    copyTargetLogs,
    hasActionsAboveDelete,
    hasMenu,
    isDeleteDisabled,
    isDuplicateDisabled,
    isEditDisabled,
    isPinDisabled,
    isTagDisabled,
  } = state;

  if (!hasMenu) return null;

  const shareTargetUrl = isLocalPending
    ? undefined
    : replyId
      ? route.getRecordReplyDetailUrl(recordId, replyId)
      : route.getRecordDetailUrl(recordId);

  const duplicateRecord = async () => {
    const [targetLog] = copyTargetLogs;
    if (isDuplicating || isDuplicateDisabled) return;

    if (!targetLog || copyTargetLogs.length > 1) {
      sheetManager.open('record-copy-to', recordId);
      return;
    }

    setIsDuplicating(true);

    try {
      const draft = await createRecordCopyDraft({
        id: recordId,
        logIds: [targetLog.id],
      });

      if (!draft) {
        setIsDuplicating(false);
        return;
      }

      sheetManager.open('record-create', draft.draftRecordId, 'copy', {
        logIds: draft.targetLogIds,
      });

      setIsDuplicating(false);
      menu.onOpenChange(false);
    } catch {
      setIsDuplicating(false);
      // noop
    }
  };

  return (
    <React.Fragment>
      <Menu.Trigger asChild>
        <Button
          className={cn('size-8', isDetail ? 'rounded-full' : 'rounded-lg')}
          size="icon"
          variant="ghost"
          wrapperClassName={isDetail ? 'rounded-full' : 'rounded-lg'}
        >
          <Icon className="text-muted-foreground" icon={DotsThreeVertical} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align="end">
        {canEdit && (
          <Menu.Item
            disabled={isEditDisabled}
            onPress={() => {
              if (isEditDisabled) return;

              if (replyId) {
                sheetManager.open('reply-create', replyId, recordId);
              } else {
                sheetManager.open('record-create', recordId, 'edit');
              }
            }}
          >
            <Icon className="text-placeholder" icon={NotePencil} />
            <Text>Edit</Text>
          </Menu.Item>
        )}
        {canTag && (
          <Menu.Item
            disabled={isTagDisabled}
            onPress={() => {
              if (isTagDisabled) return;

              sheetManager.open('record-tags', recordId, undefined, {
                authorId,
                logId,
                tags: tags ?? [],
                teamId,
              });
            }}
          >
            <Icon className="text-placeholder" icon={Tag} />
            <Text>Tags</Text>
          </Menu.Item>
        )}
        {canPin && (
          <Menu.Item
            disabled={isPinDisabled}
            onPress={() => {
              if (isPinDisabled) return;
              const nextIsPinned = !isPinned;

              if (isLocalPending) {
                outboxStore.updateQueuedRecordPin({
                  isPinned: nextIsPinned,
                  recordId,
                });

                return;
              }

              void toggleRecordPin({ id: recordId, isPinned: nextIsPinned });

              if (nextIsPinned) {
                requestPostSubmitScroll({
                  id: logId,
                  scope: 'log',
                  target: 'top',
                });
              }
            }}
          >
            <Icon
              className={!isPinned ? 'text-placeholder' : undefined}
              color={isPinned ? accentColor : undefined}
              icon={PushPin}
              weight={isPinned ? 'fill' : 'regular'}
            />
            <Text>{isPinned ? 'Unpin' : 'Pin'}</Text>
          </Menu.Item>
        )}
        {(canDuplicate || canShare || canDelete) && (
          <React.Fragment>
            {canDuplicate && (
              <Menu.Item
                closeOnPress={copyTargetLogs.length !== 1}
                disabled={isDuplicating || isDuplicateDisabled}
                onPress={() => void duplicateRecord()}
              >
                {isDuplicating ? (
                  <Spinner className="text-placeholder" size="xs" />
                ) : (
                  <Icon className="text-placeholder" icon={StackSimple} />
                )}
                <Text>Duplicate</Text>
              </Menu.Item>
            )}
            {canShare && (
              <Menu.Item
                closeOnPress={false}
                disabled={!shareTargetUrl}
                onPress={async () => {
                  if (!shareTargetUrl) return;

                  try {
                    await shareUrl({ title: 'llog', url: shareTargetUrl });
                  } catch {
                    // noop
                  }
                }}
              >
                <Icon className="text-placeholder" icon={ShareNetwork} />
                <Text>Share</Text>
              </Menu.Item>
            )}
            {canDelete && (
              <React.Fragment>
                {(hasActionsAboveDelete || canDuplicate) && <Menu.Separator />}
                <Menu.Item
                  disabled={isDeleteDisabled}
                  onPress={() => {
                    if (isDeleteDisabled) return;

                    if (replyId) {
                      sheetManager.open(
                        'reply-delete',
                        replyId,
                        isLocalPending ? `local:${recordId}` : recordId
                      );
                    } else {
                      const detailContext = isDetail
                        ? `detail:${logId ?? ''}`
                        : undefined;

                      sheetManager.open(
                        'record-delete',
                        recordId,
                        isLocalPending
                          ? detailContext
                            ? `local:${detailContext}`
                            : 'local'
                          : detailContext
                      );
                    }
                  }}
                >
                  <Icon className="text-destructive" icon={Trash} />
                  <Text className="text-destructive">Delete</Text>
                </Menu.Item>
              </React.Fragment>
            )}
          </React.Fragment>
        )}
      </Menu.Content>
    </React.Fragment>
  );
};

export const EntryMenuContent = ({
  className,
  ...props
}: EntryMenuProps & { state: EntryMenuState }) => {
  if (!props.state.hasMenu) return null;

  return (
    <View className={className}>
      <Menu.Root>
        <EntryMenuDropdownContent {...props} />
      </Menu.Root>
    </View>
  );
};
