import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { canDeleteOwnOrManagedResource } from '@/lib/permissions';
import { toggleRecordPin } from '@/mutations/toggle-record-pin';
import { useMyRole } from '@/queries/use-my-role';
import { useProfile } from '@/queries/use-profile';
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
              onPress={() =>
                toggleRecordPin({ id: recordId, isPinned: !isPinned })
              }
            >
              <Icon
                className={!isPinned ? 'text-placeholder' : undefined}
                icon={PushPin}
                style={
                  isPinned && accentColor ? { color: accentColor } : undefined
                }
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
                  isDetail ? 'detail' : undefined
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
