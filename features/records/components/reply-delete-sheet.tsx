import * as outboxStore from '@/features/offline/outbox-store';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';

export const ReplyDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('reply-delete');
  const context = sheetManager.getContext('reply-delete');
  const isLocalPending = context?.startsWith('local:') === true;

  const { isSubmitting: isPending, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('reply-delete')}
      open={open}
      portalName="reply-delete"
      title="Delete reply?"
      onConfirm={async () => {
        await runSubmit(async ({ keepPendingUntilClose }) => {
          const replyId = sheetManager.getId('reply-delete')!;
          const context = sheetManager.getContext('reply-delete')!;

          const recordId = isLocalPending
            ? context.slice('local:'.length)
            : context;

          if (isLocalPending) {
            await outboxStore.discardQueuedSubmission(`reply:${replyId}`);
          } else {
            await deleteReply({ id: replyId, recordId });
          }

          sheetManager.close('reply-delete');
          keepPendingUntilClose();
        });
      }}
    />
  );
};
