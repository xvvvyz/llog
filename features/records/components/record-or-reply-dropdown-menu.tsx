import { useProfile } from '@/features/account/queries/use-profile';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { toggleRecordPin } from '@/features/records/mutations/toggle-record-pin';
import { canDeleteOwnOrManagedResource } from '@/features/teams/lib/permissions';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { DotsThreeVertical } from 'phosphor-react-native/lib/module/icons/DotsThreeVertical';
import { NotePencil } from 'phosphor-react-native/lib/module/icons/NotePencil';
import { PushPin } from 'phosphor-react-native/lib/module/icons/PushPin';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { View } from 'react-native';

export const RecordOrReplyDropdownMenu = ({
  accentColor,
  authorId,
  className,
  logId,
  replyId,
  isDetail,
  isPinned,
  recordId,
  teamId,
}: {
  accentColor?: string;
  authorId?: string;
  className?: string;
  replyId?: string;
  isDetail?: boolean;
  isPinned?: boolean;
  logId?: string;
  recordId: string;
  teamId?: string;
}) => {
  const myRole = useMyRole({ teamId });
  const profile = useProfile();
  const sheetManager = useSheetManager();
  const isAuthor = !!profile.id && profile.id === authorId;

  const canDelete = canDeleteOwnOrManagedResource({
    actorRole: myRole.role,
    isAuthor,
  });

  const canEdit = isAuthor;
  const canPin = !replyId && myRole.canPinRecords;
  const hasActionsAboveDelete = canEdit || canPin;

  if (!canDelete) return null;

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
          {hasActionsAboveDelete && <Menu.Separator />}
          <Menu.Item
            onPress={() => {
              if (replyId) {
                sheetManager.open('reply-delete', replyId, recordId);
              } else {
                sheetManager.open(
                  'record-delete',
                  recordId,
                  isDetail ? 'detail:modal' : undefined
                );
              }
            }}
          >
            <Icon className="text-destructive" icon={Trash} />
            <Text className="text-destructive">Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </View>
  );
};
