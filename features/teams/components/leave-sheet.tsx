import { useUi } from '@/features/account/queries/use-ui';
import { leaveTeam } from '@/features/teams/mutations/leave';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { View } from 'react-native';

export const TeamLeaveSheet = () => {
  const sheetManager = useSheetManager();
  const { teams, isLoading: teamsLoading } = useTeams();
  const ui = useUi();

  const payload = sheetManager.getPayload('team-leave') as
    | { teamId?: string }
    | undefined;

  const teamId = payload?.teamId ?? ui.activeTeamId;

  return (
    <Sheet
      className="md:max-w-sm"
      loading={teamsLoading || ui.isLoading}
      onDismiss={() => sheetManager.close('team-leave')}
      open={sheetManager.isOpen('team-leave')}
      portalName="team-leave"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">Leave team?</Text>
        <Button
          variant="destructive"
          wrapperClassName="mt-12"
          onPress={() => {
            sheetManager.close('team-leave');
            sheetManager.close('team-members');
            sheetManager.close('team');
            if (!teamId) return;
            router.replace('/');

            void leaveTeam({
              teamId,
              teams,
              activeTeamId: ui.activeTeamId,
              uiId: ui.id,
            });
          }}
        >
          <Text>Leave</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-leave')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
