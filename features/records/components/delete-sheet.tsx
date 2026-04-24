import { DestructiveConfirmSheet } from '@/components/destructive-confirm-sheet';
import { getLogHref } from '@/features/records/lib/route';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { router } from 'expo-router';
import * as React from 'react';

export const RecordDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('record-delete');

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('record-delete')}
      open={open}
      portalName="record-delete"
      title="Delete record?"
      onConfirm={async () => {
        setIsPending(true);
        const context = sheetManager.getContext('record-delete');
        const recordId = sheetManager.getId('record-delete')!;

        try {
          await deleteRecord({ id: recordId });
          sheetManager.close('record-delete');

          if (context?.startsWith('detail:')) {
            const logId = context.slice('detail:'.length);

            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(logId ? getLogHref(logId) : '/');
            }
          }
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
    />
  );
};
