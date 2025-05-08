import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { Redirect, router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function SignIn() {
  const auth = useAuth();
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'code'>('email');

  if (auth.user) {
    return <Redirect href="/" />;
  }

  if (step === 'email') {
    return (
      <View className="flex-1 justify-center gap-4 p-6">
        <Label className="text-3xl" nativeID="email">
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
      </View>
    );
  }

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
        placeholder="e.g. 123456"
        value={code}
      />
      <Button
        className="w-full"
        disabled={auth.isLoading || !code}
        onPress={async () => {
          await auth.signInWithMagicCode(email, code);
          router.replace('/');
        }}
      >
        <Text>Sign in</Text>
      </Button>
    </View>
  );
}
