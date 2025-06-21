import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { PenLine, Tag, Trash } from 'lucide-react-native';
import { ReactNode } from 'react';
import { ViewStyle } from 'react-native';

export const RecordDropdownMenu = ({
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
  const sheetManager = useSheetManager();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-12"
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
        <Menu.Item onPress={() => sheetManager.open('record-edit', id)}>
          <Icon className="text-placeholder" icon={PenLine} size={20} />
          <Text>Edit</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('record-tags', id)}>
          <Icon className="text-placeholder" icon={Tag} size={20} />
          <Text>Tags</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('record-delete', id)}>
          <Icon className="text-placeholder" icon={Trash} size={20} />
          <Text>Delete</Text>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
