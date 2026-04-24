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
      <View className="mx-auto max-w-md w-full p-8">
        <Text className="text-2xl text-center">Delete tag?</Text>
        <Button
          variant="destructive"
          wrapperClassName="mt-12"
          onPress={() => {
            sheetManager.close('tag-delete');
            deleteTag({ id: logTag.id });
          }}
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
