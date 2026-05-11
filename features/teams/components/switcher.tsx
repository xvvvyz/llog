import { useUi } from '@/features/account/queries/use-ui';
import { useTeamTransition } from '@/features/teams/hooks/use-team-transition';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { CaretDown, Check, GearSix, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export const TeamSwitcher = ({
  hideSettings,
}: { hideSettings?: boolean } = {}) => {
  return (
    <Menu.Root>
      <TeamSwitcherContent hideSettings={hideSettings} />
    </Menu.Root>
  );
};

const TeamSwitcherContent = ({ hideSettings }: { hideSettings?: boolean }) => {
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const { onOpenChange } = Menu.useContext();
  const ui = useUi();
  const { teams } = useTeams();

  const teamTransition = useTeamTransition({
    onReady: () => onOpenChange(false),
  });

  const activeTeam = teams.find((t) => t.id === ui.activeTeamId);
  const lastAvatarRef = React.useRef(activeTeam?.image?.uri);
  const lastIdRef = React.useRef(activeTeam?.id);
  const lastNameRef = React.useRef(activeTeam?.name);
  if (activeTeam?.image?.uri) lastAvatarRef.current = activeTeam.image.uri;
  if (activeTeam?.id) lastIdRef.current = activeTeam.id;
  if (activeTeam?.name) lastNameRef.current = activeTeam.name;

  return (
    <>
      <Menu.Trigger asChild>
        <Button className="h-auto py-3 gap-1 md:self-start" variant="link">
          <Avatar
            avatar={activeTeam?.image?.uri ?? lastAvatarRef.current}
            className={cn('shrink-0', breakpoints.md ? 'mr-3' : 'mr-1')}
            fallback="gradient"
            id={activeTeam?.id ?? lastIdRef.current}
            size={breakpoints.md ? 20 : 16}
          />
          <Text className="web:md:text-xl">
            {activeTeam?.name ?? lastNameRef.current}
          </Text>
          <Icon className="text-placeholder" icon={CaretDown} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align={breakpoints.md ? 'start' : 'center'}>
        {teams.map((t) => (
          <Menu.Item
            key={t.id}
            className="justify-between"
            closeOnPress={false}
            disabled={teamTransition.isPending}
            onPress={() => teamTransition.switchToTeam(t.id)}
          >
            {teamTransition.pendingTeamId === t.id ? (
              <View className="size-5 items-center justify-center">
                <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
              </View>
            ) : (
              <Avatar
                avatar={t.image?.uri}
                fallback="gradient"
                id={t.id}
                size={20}
              />
            )}
            <Text className="flex-1">{t.name}</Text>
            {teamTransition.pendingTeamId !== t.id &&
            t.id === ui.activeTeamId ? (
              <Icon className="-mr-1" icon={Check} />
            ) : null}
          </Menu.Item>
        ))}
        <CreateTeamMenuItem teamTransition={teamTransition} />
        {!hideSettings && (
          <>
            <Menu.Separator />
            <Menu.Item onPress={() => router.push('/team')}>
              <View className="w-5 items-center">
                <Icon className="text-placeholder" icon={GearSix} />
              </View>
              <Text>Manage team</Text>
            </Menu.Item>
          </>
        )}
      </Menu.Content>
    </>
  );
};

const CreateTeamMenuItem = ({
  teamTransition,
}: {
  teamTransition: ReturnType<typeof useTeamTransition>;
}) => {
  const colorScheme = useColorScheme();

  return (
    <Menu.Item
      closeOnPress={false}
      disabled={teamTransition.isPending}
      onPress={teamTransition.createAndSwitchToTeam}
    >
      <View className="w-5 items-center">
        {teamTransition.isCreatingTeam ? (
          <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
        ) : (
          <Icon className="text-placeholder" icon={Plus} />
        )}
      </View>
      <Text className={teamTransition.isCreatingTeam ? 'text-placeholder' : ''}>
        New team
      </Text>
    </Menu.Item>
  );
};
