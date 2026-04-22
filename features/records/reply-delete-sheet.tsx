import { DestructiveConfirmSheet } from '@/features/common/destructive-confirm-sheet';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteReply } from '@/mutations/delete-reply';
import * as React from 'react';

export const ReplyDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('reply-delete');

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onConfirm={async () => {
        setIsPending(true);
        const replyId = sheetManager.getId('reply-delete')!;
        const recordId = sheetManager.getContext('reply-delete')!;

        try {
          await deleteReply({ id: replyId, recordId });
          sheetManager.close('reply-delete');
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
      onDismiss={() => sheetManager.close('reply-delete')}
      open={open}
      portalName="reply-delete"
      title="Delete reply?"
    />
  );
};
