import { deleteTag } from '@/features/logs/mutations/delete-log-tag';
import { useTag } from '@/features/logs/queries/use-log-tag';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const TagDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const logTag = useTag({ id: sheetManager.getId('tag-delete') });

  return (
    <Sheet
      loading={logTag.isLoading}
      onDismiss={() => sheetManager.close('tag-delete')}
      open={sheetManager.isOpen('tag-delete')}
      portalName="tag-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete tag?</Text>
        <Button
          onPress={() => {
            sheetManager.close('tag-delete');
            deleteTag({ id: logTag.id });
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
      </View>
    </Sheet>
  );
};
