import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { Fragment } from 'react';
import { Platform, View } from 'react-native';

import {
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Tag,
  Trash,
} from 'lucide-react-native';

export function LogDropdownMenu({
  headerHeight = 0,
  logId,
  logName = '',
  setLogDeleteFormId,
  setLogEditFormId,
  setLogTagsFromId,
  variant = 'list',
}: {
  headerHeight?: number;
  logId?: string;
  logName?: string;
  setLogDeleteFormId: (id: string | null) => void;
  setLogEditFormId: (id: string | null) => void;
  setLogTagsFromId: (id: string | null) => void;
  variant?: 'header' | 'list';
}) {
  return (
    <Fragment>
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
              <View className="size-6 items-center justify-center rounded-full bg-white/15 group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20">
                <Icon
                  aria-hidden
                  className="text-white"
                  icon={MoreHorizontal}
                  size={20}
                />
              </View>
            ) : (
              <Icon
                aria-hidden
                className="text-foreground"
                icon={MoreVertical}
              />
            )}
          </Button>
        </Menu.Trigger>
        <Menu.Content
          align="end"
          className={cn(
            variant === 'list' && '-mt-1 mr-3',
            variant === 'header' && 'mr-4'
          )}
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
          <Menu.Item
            accessibilityHint="Opens the edit form for this log"
            accessibilityLabel={`Edit ${logName}`}
            onPress={() => logId && setLogEditFormId(logId)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Pencil}
              size={20}
            />
            <Text>Edit</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the tags management form"
            accessibilityLabel={`Manage tags for ${logName}`}
            onPress={() => logId && setLogTagsFromId(logId)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Tag}
              size={20}
            />
            <Text>Tags</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the delete confirmation dialog"
            accessibilityLabel={`Delete ${logName}`}
            onPress={() => logId && setLogDeleteFormId(logId)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Trash}
              size={20}
            />
            <Text>Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </Fragment>
  );
}
