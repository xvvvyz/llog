import { Button } from '@/components/ui/button';
import { Sheet, SheetView } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { deleteLog } from '@/mutations/delete-log';
import { db } from '@/utilities/db';
import { router } from 'expo-router';

export const LogDeleteSheet = () => {
  const sheetManager = useSheetManager();

  const logId = sheetManager.getId('log-delete');

  const { data, isLoading } = db.useQuery(
    logId ? { logs: { $: { where: { id: logId } } } } : null
  );

  const log = data?.logs?.[0];

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-delete')}
      open={sheetManager.isOpen('log-delete')}
      portalName="log-delete"
    >
      <SheetView className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Delete &quot;{log?.name}&quot; log?
        </Text>
        <Button
          onPress={() => {
            sheetManager.close('log-delete');
            router.dismissTo('/');
            deleteLog({ id: log?.id });
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
