import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { createLog } from '@/mutations/create-log';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { Globe } from 'phosphor-react-native/lib/module/icons/Globe';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { View } from 'react-native';

export const LogListEmptyState = ({ canManage }: { canManage?: boolean }) => {
  return (
    <View className="flex-1 items-center justify-center gap-8 px-3 py-8">
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
            <Icon icon={Plus} className="-ml-0.5 text-white" />
            <Text>New log</Text>
          </Button>
        </>
      )}
    </View>
  );
};
