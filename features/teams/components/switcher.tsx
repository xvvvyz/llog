import { useUi } from '@/features/account/queries/use-ui';
import { createTeam } from '@/features/teams/mutations/create';
import { switchTeam } from '@/features/teams/mutations/switch';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { CaretDown, Check, GearSix, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View, type GestureResponderEvent } from 'react-native';

export const TeamSwitcher = () => {
  return (
    <Menu.Root>
      <TeamSwitcherContent />
    </Menu.Root>
  );
};

const TeamSwitcherContent = () => {
  const breakpoints = useBreakpoints();
  const menu = Menu.useContext();
  const ui = useUi();
  const { teams } = useTeams();

  const [highlightedTeamId, setHighlightedTeamId] = React.useState<
    string | null
  >(null);

  const handleSwitchTeam = React.useCallback(
    (teamId: string) => {
      if (teamId === ui.activeTeamId) return;
      void switchTeam({ teamId, uiId: ui.id });
    },
    [ui.activeTeamId, ui.id]
  );

  const handleCreateTeam = React.useCallback(() => {
    void createTeam({ name: 'Team' });
  }, []);

  const handleOpenTeamSettings = React.useCallback(
    (event: GestureResponderEvent, teamId: string) => {
      event.stopPropagation();
      menu.onOpenChange(false);
      router.push(`/team/${teamId}`);
    },
    [menu]
  );

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
          <View
            key={t.id}
            className={cn(
              'flex-row items-center pr-2',
              highlightedTeamId === t.id && 'bg-accent'
            )}
          >
            <Menu.Item
              className="flex-1 pr-4 active:bg-transparent web:focus:bg-transparent web:hover:bg-transparent"
              onHoverIn={() => setHighlightedTeamId(t.id)}
              onHoverOut={() => setHighlightedTeamId(null)}
              onPress={() => handleSwitchTeam(t.id)}
              onPressIn={() => setHighlightedTeamId(t.id)}
              onPressOut={() => setHighlightedTeamId(null)}
            >
              {t.id === ui.activeTeamId ? (
                <View className="size-5 items-center justify-center">
                  <Icon icon={Check} />
                </View>
              ) : (
                <Avatar
                  avatar={t.image?.uri}
                  fallback="gradient"
                  id={t.id}
                  size={20}
                />
              )}
              <Text className="flex-1" numberOfLines={1}>
                {t.name}
              </Text>
            </Menu.Item>
            <Button
              onPress={(event) => handleOpenTeamSettings(event, t.id)}
              onTouchStart={(event) => event.stopPropagation()}
              size="icon-xs"
              variant="ghost"
            >
              <Icon className="text-placeholder" icon={GearSix} />
            </Button>
          </View>
        ))}
        <Menu.Separator />
        <CreateTeamMenuItem onPress={handleCreateTeam} />
      </Menu.Content>
    </>
  );
};

const CreateTeamMenuItem = ({ onPress }: { onPress: () => void }) => {
  return (
    <Menu.Item onPress={onPress}>
      <View className="w-5 items-center">
        <Icon className="text-placeholder" icon={Plus} />
      </View>
      <Text>New team</Text>
    </Menu.Item>
  );
};
