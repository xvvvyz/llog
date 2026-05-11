import { useUi } from '@/features/account/queries/use-ui';
import { deleteTeam } from '@/features/teams/mutations/delete';
import { switchTeam } from '@/features/teams/mutations/switch';
import { useTeam } from '@/features/teams/queries/use-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export const TeamDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { teams, isLoading: teamsLoading } = useTeams();
  const ui = useUi();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const open = sheetManager.isOpen('team-delete');

  React.useEffect(() => {
    if (open) setIsDeleting(false);
  }, [open]);

  return (
    <Sheet
      className="md:max-w-sm"
      loading={team.isLoading || teamsLoading || ui.isLoading}
      open={open}
      portalName="team-delete"
      onDismiss={() => {
        if (!isDeleting) sheetManager.close('team-delete');
      }}
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">Delete team?</Text>
        <Button
          disabled={isDeleting}
          variant="destructive"
          wrapperClassName="mt-12"
          onPress={async () => {
            if (!team.id || isDeleting) return;
            setIsDeleting(true);
            const nextTeam = teams.find((t) => t.id !== team.id);

            try {
              if (nextTeam) {
                await switchTeam({ teamId: nextTeam.id, uiId: ui.id });
              }

              await deleteTeam({ id: team.id });
              router.replace('/');
              sheetManager.close('team-delete');
            } catch (error) {
              setIsDeleting(false);
              throw error;
            }
          }}
        >
          {isDeleting ? <Spinner /> : <Text>Delete</Text>}
        </Button>
        <Button
          disabled={isDeleting}
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
