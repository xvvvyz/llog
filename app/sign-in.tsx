import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { Redirect, router } from 'expo-router';
import * as React from 'react';

export default function SignInView() {
  const auth = useAuth();
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  if (auth.user) return <Redirect href="/" />;

  return (
    <Container className="justify-center gap-4">
      {step === 'email' ? (
        <>
          <Label className="text-2xl" nativeID="email">
            Enter your email
          </Label>
          <Input
            aria-labelledby="email"
            autoCapitalize="none"
            autoComplete="email"
            className="w-full"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="e.g. jane@acme.com"
            value={email}
          />
          <Button
            className="w-full"
            disabled={auth.isLoading || !email}
            onPress={async () => {
              await auth.sendMagicCode(email);
              setStep('code');
            }}
          >
            <Text>Send verification code</Text>
          </Button>
        </>
      ) : (
        <>
          <Label className="text-2xl" nativeID="code">
            Enter the code we sent you
          </Label>
          <Input
            aria-labelledby="code"
            autoComplete="off"
            className="w-full"
            keyboardType="number-pad"
            onChangeText={setCode}
            placeholder="e.g. 123456"
            value={code}
          />
          <Button
            className="w-full"
            disabled={auth.isLoading || !code}
            onPress={async () => {
              await auth.signInWithMagicCode(email, code);
              router.replace('/onboarding');
            }}
          >
            <Text>Sign in</Text>
          </Button>
        </>
      )}
      {auth.error && <Text>{auth.error.message}</Text>}
    </Container>
  );
}
