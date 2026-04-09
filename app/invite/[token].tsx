import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { redeemInviteLink } from '@/mutations/redeem-invite-link';
import { switchTeam } from '@/mutations/switch-team';
import { alert } from '@/utilities/alert';
import { db } from '@/utilities/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const PENDING_INVITE_KEY = 'pendingInviteToken';

interface LinkInfo {
  isValid: boolean;
  teamName?: string;
  role?: string;
  logNames?: string[];
  reason?: string;
}

const formatLogNames = (names: string[]) => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};

export default function InviteLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const auth = db.useAuth();
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.EXPO_PUBLIC_API_URL}/teams/invite-links/${token}`)
      .then((res) => res.json())
      .then((data) => setLinkInfo(data))
      .catch(() => setLinkInfo({ isValid: false, reason: 'error' }))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleJoin = useCallback(async () => {
    if (!token) return;

    setIsRedeeming(true);

    try {
      const { teamId } = await redeemInviteLink({ token });
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
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
    await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
    router.replace('/sign-in');
  }, [token]);

  useEffect(() => {
    if (!isLoading && !auth.isLoading && linkInfo?.isValid && auth.user) {
      handleJoin();
    }
  }, [isLoading, auth.isLoading, linkInfo?.isValid, auth.user, handleJoin]);

  if (!token) {
    return <Redirect href="/" />;
  }

  if (isLoading || auth.isLoading || (auth.user && linkInfo?.isValid)) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  return (
    <Page className="items-center justify-center p-6">
      <View className="w-full max-w-xs items-center px-4">
        <Text className="text-center text-lg font-medium">
          {linkInfo?.isValid
            ? `Join ${linkInfo.teamName}`
            : 'Invalid invite link'}
        </Text>
        {linkInfo?.isValid ? (
          linkInfo.logNames &&
          linkInfo.logNames.length > 0 && (
            <Text className="mb-1.5 mt-5 text-center text-sm text-placeholder">
              You{'\u2019'}ve been invited to record in{' '}
              {formatLogNames(linkInfo.logNames)}.
            </Text>
          )
        ) : (
          <Text className="mb-1.5 mt-5 text-center text-sm text-placeholder">
            {linkInfo?.reason === 'expired'
              ? 'This invite link has expired.'
              : 'This invite link is no longer valid.'}
          </Text>
        )}
        <Button
          disabled={isRedeeming}
          onPress={
            linkInfo?.isValid
              ? auth.user
                ? handleJoin
                : handleSignIn
              : () => router.replace('/')
          }
          className="px-2.5"
          size="xs"
          wrapperClassName="mt-6"
        >
          {isRedeeming ? (
            <>
              <ActivityIndicator color="white" />
              <Text>Joining{'\u2026'}</Text>
            </>
          ) : (
            <Text>{linkInfo?.isValid ? 'Accept invitation' : 'Go home'}</Text>
          )}
        </Button>
      </View>
    </Page>
  );
}
