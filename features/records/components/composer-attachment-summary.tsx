import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Paperclip } from 'phosphor-react-native/lib/module/icons/Paperclip';
import { View } from 'react-native';

export const ComposerAttachmentSummary = ({ count }: { count: number }) => (
  <View className="h-8 flex-row items-center gap-2">
    <Icon className="text-muted-foreground" icon={Paperclip} size={18} />
    <Text className="text-muted-foreground text-sm" numberOfLines={1}>
      {count} attachment{count === 1 ? '' : 's'}
    </Text>
  </View>
);
