import { MoreHorizontal } from '@/components/icons/more-horizontal';
import { MoreVertical } from '@/components/icons/more-vertical';
import { Pencil } from '@/components/icons/pencil';
import { Trash } from '@/components/icons/trash';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { Link } from 'expo-router';
import { Platform, View } from 'react-native';

interface LogDropdownMenuProps {
  headerHeight?: number;
  logId: string;
  logName: string;
  variant?: 'header' | 'list';
}

export function LogDropdownMenu({
  headerHeight = 0,
  logId,
  logName,
  variant = 'list',
}: LogDropdownMenuProps) {
  const Icon = variant === 'list' ? MoreHorizontal : MoreVertical;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          accessibilityHint="Opens a menu with more options"
          accessibilityLabel={`More options for ${logName}`}
          className="size-14"
          size="icon"
          variant="link"
        >
          {variant === 'list' ? (
            <View className="size-7 items-center justify-center rounded-full bg-white/15 group-active:bg-white/25 web:transition-colors web:group-hover:bg-white/25">
              <Icon aria-hidden className="text-white" size={20} />
            </View>
          ) : (
            <Icon aria-hidden className="text-foreground" size={20} />
          )}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        align="end"
        className={cn({
          'mr-2': variant === 'list',
          'mr-4': variant === 'header',
        })}
        style={
          variant === 'header'
            ? {
                top: Platform.select({
                  android: headerHeight,
                  default: 0,
                  ios: headerHeight,
                }),
              }
            : undefined
        }
      >
        <Link asChild href={`/${logId}/edit`}>
          <Menu.Item
            accessibilityHint="Opens the edit form for this log"
            accessibilityLabel={`Edit ${logName}`}
          >
            <Pencil aria-hidden className="text-placeholder" size={20} />
            <Text>Edit</Text>
          </Menu.Item>
        </Link>
        <Link asChild href={`/${logId}/delete`}>
          <Menu.Item
            accessibilityHint="Opens the delete confirmation dialog"
            accessibilityLabel={`Delete ${logName}`}
          >
            <Trash aria-hidden className="text-placeholder" size={20} />
            <Text>Delete</Text>
          </Menu.Item>
        </Link>
      </Menu.Content>
    </Menu.Root>
  );
}
