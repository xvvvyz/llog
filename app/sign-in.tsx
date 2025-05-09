import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { db } from '@/lib/utils';
import { Redirect, router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function SignIn() {
  const auth = db.useAuth();
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<'email' | 'code'>('email');

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
      <View className="flex-1 justify-center gap-4 p-6">
        <Label className="text-3xl" nativeID="email">
          What is your email?
        </Label>
        <Input
          aria-labelledby="email"
          autoCapitalize="none"
          autoComplete="email"
          className="w-full"
          keyboardType="email-address"
          onChangeText={setEmail}
          onSubmitEditing={handleSubmit}
          placeholder="e.g. jane@acme.com"
          value={email}
        />
        <Button className="w-full" disabled={isDisabled} onPress={handleSubmit}>
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
    <View className="flex-1 justify-center gap-4 p-6">
      <Label className="text-3xl" nativeID="code">
        Check your email for a verification code
      </Label>
      <Input
        aria-labelledby="code"
        autoComplete="off"
        className="w-full"
        keyboardType="number-pad"
        onChangeText={setCode}
        onSubmitEditing={handleSubmit}
        placeholder="e.g. 123456"
        value={code}
      />
      <Button className="w-full" disabled={isDisabled} onPress={handleSubmit}>
        <Text>Sign in</Text>
      </Button>
    </View>
  );
}
