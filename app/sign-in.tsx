import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function SignIn() {
  const auth = db.useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  if (auth.user) {
    return <Redirect href="/" />;
  }

  if (step === 'email') {
    const isDisabled = !email || isSubmitting;

    const handleSubmit = async () => {
      if (isDisabled) return;
      setIsSubmitting(true);
      await db.auth.sendMagicCode({ email });
      setStep('code');
      setIsSubmitting(false);
    };

    return (
      <View className="mx-auto w-full max-w-sm flex-1 justify-center p-4">
        <Label nativeID="email">What is your email?</Label>
        <Input
          aria-labelledby="email"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={handleSubmit}
          placeholder="jane@acme.com"
          returnKeyType="next"
          value={email}
        />
        <Button
          className="w-full"
          disabled={isDisabled}
          onPress={handleSubmit}
          wrapperClassName="mt-8"
        >
          <Text>Send verification code</Text>
        </Button>
      </View>
    );
  }

  const isDisabled = !code || isSubmitting;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    await db.auth.signInWithMagicCode({ email, code });
    router.replace('/');
  };

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-4">
      <Label nativeID="code">
        Enter the code that was sent to{' '}
        <Text className="font-medium">{email}</Text>
      </Label>
      <Input
        aria-labelledby="code"
        autoComplete="off"
        autoFocus
        keyboardType="number-pad"
        onChangeText={setCode}
        onSubmitEditing={handleSubmit}
        placeholder="123456"
        value={code}
      />
      <Button
        className="w-full"
        disabled={isDisabled}
        onPress={handleSubmit}
        wrapperClassName="mt-8"
      >
        <Text>Sign in</Text>
      </Button>
    </View>
  );
}
