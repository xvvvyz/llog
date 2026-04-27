import { useLogColor } from '@/features/logs/hooks/use-color';
import { toggleLogMember } from '@/features/logs/mutations/toggle-member';
import { useLog } from '@/features/logs/queries/use-log';
import { isMemberRole } from '@/features/teams/lib/permissions';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Avatar } from '@/ui/avatar';
import { Checkbox } from '@/ui/checkbox';
import { Sheet } from '@/ui/sheet';
import { SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const LogMembersSheet = () => {
  const sheetManager = useSheetManager();
  const log = useLog({ id: sheetManager.getId('log-members') });
  const logColor = useLogColor({ id: log.id });

  const { members, isLoading: membersLoading } = useTeamMembers({
    teamId: log.teamId,
  });

  const isLoading = log.isLoading || membersLoading;

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
      open={sheetManager.isOpen('log-members')}
      portalName="log-members"
    >
      <SheetListScrollView>
        {members
          .filter((member) => isMemberRole(member.role))
          .map((member) => {
            const profile = member.user?.profile;
            if (!profile) return null;
            const isSelected = getSelected(profile.id);

            return (
              <View
                key={member.id}
                className="flex-row py-2.5 items-center justify-between"
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
    </Sheet>
  );
};
