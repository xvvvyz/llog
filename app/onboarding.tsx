import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useOnboarding } from '@/lib/useOnboarding';
import { db } from '@/lib/utils';
import { id } from '@instantdb/react-native';
import { Redirect } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const onboarding = useOnboarding();

  if (onboarding.isLoading) {
    return <Loading />;
  }

  if (onboarding.requiresAuth) {
    return <Redirect href="./sign-in" />;
  }

  if (onboarding.requiresOnboarding) {
    return (
      <View className="flex-1 justify-center gap-4 p-6">
        <Label className="text-3xl" nativeID="name">
          What is your name?
        </Label>
        <Input
          aria-labelledby="name"
          autoCapitalize="none"
          autoComplete="name"
          className="w-full"
          onChangeText={setName}
          placeholder="e.g. Jane Doe"
          value={name}
        />
        <Button
          className="w-full"
          disabled={!name || isSubmitting}
          onPress={async () => {
            if (!onboarding.auth.user) return;
            setIsSubmitting(true);
            const roleId = id();
            const subjectId = id();
            const teamId = id();
            const userId = onboarding.auth.user.id;

            await db.transact([
              db.tx.profiles[userId].update({ name }).link({ user: userId }),
              db.tx.teams[teamId].update({ name }),
              db.tx.roles[roleId]
                .update({ role: 'owner' })
                .link({ team: teamId, user: userId }),
              db.tx.ui[userId]
                .update({})
                .link({ user: userId })
                .link({ team: teamId }),
              db.tx.subjects[subjectId]
                .update({ name: 'Journal' })
                .link({ team: teamId }),
            ]);
          }}
        >
          <Text>Continue</Text>
        </Button>
      </View>
    );
  }

  return <Redirect href="/" />;
}
