import { deleteTemplate } from '@/features/logs/mutations/delete-template';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { DestructiveConfirmSheet } from '@/ui/destructive-confirm-sheet';
import * as React from 'react';

export const LogTemplateDeleteSheet = () => {
  const [isPending, setIsPending] = React.useState(false);
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('log-template-delete');

  React.useEffect(() => {
    if (open) setIsPending(false);
  }, [open]);

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
        setIsPending(true);

        try {
          await deleteTemplate({ id: templateId });
          sheetManager.close('log-template-delete');
        } catch (error) {
          setIsPending(false);
          throw error;
        }
      }}
    />
  );
};
