import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { cn } from '@/utilities/ui/utils';
import { Platform, View } from 'react-native';

import {
  FolderPen,
  MoreHorizontal,
  MoreVertical,
  Tag,
  Trash,
} from 'lucide-react-native';

export const LogDropdownMenu = ({
  headerHeight,
  id,
  name = '',
  variant = 'list',
}: {
  headerHeight?: number;
  id?: string;
  name?: string;
  variant?: 'header' | 'list';
}) => {
  const sheetManager = useSheetManager();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button className="size-14" size="icon" variant="link">
          {variant === 'list' ? (
            <View
              className="size-6 items-center justify-center rounded-lg bg-white/15 group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20"
              style={{ borderCurve: 'continuous' }}
            >
              <Icon className="text-white" icon={MoreHorizontal} size={20} />
            </View>
          ) : (
            <Icon className="text-foreground" icon={MoreVertical} />
          )}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        align="end"
        className={cn(variant === 'list' ? '-mt-0.5 mr-3.5' : 'mt-1')}
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
        <Menu.Item onPress={() => sheetManager.open('log-edit', id)}>
          <Icon className="text-placeholder" icon={FolderPen} size={20} />
          <Text>Edit</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-tags', id)}>
          <Icon className="text-placeholder" icon={Tag} size={20} />
          <Text>Tags</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-delete', id)}>
          <Icon className="text-placeholder" icon={Trash} size={20} />
          <Text>Delete</Text>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
