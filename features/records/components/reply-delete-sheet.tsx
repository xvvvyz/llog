import * as outboxStore from '@/features/offline/outbox-store';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import * as React from 'react';

export const ReplyDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('reply-delete');
  const context = sheetManager.getContext('reply-delete');
  const isLocalPending = context?.startsWith('local:') === true;

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('reply-delete')}
      open={open}
      portalName="reply-delete"
      title="Delete reply?"
      onConfirm={async () => {
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
