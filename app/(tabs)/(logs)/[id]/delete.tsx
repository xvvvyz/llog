import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { router, useLocalSearchParams } from 'expo-router';

export default function Delete() {
  const searchParams = useLocalSearchParams<{ id: string }>();

  return (
    <AlertDialog.Root>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Footer>
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
      </AlertDialog.Footer>
    </AlertDialog.Root>
  );
}
