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

export const LogDropdownMenu = ({
  headerHeight = 0,
  id,
  name = '',
  setDeleteFormId,
  setEditFormId,
  setTagsFormId,
  variant = 'list',
}: {
  headerHeight?: number;
  id?: string;
  name?: string;
  setDeleteFormId: (id: string | null) => void;
  setEditFormId: (id: string | null) => void;
  setTagsFormId: (id: string | null) => void;
  variant?: 'header' | 'list';
}) => {
  return (
    <Fragment>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityHint="Opens a menu with more options"
            accessibilityLabel={`More options for ${name}`}
            className="size-14"
            size="icon"
            variant="link"
          >
            {variant === 'list' ? (
              <View
                className="size-6 items-center justify-center rounded-lg bg-white/15 group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20"
                style={{ borderCurve: 'continuous' }}
              >
                <Icon
                  aria-hidden
                  className="text-white"
                  icon={MoreHorizontal}
                  size={18}
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
            variant === 'list' && '-mt-1.5 mr-3',
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
            accessibilityLabel={`Edit ${name}`}
            onPress={() => id && setEditFormId(id)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Pencil}
              size={18}
            />
            <Text>Edit</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the tags management form"
            accessibilityLabel={`Manage tags for ${name}`}
            onPress={() => id && setTagsFormId(id)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Tag}
              size={18}
            />
            <Text>Tags</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the delete confirmation dialog"
            accessibilityLabel={`Delete ${name}`}
            onPress={() => id && setDeleteFormId(id)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Trash}
              size={18}
            />
            <Text>Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </Fragment>
  );
};
