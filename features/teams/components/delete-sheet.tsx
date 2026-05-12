import { useUi } from '@/features/account/queries/use-ui';
import { deleteTeam } from '@/features/teams/mutations/delete';
import { switchTeam } from '@/features/teams/mutations/switch';
import { useTeam } from '@/features/teams/queries/use-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export const TeamDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const ui = useUi();

  const payload = sheetManager.getPayload('team-delete') as
    | { teamId?: string }
    | undefined;

  const teamId = payload?.teamId ?? ui.activeTeamId;
  const team = useTeam({ teamId });
  const { teams, isLoading: teamsLoading } = useTeams();
  const open = sheetManager.isOpen('team-delete');

  const handleDelete = React.useCallback(() => {
    if (!team.id) return;
    const deletedTeamId = team.id;
    const nextTeam = teams.find((t) => t.id !== deletedTeamId);
    sheetManager.close('team-delete');
    sheetManager.close('team-members');
    sheetManager.close('team');
    router.replace('/');

    void (async () => {
      if (deletedTeamId === ui.activeTeamId && nextTeam) {
        await switchTeam({ teamId: nextTeam.id, uiId: ui.id });
      }

      await deleteTeam({ id: deletedTeamId });
    })();
  }, [sheetManager, team.id, teams, ui.activeTeamId, ui.id]);

  return (
    <Sheet
      className="md:max-w-sm"
      loading={team.isLoading || teamsLoading || ui.isLoading}
      onDismiss={() => sheetManager.close('team-delete')}
      open={open}
      portalName="team-delete"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">Delete team?</Text>
        <Button
          onPress={handleDelete}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          <Text>Delete</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
