import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Globe } from 'phosphor-react-native';
import { View } from 'react-native';

export const ListEmptyState = ({
  canManage,
  createDisabled,
  onCreateLog,
}: {
  canManage?: boolean;
  createDisabled?: boolean;
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
          <Button
            disabled={createDisabled}
            onPress={onCreateLog}
            wrapperClassName="mt-4"
          >
            <Text>New log</Text>
          </Button>
        </>
      )}
    </View>
  );
};
