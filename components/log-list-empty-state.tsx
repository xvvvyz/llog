import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { createLog } from '@/mutations/create-log';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { Globe, Plus } from 'lucide-react-native';
import { View } from 'react-native';

export const LogListEmptyState = () => {
  return (
    <View className="flex-1 items-center justify-center gap-8 py-8">
      <Icon className="-mb-2 text-primary" icon={Globe} size={64} />
      <Text className="text-center text-muted-foreground">
        Track anything in your world.
      </Text>
      <Button
        onPress={() => {
          const logId = id();
          createLog({ color: 11, id: logId, name: 'Log' });
          router.push(`/${logId}`);
        }}
      >
        <Icon icon={Plus} className="-ml-0.5 text-white" size={20} />
        <Text>New log</Text>
      </Button>
    </View>
  );
};
