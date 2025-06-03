import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteLogTag } from '@/mutations/delete-log-tag';
import { useLogTag } from '@/queries/use-log-tag';
import { View } from 'react-native';

export const TagDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const logTag = useLogTag({ id: sheetManager.getId('tag-delete') });

  return (
    <Sheet
      loading={logTag.isLoading}
      onDismiss={() => sheetManager.close('tag-delete')}
      open={sheetManager.isOpen('tag-delete')}
      portalName="tag-delete"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Delete &ldquo;{logTag.name}&rdquo; tag?
        </Text>
        <Button
          onPress={() => {
            sheetManager.close('tag-delete');
            deleteLogTag({ id: logTag.id });
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
