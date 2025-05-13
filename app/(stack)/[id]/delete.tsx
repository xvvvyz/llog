import { Modal } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { db } from '@/utilities/db';
import { router, useLocalSearchParams } from 'expo-router';

export default function Delete() {
  const searchParams = useLocalSearchParams<{ id: string }>();

  return (
    <Modal className="p-6" onClose={router.back} variant="alert">
      <Text className="text-3xl">Are you sure?</Text>
      <View className="mt-5">
        <Text className="text-muted-foreground">
          Any existing log entries will be deleted.
        </Text>
      </View>
      <View className="mt-8 flex-row justify-end gap-4">
        <Button onPress={router.back} variant="secondary">
          <Text>Cancel</Text>
        </Button>
        <Button
          onPress={() => {
            db.transact(db.tx.logs[searchParams.id].delete());
            router.dismissTo('/');
          }}
          variant="destructive"
        >
          <Text>Delete</Text>
        </Button>
      </View>
    </Modal>
  );
}
