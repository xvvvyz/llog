import { useLog } from '@/features/logs/queries/use-log';
import * as lookup from '@/features/search/lib/lookup';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ViewStyle } from 'react-native';

import {
  MagnifyingGlass,
  Cards,
  NoteBlank,
  NotePencil,
  Notepad,
  Tag,
  Trash,
  UsersThree,
} from 'phosphor-react-native';

export const DropdownMenu = ({
  children,
  contentClassName,
  contentStyle,
  id,
  triggerWrapperClassName,
}: {
  children: React.ReactNode;
  contentClassName?: string;
  contentStyle?: ViewStyle;
  id?: string;
  triggerWrapperClassName?: string;
}) => {
  const log = useLog({ id });
  const { canManage } = useMyRole({ teamId: log.teamId });
  const sheetManager = useSheetManager();

  const searchQuery = lookup.getLogSearchQuery({
    id: log.id ?? id,
    name: log.name,
  });

  const searchHref = searchQuery
    ? lookup.getLookupHref(searchQuery)
    : undefined;

  if (!canManage && !searchHref) return null;

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
        {canManage && (
          <>
            <Menu.Item onPress={() => sheetManager.open('log-edit', id)}>
              <Icon className="text-placeholder" icon={NotePencil} />
              <Text>Edit</Text>
            </Menu.Item>
            <Menu.Item onPress={() => sheetManager.open('log-notes', id)}>
              <Icon className="text-placeholder" icon={Notepad} />
              <Text>Notes</Text>
            </Menu.Item>
            <Menu.Item onPress={() => sheetManager.open('log-tags', id)}>
              <Icon className="text-placeholder" icon={Tag} />
              <Text>Tags</Text>
            </Menu.Item>
            <Menu.Item onPress={() => sheetManager.open('log-cards', id)}>
              <Icon className="text-placeholder" icon={Cards} />
              <Text>Cards</Text>
            </Menu.Item>
            <Menu.Item onPress={() => sheetManager.open('log-templates', id)}>
              <Icon className="text-placeholder" icon={NoteBlank} />
              <Text>Templates</Text>
            </Menu.Item>
            <Menu.Item onPress={() => sheetManager.open('log-members', id)}>
              <Icon className="text-placeholder" icon={UsersThree} />
              <Text>Members</Text>
            </Menu.Item>
          </>
        )}
        <Menu.Item disabled={!searchHref} href={searchHref}>
          <Icon className="text-placeholder" icon={MagnifyingGlass} />
          <Text>Search</Text>
        </Menu.Item>
        {canManage && (
          <>
            <Menu.Separator />
            <Menu.Item
              onPress={() =>
                sheetManager.open('log-delete', id, undefined, {
                  teamId: log.teamId,
                })
              }
            >
              <Icon className="text-destructive" icon={Trash} />
              <Text className="text-destructive">Delete</Text>
            </Menu.Item>
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
