import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Role } from '@/enums/roles';
import { useOnboarding } from '@/hooks/use-onboarding';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const onboarding = useOnboarding();

  if (!onboarding.isLoading && !onboarding.requiresOnboarding) {
    return <Redirect href="/" />;
  }

  const trimmedName = name.trim();
  const isDisabled = !onboarding.auth.user || !trimmedName || isSubmitting;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    const roleId = id();
    const teamId = id();
    const userId = onboarding.auth.user!.id;

    await db.transact([
      db.tx.profiles[userId]
        .update({ name: trimmedName })
        .link({ user: userId }),
      db.tx.teams[teamId].update({ name: trimmedName }),
      db.tx.roles[roleId]
        .update({ role: Role.Owner })
        .link({ team: teamId, user: userId }),
      db.tx.ui[userId].update({}).link({ team: teamId, user: userId }),
    ]);
  };

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
      <Label nativeID="name">What is your name?</Label>
      <Input
        aria-labelledby="name"
        autoCapitalize="none"
        autoComplete="name"
        autoFocus
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
        placeholder="Jane Doe"
        returnKeyType="next"
        value={name}
      />
      <Button
        className="w-full"
        disabled={isDisabled}
        onPress={handleSubmit}
        wrapperClassName="mt-8"
      >
        <Text>Continue</Text>
      </Button>
    </View>
  );
}
