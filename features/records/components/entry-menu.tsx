import { canDeleteOwnOrManagedResource } from '@/domain/teams/permissions';
import { useProfile } from '@/features/account/queries/use-profile';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { createRecordCopyDraft } from '@/features/records/mutations/create-record-copy-draft';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordCopyTargets } from '@/features/records/queries/use-record-copy-targets';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { cn } from '@/lib/cn';
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
  isPinned?: boolean;
  logId?: string;
  recordId: string;
  teamId?: string;
};

export const useEntryMenuState = ({
  authorId,
  logId,
  replyId,
  teamId,
}: Pick<EntryMenuProps, 'authorId' | 'logId' | 'replyId' | 'teamId'>) => {
  const myRole = useMyRole({ teamId });
  const profile = useProfile();
  const isAuthor = !!profile.id && profile.id === authorId;

  const canDelete = canDeleteOwnOrManagedResource({
    actorRole: myRole.role,
    isAuthor,
  });

  const canEdit = isAuthor;

  const recordTags = useHasRecordTagsForLog({
    enabled: !replyId && isAuthor && !myRole.isLoading && !myRole.canManage,
    logId,
    teamId,
  });

  const canTag =
    !replyId && (myRole.canManage || (isAuthor && recordTags.hasRecordTags));

  const canDuplicateRecord = !replyId && isAuthor;

  const copyTargets = useRecordCopyTargets({
    enabled: canDuplicateRecord && !!logId,
  });

  const canDuplicate =
    canDuplicateRecord && !!logId && copyTargets.logs.length > 0;

  const canPin = !replyId && myRole.canPinRecords;
  const hasActionsAboveDelete = canEdit || canTag || canPin;
  const hasMenu = canDelete || canDuplicate || canEdit || canPin || canTag;

  return {
    canDelete,
    canDuplicate,
    canEdit,
    canPin,
    canTag,
    copyTargetLogs: copyTargets.logs,
    hasActionsAboveDelete,
    hasMenu,
  };
};

export type EntryMenuState = ReturnType<typeof useEntryMenuState>;

const EntryMenuDropdownContent = ({
  accentColor,
  logId,
  replyId,
  isDetail,
  isPinned,
  recordId,
  state,
}: Omit<EntryMenuProps, 'className'> & { state: EntryMenuState }) => {
  const sheetManager = useSheetManager();
  const menu = Menu.useContext();
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const {
    canDelete,
    canDuplicate,
    canEdit,
    canPin,
    canTag,
    copyTargetLogs,
    hasActionsAboveDelete,
    hasMenu,
  } = state;

  if (!hasMenu) return null;

  const duplicateRecord = async () => {
    const [targetLog] = copyTargetLogs;
    if (isDuplicating) return;

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
    } catch (error) {
      setIsDuplicating(false);

      alert({
        message:
          error instanceof Error ? error.message : 'Failed to copy record',
        title: 'Error',
      });
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
            onPress={() => {
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
          <Menu.Item onPress={() => sheetManager.open('record-tags', recordId)}>
            <Icon className="text-placeholder" icon={Tag} />
            <Text>Tag</Text>
          </Menu.Item>
        )}
        {canPin && (
          <Menu.Item
            onPress={() => {
              const nextIsPinned = !isPinned;
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
        {(canDuplicate || canDelete) && (
          <React.Fragment>
            {hasActionsAboveDelete && <Menu.Separator />}
            {canDuplicate && (
              <Menu.Item
                closeOnPress={copyTargetLogs.length !== 1}
                disabled={isDuplicating}
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
            {canDelete && (
              <Menu.Item
                onPress={() => {
                  if (replyId) {
                    sheetManager.open('reply-delete', replyId, recordId);
                  } else {
                    sheetManager.open(
                      'record-delete',
                      recordId,
                      isDetail ? `detail:${logId ?? ''}` : undefined
                    );
                  }
                }}
              >
                <Icon className="text-destructive" icon={Trash} />
                <Text className="text-destructive">Delete</Text>
              </Menu.Item>
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
