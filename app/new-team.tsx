import { createTeam } from '@/features/teams/mutations/create-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { db } from '@/lib/db';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { Redirect } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

export default function NewTeam() {
  const [isTransitioning, startTransition] = React.useTransition();
  const [rawName, setRawName] = React.useState('');
  const auth = db.useAuth();
  const { teams, isLoading } = useTeams();
  if (!auth.isLoading && !auth.user) return <Redirect href="/sign-in" />;
  if (!isLoading && teams.length > 0) return <Redirect href="/" />;
  if (isLoading) return <Loading />;
  const name = rawName.trim();
  const isDisabled = !name || isTransitioning;

  const handleSubmit = () =>
    startTransition(async () => {
      if (isDisabled) return;
      await createTeam({ name });
    });

  return (
    <Page className="mx-auto max-w-sm w-full p-6 justify-center">
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
          <ActivityIndicator color={UI.light.contrastForeground} />
        ) : (
          <Text>Continue</Text>
        )}
      </Button>
    </Page>
  );
}
