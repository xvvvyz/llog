import { isMemberRole } from '@/domain/teams/permissions';
import { LogDropdownItems } from '@/features/invites/components/log-dropdown-items';
import { useLog } from '@/features/logs/queries/use-log';
import { useConnectivity } from '@/features/offline/connectivity';
import * as lookup from '@/features/search/lib/lookup';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ViewStyle } from 'react-native';

import {
  MagnifyingGlass,
  NoteBlank,
  NotePencil,
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
  const connectivity = useConnectivity();
  const { canManage } = useMyRole({ teamId: log.teamId });
  const sheetManager = useSheetManager();
  const { members } = useTeamMembers({ teamId: log.teamId });

  const searchQuery = lookup.getLogSearchQuery({
    id: log.id ?? id,
    name: log.name,
  });

  const searchHref = searchQuery
    ? lookup.getLookupHref(searchQuery)
    : undefined;

  const hasMembers = React.useMemo(
    () => members.some((m) => isMemberRole(m.role)),
    [members]
  );

  const networkActionsDisabled = !connectivity.canRunNetworkActions;
  const shouldShowMembers = hasMembers || networkActionsDisabled;
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
            <Menu.Item
              disabled={networkActionsDisabled}
              onPress={() => sheetManager.open('log-tags', id)}
            >
              <Icon className="text-placeholder" icon={Tag} />
              <Text>Tags</Text>
            </Menu.Item>
            <Menu.Item
              disabled={networkActionsDisabled}
              onPress={() => sheetManager.open('log-templates', id)}
            >
              <Icon className="text-placeholder" icon={NoteBlank} />
              <Text>Templates</Text>
            </Menu.Item>
            {shouldShowMembers && (
              <Menu.Item
                disabled={networkActionsDisabled}
                onPress={() => sheetManager.open('log-members', id)}
              >
                <Icon className="text-placeholder" icon={UsersThree} />
                <Text>Members</Text>
              </Menu.Item>
            )}
            <LogDropdownItems disabled={networkActionsDisabled} id={id} />
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
              disabled={networkActionsDisabled}
              onPress={() => sheetManager.open('log-delete', id)}
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
