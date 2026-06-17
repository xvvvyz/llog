import { DetailView } from '@/features/records/components/detail-view';
import { getLogHref } from '@/features/records/lib/route';
import { useRecord } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { NotFound } from '@/ui/not-found';
import { Button } from '@/ui/button';
import { useRegisterRouteSheetHost } from '@/ui/route-sheet-host';
import { Sheet, SHEET_LAYERS } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import { PortalHost } from '@rn-primitives/portal';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const RECORD_DETAIL_PORTAL_HOST = 'record-detail-route';

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
  useRegisterRouteSheetHost(RECORD_DETAIL_PORTAL_HOST);

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
    <View className="absolute inset-0" pointerEvents="box-none">
      <Sheet
        layer={SHEET_LAYERS.route}
        onDismiss={exitRoute}
        open={sheetOpen}
        portalHostName={RECORD_DETAIL_PORTAL_HOST}
        portalName="record-detail"
      >
        {record.isLoading ? (
          <>
            <SheetListScrollView
              className="max-h-none md:max-h-none"
              contentContainerClassName="mx-auto w-full max-w-lg"
              loading
            />
            <SheetFooter>
              <Button onPress={exitRoute} size="sm" variant="secondary">
                <Text>Close</Text>
              </Button>
            </SheetFooter>
          </>
        ) : isNotFound ? (
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
      <PortalHost name={RECORD_DETAIL_PORTAL_HOST} />
    </View>
  );
}
