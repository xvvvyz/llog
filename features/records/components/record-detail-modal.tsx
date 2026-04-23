import { RecordDetailView } from '@/features/records/components/record-detail-view';
import { Sheet } from '@/ui/sheet';
import { router } from 'expo-router';
import * as React from 'react';

export const RecordDetailModal = ({ recordId }: { recordId?: string }) => {
  const isOpen = !!recordId;

  const closeModal = React.useCallback(() => {
    router.setParams({ recordId: undefined });
  }, []);

  if (!recordId) return null;

  return (
    <Sheet
      className="min-h-0"
      fullHeight
      onDismiss={closeModal}
      open={isOpen}
      portalName="record-detail"
    >
      <RecordDetailView
        pageClassName="min-h-0 overflow-hidden bg-popover"
        recordId={recordId}
      />
    </Sheet>
  );
};
