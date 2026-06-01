import { deleteNote } from '@/features/logs/mutations/update-note';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';

export const LogNotesDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-notes-delete');
  const payload = sheetManager.getPayload('log-notes-delete');

  const { isSubmitting: isPending, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  const logId = sheetManager.getId('log-notes-delete');
  const noteId = payload?.noteId;
  const teamId = payload?.teamId;

  return (
    <DestructiveConfirmSheet
      isConfirmDisabled={!logId || !noteId || !teamId}
      isPending={isPending}
      onDismiss={() => sheetManager.close('log-notes-delete')}
      open={open}
      portalName="log-notes-delete"
      title="Delete notes?"
      onConfirm={async () => {
        if (!logId || !teamId) return;

        await runSubmit(async ({ keepPendingUntilClose }) => {
          await deleteNote({ logId, noteId, teamId });
          sheetManager.close('log-notes-delete');
          keepPendingUntilClose();
        });
      }}
    />
  );
};
