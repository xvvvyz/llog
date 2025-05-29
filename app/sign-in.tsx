import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { alert } from '@/utilities/alert';
import { db } from '@/utilities/db';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function SignIn() {
  const auth = db.useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');

  if (auth.user) {
    return <Redirect href="/" />;
  }

  if (step === 'email') {
    const handleSubmit = async () => {
      if (!email) return;

      try {
        await db.auth.sendMagicCode({ email });
      } catch {
        alert({ message: 'Invalid email', title: 'Error' });
        return;
      }

      setStep('code');
    };

    return (
      <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
        <Label nativeID="email">Email address</Label>
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
          onPress={handleSubmit}
          wrapperClassName="mt-8"
        >
          <Text>Sign in</Text>
        </Button>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!code) return;

    try {
      await db.auth.signInWithMagicCode({ email, code });
    } catch {
      alert({ message: 'Invalid code', title: 'Error' });
      return;
    }

    router.replace('/');
  };

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center p-6">
      <Label nativeID="code">
        Enter the code sent to <Text className="font-medium">{email}</Text>
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
      <Button className="w-full" onPress={handleSubmit} wrapperClassName="mt-8">
        <Text>Confirm</Text>
      </Button>
    </View>
  );
}
