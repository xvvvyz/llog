import { Container } from '@/components/container';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { useOnboardingStep } from '@/lib/useOnboardingStep';
import { db } from '@/lib/utils';
import { id } from '@instantdb/react-native';
import { Redirect } from 'expo-router';
import * as React from 'react';

export default function OnboardingView() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [profileName, setProfileName] = React.useState('');
  const [teamName, setTeamName] = React.useState('');
  const auth = useAuth();
  const onboarding = useOnboardingStep({ userId: auth.user?.id });
  React.useEffect(() => setIsSubmitting(false), [onboarding.step]);
  if (auth.isLoading) return <Loading />;
  if (!auth.user) return <Redirect href="./sign-in" />;
  if (onboarding.isLoading) return <Loading />;

  return (
    <Container className="justify-center gap-4">
      {onboarding.step === 'create-profile' ? (
        <>
          <Label className="text-2xl" nativeID="name">
            What is your name?
          </Label>
          <Input
            aria-labelledby="name"
            autoCapitalize="none"
            autoComplete="name"
            className="w-full"
            onChangeText={setProfileName}
            placeholder="e.g. Jane Doe"
            value={profileName}
          />
          <Button
            className="w-full"
            disabled={!profileName || isSubmitting}
            onPress={async () => {
              setIsSubmitting(true);

              await db.transact(
                db.tx.profiles[auth.user!.id]
                  .update({ name: profileName })
                  .link({ user: auth.user!.id })
              );
            }}
          >
            <Text>Continue</Text>
          </Button>
        </>
      ) : onboarding.step === 'create-team' ? (
        <>
          <Label className="text-2xl" nativeID="team">
            Name your team
          </Label>
          <Input
            aria-labelledby="team"
            autoCapitalize="none"
            className="w-full"
            onChangeText={setTeamName}
            placeholder="e.g. Acme Inc."
            value={teamName}
          />
          <Button
            className="w-full"
            disabled={!teamName || isSubmitting}
            onPress={async () => {
              setIsSubmitting(true);
              const teamId = id();

              await db.transact([
                db.tx.teams[teamId].update({ name: teamName || 'Me' }),
                db.tx.ui[auth.user!.id]
                  .update({})
                  .link({ user: auth.user!.id })
                  .link({ team: teamId }),
                db.tx.roles[id()]
                  .update({ role: 'owner' })
                  .link({ team: teamId, user: auth.user!.id }),
              ]);
            }}
          >
            <Text>Continue</Text>
          </Button>
        </>
      ) : (
        <Redirect href="/" />
      )}
    </Container>
  );
}
