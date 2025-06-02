import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { onboardUser } from '@/mutations/onboard-user';
import { useOnboarding } from '@/queries/use-onboarding';
import { Redirect } from 'expo-router';
import React, { useState, useTransition } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Onboarding() {
  const [isTransitioning, startTransition] = useTransition();
  const [rawName, setRawName] = useState('');
  const onboarding = useOnboarding();

  if (!onboarding.isLoading && !onboarding.requiresOnboarding) {
    return <Redirect href="/" />;
  }

  const name = rawName.trim();
  const isDisabled = !name || isTransitioning;

  const handleSubmit = () =>
    startTransition(async () => {
      if (isDisabled) return;
      await onboardUser({ id: onboarding.auth.user?.id, name });
    });

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
      <Label nativeID="name">What is your name?</Label>
      <Input
        aria-labelledby="name"
        autoCapitalize="none"
        autoComplete="name"
        autoCorrect={false}
        autoFocus
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
