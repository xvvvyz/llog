import { Inbox } from '@/components/icons/inbox';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export default function Notifications() {
  return (
    <View className="flex-1 items-center justify-center gap-6 py-8">
      <Inbox className="-mb-2 stroke-primary" size={64} />
      <Text className="text-center text-placeholder">Your inbox is empty.</Text>
    </View>
  );
}
