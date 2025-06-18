import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { cn } from '@/utilities/ui/utils';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FolderPen,
  MoreHorizontal,
  MoreVertical,
  Tag,
  Trash,
} from 'lucide-react-native';

export const LogDropdownMenu = ({
  id,
  variant = 'list',
}: {
  id?: string;
  variant?: 'header' | 'list';
}) => {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const sheetManager = useSheetManager();
  const menuOffset = headerHeight + insets.top;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-10"
          size="icon"
          variant="link"
          wrapperClassName={cn(
            variant === 'list' ? 'mt-2 mr-2' : 'md:-mr-2.5 md:ml-5'
          )}
        >
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
        className={cn(variant === 'list' ? 'mr-1.5 mt-1.5' : 'mt-3')}
        style={
          variant === 'header'
            ? { top: Platform.select({ default: menuOffset, web: 0 }) }
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
