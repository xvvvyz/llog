import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { onboardUser } from '@/mutations/onboard-user';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/ui/db';
import { Redirect } from 'expo-router';
import React, { useState, useTransition } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Onboarding() {
  const [isTransitioning, startTransition] = useTransition();
  const [rawName, setRawName] = useState('');
  const auth = db.useAuth();
  const profile = useProfile();

  if (!auth.isLoading && !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  if (profile.id) {
    return <Redirect href="/" />;
  }

  if (profile.isLoading) {
    return <Loading />;
  }

  const name = rawName.trim();
  const isDisabled = !name || isTransitioning;

  const handleSubmit = () =>
    startTransition(async () => {
      if (isDisabled) return;
      await onboardUser({ name });
    });

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
      <Label>What is your name?</Label>
      <Input
        autoComplete="name"
        autoFocus
        maxLength={32}
        onChangeText={setRawName}
        onSubmitEditing={handleSubmit}
        placeholder="Jane Doe"
        returnKeyType="next"
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
    </View>
  );
}
