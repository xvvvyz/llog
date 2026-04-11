import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteLog } from '@/mutations/delete-log';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const LogDeleteSheet = () => {
  const [isPending, setIsPending] = useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-delete');

  useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('log-delete')}
      open={open}
      portalName="log-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete log?</Text>
        <Button
          disabled={isPending}
          onPress={async () => {
            setIsPending(true);
            await deleteLog({ id: sheetManager.getId('log-delete') });
            sheetManager.close('log-delete');
            router.dismissTo('/');
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
          onPress={() => sheetManager.close('log-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
