import { DestructiveConfirmSheet } from '@/components/destructive-confirm-sheet';
import { deleteLog } from '@/features/logs/mutations/delete-log';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { router } from 'expo-router';
import * as React from 'react';

export const LogDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-delete');

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('log-delete')}
      open={open}
      portalName="log-delete"
      title="Delete log?"
      onConfirm={async () => {
        setIsPending(true);
        const logId = sheetManager.getId('log-delete')!;

        try {
          await deleteLog({ id: logId });
          sheetManager.close('log-delete');
          router.dismissTo('/');
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
    />
  );
};
