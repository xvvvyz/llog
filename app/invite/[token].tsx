import * as storage from '@/features/invites/lib/invite-storage';
import { redeemInviteLink } from '@/features/invites/mutations/redeem-invite-link';
import { switchTeam } from '@/features/teams/mutations/switch-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { alert } from '@/lib/alert';
import { db } from '@/lib/db';
import { UI } from '@/theme/ui';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native/lib/module/icons/ArrowRight';
import { WarningCircle } from 'phosphor-react-native/lib/module/icons/WarningCircle';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

interface Member {
  avatarSeedId?: string;
  id: string;
  name?: string;
  image?: string;
}

interface LinkInfo {
  isValid: boolean;
  teamId?: string;
  teamName?: string;
  role?: string;
  logNames?: string[];
  members?: Member[];
}

const renderLogNames = (names: string[]) =>
  names.map((name, i) => (
    <React.Fragment key={`${name}-${i}`}>
      {i > 0 ? (i === names.length - 1 ? ' and ' : ', ') : null}
      <Text className="text-foreground font-medium">{name}</Text>
    </React.Fragment>
  ));

export default function InviteLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const auth = db.useAuth();
  const { teams, isLoading: teamsLoading } = useTeams();
  const [linkInfo, setLinkInfo] = React.useState<LinkInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRedeeming, setIsRedeeming] = React.useState(false);

  const [shouldResumeAcceptedInvite, setShouldResumeAcceptedInvite] =
    React.useState(false);

  React.useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/teams/invite-links/${token}`
        );

        const data = await response.json();

        if (!cancelled) {
          setLinkInfo(data);
        }
      } catch {
        if (!cancelled) {
          setLinkInfo({ isValid: false });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  React.useEffect(() => {
    let cancelled = false;

    if (!token || !auth.user) {
      setShouldResumeAcceptedInvite(false);
      return;
    }

    void (async () => {
      const pendingToken = await AsyncStorage.getItem(
        storage.PENDING_INVITE_AUTO_JOIN_KEY
      );

      if (!cancelled) {
        setShouldResumeAcceptedInvite(pendingToken === token);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.user, token]);

  const handleJoin = React.useCallback(async () => {
    if (!token) return;
    setIsRedeeming(true);

    try {
      const { teamId } = await redeemInviteLink({ token });

      await AsyncStorage.multiRemove([
        storage.PENDING_INVITE_KEY,
        storage.PENDING_INVITE_AUTO_JOIN_KEY,
      ]);

      await switchTeam({ teamId });
      router.replace('/');
    } catch (e) {
      alert({
        message: e instanceof Error ? e.message : 'Failed to join team',
        title: 'Error',
      });
    } finally {
      setIsRedeeming(false);
    }
  }, [token]);

  const handleSignIn = React.useCallback(async () => {
    if (!token) return;

    await AsyncStorage.multiSet([
      [storage.PENDING_INVITE_KEY, token],
      [storage.PENDING_INVITE_AUTO_JOIN_KEY, token],
    ]);

    router.replace('/sign-in');
  }, [token]);

  const isExistingTeamMember =
    !!auth.user &&
    !!linkInfo?.teamId &&
    teams.some((team) => team.id === linkInfo.teamId);

  const shouldAutoJoin =
    !isLoading &&
    !auth.isLoading &&
    !teamsLoading &&
    !!linkInfo?.isValid &&
    (isExistingTeamMember || shouldResumeAcceptedInvite);

  React.useEffect(() => {
    if (shouldAutoJoin) handleJoin();
  }, [shouldAutoJoin, handleJoin]);

  if (!token) {
    return <Redirect href="/" />;
  }

  if (
    isLoading ||
    auth.isLoading ||
    (auth.user && linkInfo?.isValid && teamsLoading) ||
    shouldAutoJoin
  ) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  return (
    <Page className="items-center justify-center p-6">
      <View className="flex-1 items-center justify-center gap-8 px-3 py-8">
        {linkInfo?.isValid &&
        linkInfo.members &&
        linkInfo.members.length > 0 ? (
          <View className="flex-row items-center">
            {linkInfo.members.slice(0, 4).map((member, i) => (
              <View
                key={member.id}
                className="bg-background items-center justify-center overflow-hidden rounded-full p-0.5"
                style={[
                  { width: 68, height: 68 },
                  i > 0 ? { marginLeft: -22 } : undefined,
                ]}
              >
                <Avatar
                  avatar={member.image}
                  id={member.id}
                  seedId={member.avatarSeedId}
                  size={64}
                />
              </View>
            ))}
            {linkInfo.members.length > 4 && (
              <Text className="ml-3 text-sm font-medium">
                +{linkInfo.members.length - 4}
              </Text>
            )}
          </View>
        ) : (
          <Icon className="text-destructive" icon={WarningCircle} size={64} />
        )}
        <Text className="text-muted-foreground mt-2 text-center">
          {linkInfo?.isValid
            ? linkInfo.logNames && linkInfo.logNames.length > 0
              ? `You\u2019ve been invited to join the `
              : 'You\u2019ve been invited to join '
            : 'This invite link is no longer valid.'}
          {linkInfo?.isValid &&
            linkInfo.logNames &&
            linkInfo.logNames.length > 0 &&
            renderLogNames(linkInfo.logNames)}
          {linkInfo?.isValid &&
          linkInfo.logNames &&
          linkInfo.logNames.length > 0
            ? ` log${linkInfo.logNames.length > 1 ? 's' : ''}.`
            : null}
          {linkInfo?.isValid &&
            !(linkInfo.logNames && linkInfo.logNames.length > 0) && (
              <>
                <Text className="text-foreground font-medium">
                  {linkInfo.teamName}
                </Text>
                .
              </>
            )}
        </Text>
        <Button
          disabled={isRedeeming}
          onPress={
            linkInfo?.isValid
              ? auth.user
                ? handleJoin
                : handleSignIn
              : () => router.replace('/')
          }
          variant={linkInfo?.isValid ? 'default' : 'secondary'}
          wrapperClassName="mt-4"
        >
          {isRedeeming ? (
            <>
              <ActivityIndicator color={UI.light.contrastForeground} />
              <Text>Joining{'\u2026'}</Text>
            </>
          ) : linkInfo?.isValid ? (
            <>
              <Text>Let{'\u2019'}s go</Text>
              <Icon
                icon={ArrowRight}
                className="text-contrast-foreground -mr-0.5"
              />
            </>
          ) : (
            <>
              <Text>Oh well</Text>
              <Icon icon={ArrowRight} className="-mr-0.5" />
            </>
          )}
        </Button>
      </View>
    </Page>
  );
}
