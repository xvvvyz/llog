import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Loading } from '@/components/loading';
import { Text } from '@/components/text';
import { ROLES } from '@/utilities/constants/roles';
import { db } from '@/utilities/db';
import { useOnboarding } from '@/utilities/hooks/use-onboarding';
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

  if (!onboarding.requiresOnboarding) {
    return <Redirect href="/" />;
  }

  const isDisabled = !onboarding.auth.user || !name || isSubmitting;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    const roleId = id();
    const teamId = id();
    const userId = onboarding.auth.user!.id;

    await db.transact([
      db.tx.profiles[userId].update({ name }).link({ user: userId }),
      db.tx.teams[teamId].update({ name }),
      db.tx.roles[roleId]
        .update({ role: ROLES.owner })
        .link({ team: teamId, user: userId }),
      db.tx.ui[userId].update({}).link({ team: teamId, user: userId }),
    ]);
  };

  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Label className="text-3xl" nativeID="name">
        What is your name?
      </Label>
      <Input
        aria-labelledby="name"
        autoCapitalize="none"
        autoComplete="name"
        autoFocus
        className="w-full"
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder="e.g. Jane Doe"
        returnKeyType="next"
        value={name}
      />
      <Button className="w-full" disabled={isDisabled} onPress={handleSubmit}>
        <Text>Continue</Text>
      </Button>
    </View>
  );
}
