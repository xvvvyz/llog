import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { alert } from '@/utilities/alert';
import { db } from '@/utilities/db';
import { Redirect, router } from 'expo-router';
import { useState, useTransition } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function SignIn() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [isTransitioning, startTransition] = useTransition();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const auth = db.useAuth();

  if (auth.user) {
    return <Redirect href="/" />;
  }

  if (auth.isLoading) {
    return <Loading />;
  }

  if (step === 'email') {
    const handleSubmit = () =>
      startTransition(async () => {
        if (!email) return;

        try {
          await db.auth.sendMagicCode({ email });
        } catch {
          alert({ message: 'Invalid email', title: 'Error' });
          return;
        }

        setStep('code');
      });

    return (
      <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
        <Label nativeID="email">Email address</Label>
        <Input
          aria-labelledby="email"
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
          disabled={isTransitioning}
          onPress={handleSubmit}
          wrapperClassName="mt-6"
        >
          {isTransitioning ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text>Sign in</Text>
          )}
        </Button>
      </View>
    );
  }

  const handleSubmit = () =>
    startTransition(async () => {
      if (!code) return;

      try {
        await db.auth.signInWithMagicCode({ email, code });
      } catch {
        alert({ message: 'Invalid code', title: 'Error' });
        return;
      }

      router.replace('/');
    });

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
      <Label nativeID="code">
        Enter the code sent to <Text className="font-medium">{email}</Text>
      </Label>
      <Input
        aria-labelledby="code"
        keyboardType="number-pad"
        onChangeText={setCode}
        onSubmitEditing={handleSubmit}
        placeholder="123456"
        value={code}
      />
      <Button
        className="w-full"
        disabled={isTransitioning}
        onPress={handleSubmit}
        wrapperClassName="mt-6"
      >
        {isTransitioning ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text>Confirm</Text>
        )}
      </Button>
    </View>
  );
}
