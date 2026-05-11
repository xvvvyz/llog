import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Globe, Plus } from 'phosphor-react-native';
import { View } from 'react-native';

export const ListEmptyState = ({
  canManage,
  onCreateLog,
}: {
  canManage?: boolean;
  onCreateLog: () => void;
}) => {
  return (
    <View className="flex-1 px-3 py-8 gap-8 items-center justify-center">
      <Icon className="text-primary" icon={Globe} size={64} />
      {canManage && (
        <>
          <Text className="text-center text-muted-foreground">
            Track anything in your world.
          </Text>
          <Button onPress={onCreateLog} wrapperClassName="mt-4">
            <Icon className="-ml-0.5" icon={Plus} />
            <Text>New log</Text>
          </Button>
        </>
      )}
    </View>
  );
};
