import { DetailView } from '@/features/records/components/detail-view';
import { getLogHref } from '@/features/records/lib/route';
import { useRecord } from '@/features/records/queries/use-record';
import { NotFound } from '@/ui/not-found';
import { Sheet, SHEET_LAYERS } from '@/ui/sheet';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function RecordDetailRoute() {
  const params = useLocalSearchParams<{ recordId?: string }>();
  const routeRecordId = getRouteParam(params.recordId);
  const record = useRecord({ id: routeRecordId });

  const parentHref = React.useMemo(() => {
    if (!record.log?.id) return undefined;
    return getLogHref(record.log.id);
  }, [record.log?.id]);

  const exitRoute = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(parentHref ?? '/');
  }, [parentHref]);

  const isNotFound = !routeRecordId || (!record.isLoading && !record.id);

  return (
    <Sheet
      layer={SHEET_LAYERS.route}
      loading={record.isLoading}
      onDismiss={exitRoute}
      open
      portalName="record-detail"
    >
      {isNotFound ? (
        <NotFound />
      ) : record.id ? (
        <DetailView
          onClose={exitRoute}
          pageClassName="flex-none max-h-full overflow-hidden bg-popover"
          record={record}
          recordId={routeRecordId ?? ''}
        />
      ) : null}
    </Sheet>
  );
}
