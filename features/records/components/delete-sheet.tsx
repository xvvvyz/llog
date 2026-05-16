import { getLogHref } from '@/features/records/lib/route';
import { useConnectivity } from '@/features/offline/connectivity';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
import * as outboxStore from '@/features/offline/outbox-store';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { router } from 'expo-router';
import * as React from 'react';

export const RecordDeleteSheet = () => {
  const connectivity = useConnectivity();
  const showOfflineUi = useShowOfflineUi();
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('record-delete');
  const context = sheetManager.getContext('record-delete');

  const isLocalPending =
    context === 'local' || context?.startsWith('local:') === true;

  const isConfirmDisabled = open && !isLocalPending && showOfflineUi;

  const isConfirmUnavailable =
    open && !isLocalPending && !connectivity.canRunNetworkActions;

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <DestructiveConfirmSheet
      isConfirmDisabled={isConfirmDisabled}
      isPending={isPending}
      onDismiss={() => sheetManager.close('record-delete')}
      open={open}
      portalName="record-delete"
      title="Delete record?"
      onConfirm={async () => {
        if (isConfirmUnavailable) return;
        setIsPending(true);
        const recordId = sheetManager.getId('record-delete')!;

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
