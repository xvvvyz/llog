import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { createLog } from '@/mutations/create-log';
import { router } from 'expo-router';
import { Globe, Plus } from 'lucide-react-native';
import { View } from 'react-native';

export const LogListEmptyState = () => {
  return (
    <View className="flex-1 items-center justify-center gap-6 py-8">
      <Icon aria-hidden className="-mb-2 text-primary" icon={Globe} size={64} />
      <Text className="text-center text-muted-foreground">
        Track anything in your world.
      </Text>
      <Button
        accessibilityHint="Opens a form to create your first log"
        accessibilityLabel="Create your first log"
        onPress={async () => router.push(`/${await createLog()}`)}
      >
        <Icon
          icon={Plus}
          className="-ml-0.5 text-white"
          size={20}
          aria-hidden
        />
        <Text>New log</Text>
      </Button>
    </View>
  );
};
