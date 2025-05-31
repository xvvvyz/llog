import { Button } from '@/components/ui/button';
import { Sheet, SheetView } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteLog } from '@/mutations/delete-log';
import { useLog } from '@/queries/use-log';
import { router } from 'expo-router';

export const LogDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const log = useLog({ id: sheetManager.getId('log-delete') });

  return (
    <Sheet
      loading={log.isLoading}
      onDismiss={() => sheetManager.close('log-delete')}
      open={sheetManager.isOpen('log-delete')}
      portalName="log-delete"
    >
      <SheetView className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Delete &quot;{log.name}&quot; log?
        </Text>
        <Button
          onPress={() => {
            sheetManager.close('log-delete');
            router.dismissTo('/');
            deleteLog({ id: log.id });
          }}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          <Text>Delete</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('log-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </SheetView>
    </Sheet>
  );
};
