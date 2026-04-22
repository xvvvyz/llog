import { alert } from '@/lib/alert';
import { db } from '@/lib/db';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { Redirect, router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

export default function SignIn() {
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isTransitioning, startTransition] = React.useTransition();
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const auth = db.useAuth();
  if (auth.user) return <Redirect href="/" />;
  if (auth.isLoading) return <Loading />;

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
      <Page className="mx-auto w-full max-w-sm justify-center p-6">
        <Label>Email address</Label>
        <Input
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
            <ActivityIndicator color={UI.light.contrastForeground} />
          ) : (
            <Text>Sign in</Text>
          )}
        </Button>
      </Page>
    );
  }

  const handleSubmit = () =>
    startTransition(async () => {
      if (!code) return;

      try {
        await db.auth.signInWithMagicCode({ email, code: code.trim() });
      } catch {
        alert({ message: 'Invalid code', title: 'Error' });
        return;
      }

      router.replace('/');
    });

  return (
    <Page className="mx-auto w-full max-w-sm justify-center p-6">
      <Label>
        Enter the code sent to <Text className="font-medium">{email}</Text>
      </Label>
      <Input
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
          <ActivityIndicator color={UI.light.contrastForeground} />
        ) : (
          <Text>Confirm</Text>
        )}
      </Button>
    </Page>
  );
}
