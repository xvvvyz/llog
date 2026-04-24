import { createLog } from '@/features/logs/mutations/create-log';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { Globe, Plus } from 'phosphor-react-native';
import { View } from 'react-native';

export const ListEmptyState = ({ canManage }: { canManage?: boolean }) => {
  return (
    <View className="flex-1 px-3 py-8 gap-8 items-center justify-center">
      <Icon className="text-primary" icon={Globe} size={64} />
      {canManage && (
        <>
          <Text className="text-center text-muted-foreground">
            Track anything in your world.
          </Text>
          <Button
            wrapperClassName="mt-4"
            onPress={() => {
              const logId = id();
              createLog({ color: 7, id: logId, name: 'Log' });
              router.push(`/${logId}`);
            }}
          >
            <Icon className="-ml-0.5 text-contrast-foreground" icon={Plus} />
            <Text>New log</Text>
          </Button>
        </>
      )}
    </View>
  );
};
