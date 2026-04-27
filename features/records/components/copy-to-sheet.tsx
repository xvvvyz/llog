import { copyRecord } from '@/features/records/mutations/copy-record';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { db } from '@/lib/db';
import { SPECTRUM } from '@/theme/spectrum';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const RecordCopyToSheet = () => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const recordId = sheetManager.getId('record-copy-to');
  const open = sheetManager.isOpen('record-copy-to');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  const { data: recordData, isLoading: recordLoading } = db.useQuery(
    open && recordId
      ? {
          records: {
            $: { where: { id: recordId } },
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const record = recordData?.records?.[0];
  const sourceLogId = record?.log?.id;
  const teamId = record?.teamId;

  const { data: logsData, isLoading: logsLoading } = db.useQuery(
    open && teamId
      ? { logs: { $: { order: { name: 'asc' }, where: { team: teamId } } } }
      : null
  );

  const logs = React.useMemo(
    () => (logsData?.logs ?? []).filter((log) => log.id !== sourceLogId),
    [logsData?.logs, sourceLogId]
  );

  React.useEffect(() => {
    if (!open) return;
    setIsSubmitting(false);
    setSelectedLogIds(new Set());
  }, [open, recordId]);

  const close = React.useCallback(() => {
    sheetManager.close('record-copy-to');
  }, [sheetManager]);

  const toggleLog = React.useCallback((logId: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);

      if (next.has(logId)) next.delete(logId);
      else next.add(logId);

      return next;
    });
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!recordId || selectedLogIds.size === 0) return;
    setIsSubmitting(true);

    try {
      await copyRecord({ id: recordId, logIds: [...selectedLogIds] });
      close();
    } catch (error) {
      setIsSubmitting(false);

      alert({
        message:
          error instanceof Error ? error.message : 'Failed to copy record',
        title: 'Error',
      });
    }
  }, [close, recordId, selectedLogIds]);

  return (
    <Sheet
      loading={open && (recordLoading || logsLoading)}
      onDismiss={close}
      open={open}
      portalName="record-copy-to"
    >
      <SheetListScrollView>
        {logs.map((log) => {
          const isSelected = selectedLogIds.has(log.id);
          const color = SPECTRUM[colorScheme][log.color ?? 11];

          return (
            <View
              key={log.id}
              className="flex-row py-2.5 items-center justify-between"
            >
              <View className="flex-row gap-3 items-center">
                <View
                  className="size-4 rounded-md"
                  style={{ backgroundColor: color.default }}
                />
                <Text numberOfLines={1}>{log.name}</Text>
              </View>
              <Checkbox
                checked={isSelected}
                className="size-8 border-0"
                onCheckedChange={() => toggleLog(log.id)}
              />
            </View>
          );
        })}
      </SheetListScrollView>
      <SheetFooter contentClassName="flex-row gap-4">
        <Button
          disabled={isSubmitting}
          onPress={close}
          size="sm"
          variant="secondary"
          wrapperClassName="flex-1"
        >
          <Text>Cancel</Text>
        </Button>
        <Button
          disabled={selectedLogIds.size === 0 || isSubmitting}
          onPress={handleSubmit}
          size="sm"
          wrapperClassName="flex-1"
        >
          {isSubmitting ? (
            <Spinner color={UI.light.contrastForeground} />
          ) : (
            <Text>Copy</Text>
          )}
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
