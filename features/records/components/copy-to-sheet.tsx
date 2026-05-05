import { createRecordCopyDraft } from '@/features/records/mutations/create-record-copy-draft';
import { useRecordCopyTargets } from '@/features/records/queries/use-record-copy-targets';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNameSearch } from '@/hooks/use-name-search';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { cn } from '@/lib/cn';
import { db } from '@/lib/db';
import { SPECTRUM } from '@/theme/spectrum';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { SearchInput } from '@/ui/search-input';
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
  const [query, setQuery] = React.useState('');

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

  const copyTargets = useRecordCopyTargets({
    enabled: open && !!sourceLogId,
    sourceLogId,
  });

  const visibleLogs = useNameSearch(copyTargets.logs, query);

  const visibleLogGroups = React.useMemo(() => {
    const visibleLogIds = new Set(visibleLogs.map((log) => log.id));

    return copyTargets.groups.flatMap((group) => {
      const logs = group.logs.filter((log) => visibleLogIds.has(log.id));
      return logs.length ? [{ ...group, logs }] : [];
    });
  }, [copyTargets.groups, visibleLogs]);

  const showTeamHeadings = visibleLogGroups.length > 1;

  React.useEffect(() => {
    if (!open) return;
    setIsSubmitting(false);
    setSelectedLogIds(new Set());
    setQuery('');
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
      const draft = await createRecordCopyDraft({
        id: recordId,
        logIds: [...selectedLogIds],
      });

      if (!draft) {
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);

      sheetManager.open('record-create', draft.draftRecordId, 'copy', {
        logIds: draft.targetLogIds,
      });
    } catch (error) {
      setIsSubmitting(false);

      alert({
        message:
          error instanceof Error ? error.message : 'Failed to copy record',
        title: 'Error',
      });
    }
  }, [recordId, selectedLogIds, sheetManager]);

  return (
    <Sheet
      loading={open && (recordLoading || copyTargets.isLoading)}
      onDismiss={close}
      open={open}
      portalName="record-copy-to"
      variant="list"
    >
      {!!visibleLogGroups.length && (
        <SheetListScrollView variant="rows">
          {visibleLogGroups.map((group, groupIndex) => (
            <React.Fragment key={group.id}>
              {showTeamHeadings && (
                <View
                  className={cn(
                    'flex-row items-center gap-3 mb-1',
                    groupIndex > 0 && 'pt-4'
                  )}
                >
                  <Text className="font-medium text-muted-foreground text-xs">
                    {group.name}
                  </Text>
                </View>
              )}
              {group.logs.map((log) => {
                const isSelected = selectedLogIds.has(log.id);
                const color = SPECTRUM[colorScheme][log.color ?? 11];

                return (
                  <View
                    key={log.id}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-row gap-3 items-center">
                      <View
                        className="size-4 border-continuous rounded-md"
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
            </React.Fragment>
          ))}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="flex-row gap-4">
        <SearchInput
          query={query}
          setQuery={setQuery}
          size="sm"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          disabled={selectedLogIds.size === 0 || isSubmitting}
          onPress={handleSubmit}
          size="sm"
          wrapperClassName="shrink-0"
        >
          {isSubmitting ? (
            <Spinner color={UI.light.contrastForeground} />
          ) : (
            <Text>Next</Text>
          )}
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
