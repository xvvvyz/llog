import { BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAutoDismissKeyboard } from '@/hooks/use-auto-dismiss-keyboard';
import { db } from '@/utilities/db';
import { BottomSheetView, useBottomSheet } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';

export const LogDeleteForm = ({ logId }: { logId: string }) => {
  const bottomSheet = useBottomSheet();
  useAutoDismissKeyboard();

  const { data, isLoading } = db.useQuery({
    logs: { $: { where: { id: logId } } },
  });

  const log = data?.logs?.[0];

  if (isLoading) {
    return <BottomSheetLoading />;
  }

  return (
    <BottomSheetView className="mx-auto w-full max-w-md p-8">
      <Text className="text-center text-2xl">
        Delete &quot;{log?.name}&quot; log?
      </Text>
      <Text className="mt-5 text-center text-muted-foreground">
        This cannot be undone.
      </Text>
      <Button
        onPress={() => {
          if (!log) return;
          db.transact(db.tx.logs[log.id].delete());
          bottomSheet.close();
          router.dismissTo('/');
        }}
        variant="destructive"
        wrapperClassName="mt-8"
      >
        <Text>Delete</Text>
      </Button>
      <Button
        onPress={() => bottomSheet.close()}
        variant="secondary"
        wrapperClassName="mt-4"
      >
        <Text>Cancel</Text>
      </Button>
    </BottomSheetView>
  );
};
