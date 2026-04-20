import { DestructiveConfirmSheet } from '@/components/destructive-confirm-sheet';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteRecord } from '@/mutations/delete-record';
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
      onConfirm={async () => {
        setIsPending(true);
        const context = sheetManager.getContext('record-delete');
        const recordId = sheetManager.getId('record-delete')!;

        try {
          await deleteRecord({ id: recordId });
          sheetManager.close('record-delete');
          if (context === 'detail') router.back();
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
      onDismiss={() => sheetManager.close('record-delete')}
      open={open}
      portalName="record-delete"
      title="Delete record?"
    />
  );
};
