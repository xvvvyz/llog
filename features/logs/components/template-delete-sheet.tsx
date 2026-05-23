import { deleteTemplate } from '@/features/logs/mutations/delete-template';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';

export const LogTemplateDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-template-delete');

  const { isSubmitting: isPending, runSubmit } = useSheetSubmitState({
    isOpen: open,
  });

  return (
    <DestructiveConfirmSheet
      isPending={isPending}
      onDismiss={() => sheetManager.close('log-template-delete')}
      open={open}
      portalName="log-template-delete"
      title="Delete template?"
      onConfirm={async () => {
        const templateId = sheetManager.getId('log-template-delete');
        if (!templateId) return;

        await runSubmit(async ({ keepPendingUntilClose }) => {
          await deleteTemplate({ id: templateId });
          sheetManager.close('log-template-delete');
          keepPendingUntilClose();
        });
      }}
    />
  );
};
