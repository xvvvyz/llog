import { BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAutoDismissKeyboard } from '@/hooks/use-auto-dismiss-keyboard';
import { db } from '@/utilities/db';
import { BottomSheetView, useBottomSheet } from '@gorhom/bottom-sheet';
import { Fragment } from 'react';

export const TagDeleteForm = ({ tagId }: { tagId: string }) => {
  const bottomSheet = useBottomSheet();
  useAutoDismissKeyboard();

  const { data, isLoading } = db.useQuery({
    logTags: { $: { where: { id: tagId } } },
  });

  const tag = data?.logTags?.[0];

  return (
    <Fragment>
      {isLoading && <BottomSheetLoading />}
      <BottomSheetView className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Delete &ldquo;{tag?.name}&rdquo; tag?
        </Text>
        <Text className="mx-auto mt-5 max-w-xs text-center text-muted-foreground">
          This cannot be undone.
        </Text>
        <Button
          onPress={() => {
            if (!tag) return;
            db.transact(db.tx.logTags[tag.id].delete());
            bottomSheet.close();
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
    </Fragment>
  );
};
