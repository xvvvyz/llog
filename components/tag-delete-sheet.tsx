import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteLogTag } from '@/mutations/delete-log-tag';
import { db } from '@/utilities/db';
import { BottomSheetView } from '@gorhom/bottom-sheet';

export const TagDeleteSheet = () => {
  const sheetManager = useSheetManager();

  const tagId = sheetManager.getId('tag-delete');

  const { data, isLoading } = db.useQuery(
    tagId ? { logTags: { $: { where: { id: tagId } } } } : null
  );

  const tag = data?.logTags?.[0];

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('tag-delete')}
      open={sheetManager.isOpen('tag-delete')}
      portalName="tag-delete"
    >
      <BottomSheetView className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Delete &ldquo;{tag?.name}&rdquo; tag?
        </Text>
        <Button
          onPress={() => {
            sheetManager.close('tag-delete');
            deleteLogTag({ id: tag?.id });
          }}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          <Text>Delete</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('tag-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </BottomSheetView>
    </Sheet>
  );
};
