import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

export default function Delete() {
  const searchParams = useLocalSearchParams<{ id: string }>();

  return (
    <Modal className="p-6" variant="alert">
      <Text className="text-3xl">Are you sure?</Text>
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
