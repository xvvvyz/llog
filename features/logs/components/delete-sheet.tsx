import { deleteLog } from '@/features/logs/mutations/delete-log';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { router } from 'expo-router';

export const LogDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-delete');

  const { isSubmitting: isPending, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('log-delete')}
      open={open}
      portalName="log-delete"
      title="Delete log?"
      onConfirm={async () => {
        await runSubmit(async ({ keepPendingUntilClose }) => {
          const logId = sheetManager.getId('log-delete')!;
          await deleteLog({ id: logId });
          sheetManager.close('log-delete');
          router.dismissTo('/');
          keepPendingUntilClose();
        });
      }}
    />
  );
};
