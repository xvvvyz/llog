import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useMyRole } from '@/queries/use-my-role';
import { NotePencil, Tag, Trash } from 'phosphor-react-native';
import { ReactNode } from 'react';
import { ViewStyle } from 'react-native';

export const LogDropdownMenu = ({
  children,
  contentClassName,
  contentStyle,
  id,
  triggerWrapperClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: ViewStyle;
  id?: string;
  triggerWrapperClassName?: string;
}) => {
  const { canManage } = useMyRole();
  const sheetManager = useSheetManager();

  if (!canManage) return null;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-11"
          size="icon"
          variant="link"
          wrapperClassName={triggerWrapperClassName}
        >
          {children}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        align="end"
        className={contentClassName}
        style={contentStyle}
      >
        <Menu.Item onPress={() => sheetManager.open('log-edit', id)}>
          <Icon className="text-placeholder" icon={NotePencil} size={16} />
          <Text>Edit</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-tags', id)}>
          <Icon className="text-placeholder" icon={Tag} size={16} />
          <Text>Tags</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-delete', id)}>
          <Icon className="text-placeholder" icon={Trash} size={16} />
          <Text>Delete</Text>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
