import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { createTeam } from '@/mutations/create-team';
import { useTeams } from '@/queries/use-teams';
import { db } from '@/utilities/db';
import { Redirect } from 'expo-router';
import { useState, useTransition } from 'react';
import { ActivityIndicator } from 'react-native';

export default function NewTeam() {
  const [isTransitioning, startTransition] = useTransition();
  const [rawName, setRawName] = useState('');
  const auth = db.useAuth();
  const { teams, isLoading } = useTeams();

  if (!auth.isLoading && !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  if (!isLoading && teams.length > 0) {
    return <Redirect href="/" />;
  }

  if (isLoading) {
    return <Loading />;
  }

  const name = rawName.trim();
  const isDisabled = !name || isTransitioning;

  const handleSubmit = () =>
    startTransition(async () => {
      if (isDisabled) return;
      await createTeam({ name });
    });

  return (
    <Page className="mx-auto w-full max-w-sm justify-center p-6">
      <Label>Create a team</Label>
      <Input
        autoFocus
        maxLength={32}
        onChangeText={setRawName}
        onSubmitEditing={handleSubmit}
        placeholder="Team name"
        returnKeyType="done"
        value={rawName}
      />
      <Button
        className="w-full"
        disabled={isDisabled}
        onPress={handleSubmit}
        wrapperClassName="mt-6"
      >
        {isTransitioning ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text>Continue</Text>
        )}
      </Button>
    </Page>
  );
}
