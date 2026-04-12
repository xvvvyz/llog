import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { toggleRecordPin } from '@/mutations/toggle-record-pin';
import { useMyRole } from '@/queries/use-my-role';
import { useProfile } from '@/queries/use-profile';
import { cn } from '@/utilities/cn';
import { canDeleteOwnOrManagedResource } from '@/utilities/permissions';
import { DotsThreeVertical } from 'phosphor-react-native/lib/module/icons/DotsThreeVertical';
import { NotePencil } from 'phosphor-react-native/lib/module/icons/NotePencil';
import { PushPin } from 'phosphor-react-native/lib/module/icons/PushPin';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { View } from 'react-native';

export const RecordOrCommentDropdownMenu = ({
  accentColor,
  authorId,
  className,
  commentId,
  isDetail,
  isPinned,
  recordId,
  teamId,
}: {
  accentColor?: string;
  authorId?: string;
  className?: string;
  commentId?: string;
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
          {isAuthor && (
            <Menu.Item
              onPress={() => {
                if (commentId) {
                  sheetManager.open('comment-create', commentId, recordId);
                } else {
                  sheetManager.open('record-create', recordId, 'edit');
                }
              }}
            >
              <Icon className="text-placeholder" icon={NotePencil} />
              <Text>Edit</Text>
            </Menu.Item>
          )}
          {!commentId && myRole.canPinRecords && (
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
          <Menu.Separator />
          <Menu.Item
            onPress={() => {
              if (commentId) {
                sheetManager.open('comment-delete', commentId, recordId);
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
