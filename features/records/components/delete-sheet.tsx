import { getLogHref } from '@/features/records/lib/route';
import * as outboxStore from '@/features/offline/outbox-store';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
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

        const isLocalPending =
          context === 'local' || context?.startsWith('local:');

        const routeContext = isLocalPending
          ? context === 'local'
            ? undefined
            : context?.slice('local:'.length)
          : context;

        try {
          if (isLocalPending) {
            await outboxStore.discardQueuedSubmission(`record:${recordId}`);
          } else {
            await deleteRecord({ id: recordId });
          }

          sheetManager.close('record-delete');

          if (routeContext?.startsWith('detail:')) {
            const logId = routeContext.slice('detail:'.length);

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
