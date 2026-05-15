import { useSignInHref } from '@/features/account/lib/auth-redirect';
import { createTeam } from '@/features/teams/mutations/create';
import { useTeams } from '@/features/teams/queries/use-teams';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Field } from '@/ui/field';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Redirect } from 'expo-router';
import * as React from 'react';

export default function NewTeam() {
  const [isTransitioning, startTransition] = React.useTransition();
  const [rawName, setRawName] = React.useState('');
  const auth = db.useAuth();
  const signInHref = useSignInHref();
  const { teams, isLoading } = useTeams();
  if (!auth.isLoading && !auth.user) return <Redirect href={signInHref} />;
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
      <Field
        autoFocus
        label="Create a team"
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
        wrapperClassName="mt-4"
      >
        {isTransitioning ? <Spinner /> : <Text>Continue</Text>}
      </Button>
    </Page>
  );
}
