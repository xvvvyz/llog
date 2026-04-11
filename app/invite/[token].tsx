import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { redeemInviteLink } from '@/mutations/redeem-invite-link';
import { switchTeam } from '@/mutations/switch-team';
import { useTeams } from '@/queries/use-teams';
import { alert } from '@/utilities/alert';
import { db } from '@/utilities/db';
import {
  PENDING_INVITE_AUTO_JOIN_KEY,
  PENDING_INVITE_KEY,
} from '@/utilities/invite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, WarningCircle } from 'phosphor-react-native';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

interface Member {
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
  reason?: string;
}

const renderLogNames = (names: string[]) =>
  names.map((name, i) => (
    <Fragment key={`${name}-${i}`}>
      {i > 0 ? (i === names.length - 1 ? ' and ' : ', ') : null}
      <Text className="font-medium text-foreground">{name}</Text>
    </Fragment>
  ));

export default function InviteLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const auth = db.useAuth();
  const { teams, isLoading: teamsLoading } = useTeams();
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [shouldResumeAcceptedInvite, setShouldResumeAcceptedInvite] =
    useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.EXPO_PUBLIC_API_URL}/teams/invite-links/${token}`)
      .then((res) => res.json())
      .then((data) => setLinkInfo(data))
      .catch(() => setLinkInfo({ isValid: false, reason: 'error' }))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    if (!token || !auth.user) {
      setShouldResumeAcceptedInvite(false);
      return;
    }

    AsyncStorage.getItem(PENDING_INVITE_AUTO_JOIN_KEY).then((pendingToken) => {
      if (!cancelled) {
        setShouldResumeAcceptedInvite(pendingToken === token);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [auth.user, token]);

  const handleJoin = useCallback(async () => {
    if (!token) return;
    setIsRedeeming(true);

    try {
      const { teamId } = await redeemInviteLink({ token });

      await AsyncStorage.multiRemove([
        PENDING_INVITE_KEY,
        PENDING_INVITE_AUTO_JOIN_KEY,
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

  const handleSignIn = useCallback(async () => {
    if (!token) return;

    await AsyncStorage.multiSet([
      [PENDING_INVITE_KEY, token],
      [PENDING_INVITE_AUTO_JOIN_KEY, token],
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

  useEffect(() => {
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
                className="items-center justify-center rounded-full border-2 border-background"
                style={[
                  { width: 68, height: 68 },
                  i > 0 ? { marginLeft: -22 } : undefined,
                ]}
              >
                <Avatar avatar={member.image} id={member.id} size={64} />
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
        <Text className="mt-2 text-center text-muted-foreground">
          {linkInfo?.isValid
            ? linkInfo.logNames && linkInfo.logNames.length > 0
              ? `You\u2019ve been invited to join the `
              : 'You\u2019ve been invited to join '
            : linkInfo?.reason === 'expired'
              ? 'This invite link has expired.'
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
                <Text className="font-medium text-foreground">
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
              <ActivityIndicator color="white" />
              <Text>Joining{'\u2026'}</Text>
            </>
          ) : linkInfo?.isValid ? (
            <>
              <Text>Let{'\u2019'}s go</Text>
              <Icon icon={ArrowRight} className="-mr-0.5 text-white" />
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
