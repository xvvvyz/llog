import { canDeleteOwnOrManagedResource } from '@/domain/teams/permissions';
import { useProfile } from '@/features/account/queries/use-profile';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { useHasRecordTagsForLog } from '@/features/records/queries/use-has-record-tags-for-log';
import { useRecordCopyTargets } from '@/features/records/queries/use-record-copy-targets';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

import {
  CopySimple,
  DotsThreeVertical,
  NotePencil,
  PushPin,
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
    enabled: !replyId && isAuthor && !myRole.canManage,
    logId,
    teamId,
  });

  const canTag =
    !replyId && (myRole.canManage || (isAuthor && recordTags.hasRecordTags));

  const canCopyToAnotherLog = !replyId && isAuthor;

  const copyTargets = useRecordCopyTargets({
    enabled: canCopyToAnotherLog && !!logId,
    sourceLogId: logId,
  });

  const canCopy = canCopyToAnotherLog && !!logId && copyTargets.logs.length > 0;
  const canPin = !replyId && myRole.canPinRecords;
  const hasActionsAboveDelete = canEdit || canTag || canCopy || canPin;
  const hasMenu = canDelete || canCopy || canTag;

  return {
    canCopy,
    canDelete,
    canEdit,
    canPin,
    canTag,
    hasActionsAboveDelete,
    hasMenu,
  };
};

export type EntryMenuState = ReturnType<typeof useEntryMenuState>;

export const EntryMenuContent = ({
  accentColor,
  className,
  logId,
  replyId,
  isDetail,
  isPinned,
  recordId,
  state,
}: EntryMenuProps & { state: EntryMenuState }) => {
  const sheetManager = useSheetManager();

  const {
    canCopy,
    canDelete,
    canEdit,
    canPin,
    canTag,
    hasActionsAboveDelete,
    hasMenu,
  } = state;

  if (!hasMenu) return null;

  return (
    <View className={className}>
      <Menu.Root>
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
            <Menu.Item
              onPress={() => sheetManager.open('record-tags', recordId)}
            >
              <Icon className="text-placeholder" icon={Tag} />
              <Text>Tags</Text>
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
          {canCopy && (
            <Menu.Item
              onPress={() => sheetManager.open('record-copy-to', recordId)}
            >
              <Icon className="text-placeholder" icon={CopySimple} />
              <Text>Copy to</Text>
            </Menu.Item>
          )}
          {canDelete && (
            <React.Fragment>
              {hasActionsAboveDelete && <Menu.Separator />}
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
            </React.Fragment>
          )}
        </Menu.Content>
      </Menu.Root>
    </View>
  );
};
