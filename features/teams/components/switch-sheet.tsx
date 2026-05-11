import { useUi } from '@/features/account/queries/use-ui';
import { useTeamTransition } from '@/features/teams/hooks/use-team-transition';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Check, Plus } from 'phosphor-react-native';
import { View } from 'react-native';

export const TeamSwitchSheet = () => {
  const sheetManager = useSheetManager();
  const colorScheme = useColorScheme();
  const ui = useUi();
  const { teams } = useTeams();

  const teamTransition = useTeamTransition({
    onReady: () => {
      sheetManager.close('team-switch');
    },
  });

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-switch')}
      open={sheetManager.isOpen('team-switch')}
      portalName="team-switch"
    >
      <View className="mx-auto max-w-md w-full pb-4 pt-8 px-8 md:p-8">
        <Text className="text-2xl text-center">Switch team</Text>
        <View className="mt-8">
          {teams.map((t) => (
            <Button
              key={t.id}
              className="rounded-none justify-between"
              disabled={teamTransition.isPending}
              onPress={() => teamTransition.switchToTeam(t.id)}
              variant="ghost"
              wrapperClassName="rounded-none"
            >
              <Text className="font-normal">{t.name}</Text>
              {teamTransition.pendingTeamId === t.id ? (
                <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
              ) : t.id === ui.activeTeamId ? (
                <Icon className="-mr-1 text-placeholder" icon={Check} />
              ) : null}
            </Button>
          ))}
        </View>
        <Button
          disabled={teamTransition.isPending}
          onPress={teamTransition.createAndSwitchToTeam}
          size="sm"
          variant="secondary"
          wrapperClassName="mt-8"
        >
          {teamTransition.isCreatingTeam ? (
            <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
          ) : (
            <Icon className="text-placeholder" icon={Plus} />
          )}
          <Text
            className={teamTransition.isCreatingTeam ? 'text-placeholder' : ''}
          >
            New team
          </Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-switch')}
          size="sm"
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
