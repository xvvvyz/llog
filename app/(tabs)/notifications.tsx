import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

export default function Notifications() {
  return (
    <View className="flex-1 items-center justify-center gap-8 py-8">
      <Icon
        className="-mb-2 fill-primary text-primary"
        icon={Sparkles}
        size={64}
      />
      <Text className="text-center text-muted-foreground">
        Your inbox is empty.
      </Text>
    </View>
  );
}
