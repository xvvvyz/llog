import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteComment } from '@/mutations/delete-comment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const CommentDeleteSheet = () => {
  const [isPending, setIsPending] = useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('comment-delete');

  useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <Sheet
      onDismiss={() => sheetManager.close('comment-delete')}
      open={open}
      portalName="comment-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete reply?</Text>
        <Button
          disabled={isPending}
          onPress={async () => {
            setIsPending(true);

            try {
              await deleteComment({
                id: sheetManager.getId('comment-delete'),
                recordId: sheetManager.getContext('comment-delete'),
              });

              sheetManager.close('comment-delete');
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
          onPress={() => sheetManager.close('comment-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
