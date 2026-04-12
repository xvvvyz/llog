import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteRecord } from '@/mutations/delete-record';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const RecordDeleteSheet = () => {
  const [isPending, setIsPending] = useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('record-delete');

  useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('record-delete')}
      open={open}
      portalName="record-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete record?</Text>
        <Button
          disabled={isPending}
          onPress={async () => {
            setIsPending(true);
            const context = sheetManager.getContext('record-delete');
            try {
              await deleteRecord({ id: sheetManager.getId('record-delete') });
              sheetManager.close('record-delete');
              if (context === 'detail') router.back();
            } catch (error) {
              setIsPending(false);
              throw error;
            }
          }}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text>Delete</Text>
          )}
        </Button>
        <Button
          disabled={isPending}
          onPress={() => sheetManager.close('record-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
