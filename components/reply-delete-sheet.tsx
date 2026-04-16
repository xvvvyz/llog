import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteReply } from '@/mutations/delete-reply';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export const ReplyDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('reply-delete');

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('reply-delete')}
      open={open}
      portalName="reply-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete reply?</Text>
        <Button
          disabled={isPending}
          onPress={async () => {
            setIsPending(true);

            try {
              await deleteReply({
                id: sheetManager.getId('reply-delete'),
                recordId: sheetManager.getContext('reply-delete'),
              });

              sheetManager.close('reply-delete');
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
          onPress={() => sheetManager.close('reply-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
