import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Paperclip } from 'phosphor-react-native';
import { View } from 'react-native';

export const AttachmentSummary = ({ count }: { count: number }) => (
  <View className="flex-row h-8 gap-2 items-center">
    <Icon className="text-muted-foreground" icon={Paperclip} size={18} />
    <Text className="text-muted-foreground text-sm" numberOfLines={1}>
      {count} attachment{count === 1 ? '' : 's'}
    </Text>
  </View>
);
