import { leaveTeam } from '@/features/teams/mutations/leave-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useUi } from '@/queries/use-ui';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { View } from 'react-native';

export const TeamLeaveSheet = () => {
  const sheetManager = useSheetManager();
  const { teams } = useTeams();
  const ui = useUi();

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-leave')}
      open={sheetManager.isOpen('team-leave')}
      portalName="team-leave"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Leave team?</Text>
        <Button
          onPress={async () => {
            sheetManager.close('team-leave');
            if (!ui.activeTeamId) return;

            await leaveTeam({
              teamId: ui.activeTeamId,
              teams,
              activeTeamId: ui.activeTeamId,
              uiId: ui.id,
            });

            router.replace('/');
          }}
          variant="destructive"
          wrapperClassName="mt-12"
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
