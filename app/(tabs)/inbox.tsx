import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Inbox as InboxIcon } from 'lucide-react-native';
import { View } from 'react-native';

export default function Inbox() {
  return (
    <View className="flex-1 items-center justify-center gap-6 py-8">
      <Icon className="-mb-2 text-primary" icon={InboxIcon} size={64} />
      <Text className="text-center text-muted-foreground">
        Your inbox is empty.
      </Text>
    </View>
  );
}
