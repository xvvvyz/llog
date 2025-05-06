import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { View } from 'react-native';

export default function Home() {
  const auth = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold">Welcome, {auth.user?.email}!</Text>
    </View>
  );
}
