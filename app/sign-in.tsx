import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  if (auth.user) return <Redirect href="/" />;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      {step === 'email' ? (
        <>
          <Input
            autoCapitalize="none"
            className="w-full"
            placeholder="Enter your email"
            keyboardType="email-address"
            onChangeText={setEmail}
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
          <Input
            className="w-full"
            placeholder="Enter the code sent to your email"
            keyboardType="number-pad"
            onChangeText={setCode}
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
        </>
      )}
      {auth.error && <Text>{auth.error.message}</Text>}
    </View>
  );
}
