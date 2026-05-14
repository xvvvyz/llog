import { DetailView } from '@/features/records/components/detail-view';
import { getLogHref } from '@/features/records/lib/route';
import { useRecord } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { NotFound } from '@/ui/not-found';
import { Sheet, SHEET_LAYERS } from '@/ui/sheet';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function RecordDetailRoute() {
  const params = useLocalSearchParams<{
    highlight?: string;
    recordId?: string;
    replyId?: string;
  }>();

  const highlight = getRouteParam(params.highlight);
  const routeRecordId = getRouteParam(params.recordId);
  const targetReplyId = getRouteParam(params.replyId);
  const record = useRecord({ id: routeRecordId });
  const { close, isOpen, open } = useSheetManager();

  const parentHref = React.useMemo(() => {
    if (!record.log?.id) return undefined;
    return getLogHref(record.log.id);
  }, [record.log?.id]);

  React.useEffect(() => {
    if (!routeRecordId) return;
    open('record-detail', routeRecordId);
    return () => close('record-detail');
  }, [close, open, routeRecordId]);

  const exitRoute = React.useCallback(() => {
    close('record-detail');

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(parentHref ?? '/');
  }, [close, parentHref]);

  const isNotFound = !routeRecordId || (!record.isLoading && !record.id);
  const sheetOpen = isOpen('record-detail');

  return (
    <Sheet
      layer={SHEET_LAYERS.route}
      loading={record.isLoading}
      onDismiss={exitRoute}
      open={sheetOpen}
      portalName="record-detail"
    >
      {isNotFound ? (
        <NotFound />
      ) : (
        !!record.id && (
          <DetailView
            highlightRecord={highlight === 'record'}
            onClose={exitRoute}
            pageClassName="max-h-full overflow-hidden bg-popover"
            record={record}
            recordId={routeRecordId ?? ''}
            targetReplyId={targetReplyId}
          />
        )
      )}
    </Sheet>
  );
}
