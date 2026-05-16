import { useConnectivity } from '@/features/offline/connectivity';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
import * as outboxStore from '@/features/offline/outbox-store';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import * as React from 'react';

export const ReplyDeleteSheet = () => {
  const connectivity = useConnectivity();
  const showOfflineUi = useShowOfflineUi();
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('reply-delete');
  const context = sheetManager.getContext('reply-delete');
  const isLocalPending = context?.startsWith('local:') === true;
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
      onDismiss={() => sheetManager.close('reply-delete')}
      open={open}
      portalName="reply-delete"
      title="Delete reply?"
      onConfirm={async () => {
        if (isConfirmUnavailable) return;
        setIsPending(true);
        const replyId = sheetManager.getId('reply-delete')!;
        const context = sheetManager.getContext('reply-delete')!;

        const recordId = isLocalPending
          ? context.slice('local:'.length)
          : context;

        try {
          if (isLocalPending) {
            await outboxStore.discardQueuedSubmission(`reply:${replyId}`);
          } else {
            await deleteReply({ id: replyId, recordId });
          }

          sheetManager.close('reply-delete');
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
    />
  );
};
