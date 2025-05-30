import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { onboardUser } from '@/mutations/onboard-user';
import { useOnboarding } from '@/queries/use-onboarding';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rawName, setRawName] = useState('');
  const onboarding = useOnboarding();

  if (!onboarding.isLoading && !onboarding.requiresOnboarding) {
    return <Redirect href="/" />;
  }

  const name = rawName.trim();
  const isDisabled = !name || isSubmitting;

  const handleSubmit = () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    onboardUser({ id: onboarding.auth.user?.id, name });
  };

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
        <Text>Continue</Text>
      </Button>
    </View>
  );
}
