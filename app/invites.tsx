import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { acceptInvite } from '@/mutations/accept-invite';
import { declineInvite } from '@/mutations/decline-invite';
import { switchTeam } from '@/mutations/switch-team';
import { useMyInvites } from '@/queries/use-my-invites';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/db';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Invites() {
  const auth = db.useAuth();
  const profile = useProfile();
  const { invites, isLoading, refetch } = useMyInvites();
  const [loadingAction, setLoadingAction] = useState<
    'accept' | 'decline' | null
  >(null);

  if (!auth.isLoading && !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  if (!profile.isLoading && !profile.id) {
    return <Redirect href="/onboarding" />;
  }

  if (isLoading || profile.isLoading) {
    return <Loading />;
  }

  if (!invites.length) {
    return <Redirect href="/" />;
  }

  const invite = invites[0];

  const handleAccept = async () => {
    setLoadingAction('accept');

    try {
      const result = await acceptInvite({ id: invite.id });
      if (result?.teamId) await switchTeam({ teamId: result.teamId });
      await refetch();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    setLoadingAction('decline');

    try {
      await declineInvite({ id: invite.id });
      await refetch();
    } finally {
      setLoadingAction(null);
    }
  };

  const isDisabled = loadingAction !== null;

  return (
    <Page className="mx-auto w-full max-w-sm justify-center p-6">
      <View className="gap-3">
        <Button disabled={isDisabled} onPress={handleAccept}>
          {loadingAction === 'accept' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text>Join &ldquo;{invite.team?.name}&rdquo;</Text>
          )}
        </Button>
        <Button
          disabled={isDisabled}
          onPress={handleDecline}
          variant="secondary"
        >
          {loadingAction === 'decline' ? (
            <ActivityIndicator />
          ) : (
            <Text>Decline invitation</Text>
          )}
        </Button>
      </View>
      {invites.length > 1 ? (
        <Text className="mt-6 text-center text-sm text-secondary-foreground">
          {invites.length - 1} more invite{invites.length > 2 ? 's' : ''}{' '}
          remaining
        </Text>
      ) : null}
    </Page>
  );
}
