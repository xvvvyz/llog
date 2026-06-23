import { getLogHref } from '@/features/records/lib/route';
import * as outboxStore from '@/features/offline/outbox-store';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import { router } from 'expo-router';

export const RecordDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('record-delete');
  const context = sheetManager.getContext('record-delete');
  const payload = sheetManager.getPayload('record-delete');

  const { isSubmitting: isPending, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  const isLocalPending =
    context === 'local' || context?.startsWith('local:') === true;

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('record-delete')}
      open={open}
      portalName="record-delete"
      title="Delete record?"
      onConfirm={async () => {
        await runSubmit(async ({ keepPendingUntilClose }) => {
          const recordId = sheetManager.getId('record-delete')!;

          const routeContext = isLocalPending
            ? context === 'local'
              ? undefined
              : context?.slice('local:'.length)
            : context;

          if (isLocalPending) {
            await outboxStore.discardQueuedSubmission(`record:${recordId}`);
          } else {
            await deleteRecord({ id: recordId, logId: payload?.logId });
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

          keepPendingUntilClose();
        });
      }}
    />
  );
};
