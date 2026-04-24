import { RecordDetailView } from '@/features/records/components/record-detail-view';
import { getLogHref } from '@/features/records/lib/record-detail-route';
import { useRecord } from '@/features/records/queries/use-record';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

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
      className="min-h-0"
      fullHeight
      onDismiss={exitRoute}
      open
      portalName="record-detail"
    >
      {isNotFound ? (
        <View className="flex-1 p-6 gap-4 items-center justify-center">
          <Text className="text-center text-muted-foreground">
            Record not found.
          </Text>
          <Button onPress={exitRoute} size="sm" variant="secondary">
            <Text>Close</Text>
          </Button>
        </View>
      ) : (
        <RecordDetailView
          pageClassName="min-h-0 overflow-hidden bg-popover"
          record={record}
          recordId={routeRecordId ?? ''}
        />
      )}
    </Sheet>
  );
}
