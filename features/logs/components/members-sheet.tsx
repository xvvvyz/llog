import { useLogColor } from '@/features/logs/hooks/use-color';
import { toggleLogMember } from '@/features/logs/mutations/toggle-member';
import { useLog } from '@/features/logs/queries/use-log';
import { isMemberRole } from '@/features/teams/lib/permissions';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useNameSearch } from '@/hooks/use-name-search';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const LogMembersSheet = () => {
  const [query, setQuery] = React.useState('');
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-members');
  const logId = sheetManager.getId('log-members');
  const log = useLog({ id: logId });
  const logColor = useLogColor({ id: log.id });

  const { members, isLoading: membersLoading } = useTeamMembers({
    teamId: log.teamId,
  });

  const isLoading = log.isLoading || membersLoading;

  React.useEffect(() => {
    if (open) setQuery('');
  }, [open, logId]);

  const memberRows = React.useMemo(
    () =>
      members.flatMap((member) => {
        if (!isMemberRole(member.role)) return [];
        const profile = member.user?.profile;

        return profile
          ? [{ id: profile.id, member, name: profile.name, profile }]
          : [];
      }),
    [members]
  );

  const visibleMemberRows = useNameSearch(memberRows, query);

  const { getSelected, setSelected } = useOptimisticSelection({
    onChange: React.useCallback(
      (profileId: string, selected: boolean) => {
        const member = members.find((teamMember) => {
          const memberProfileId = teamMember.user?.profile?.id;
          return memberProfileId === profileId;
        });

        if (!member) return Promise.resolve();

        return toggleLogMember({
          roleId: member.id,
          selected,
          logId: log.id,
          teamId: log.teamId,
        });
      },
      [log.id, log.teamId, members]
    ),
    scopeKey: log.id,
    selectedIds: log.profileIdsSet,
  });

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-members')}
      open={open}
      portalName="log-members"
      variant="list"
    >
      {!!visibleMemberRows.length && (
        <SheetListScrollView variant="selection">
          {visibleMemberRows.map(({ member, profile }) => {
            const isSelected = getSelected(profile.id);

            return (
              <View
                key={member.id}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row gap-3 items-center">
                  <Avatar
                    avatar={profile.image?.uri}
                    id={profile.id}
                    seedId={profile.avatarSeedId}
                    size={28}
                  />
                  <Text numberOfLines={1}>{profile.name}</Text>
                </View>
                <Checkbox
                  checked={isSelected}
                  checkedColor={logColor.default}
                  className="size-8 border-0"
                  onCheckedChange={(selected) =>
                    setSelected(profile.id, selected)
                  }
                />
              </View>
            );
          })}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="flex-row gap-4">
        <SearchInput
          query={query}
          setQuery={setQuery}
          size="sm"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={() => sheetManager.close('log-members')}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
        >
          <Text>Done</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
