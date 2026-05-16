import { createRecordCopyDraft } from '@/features/records/mutations/create-record-copy-draft';
import { useCopyTargets } from '@/features/records/queries/use-copy-targets';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNameSearch } from '@/hooks/use-name-search';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { SPECTRUM } from '@/theme/spectrum';
import { Avatar } from '@/ui/avatar';
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

  const copyTargets = useCopyTargets({ enabled: open && !!recordId });
  const visibleLogs = useNameSearch(copyTargets.logs, query);

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
    } catch {
      setIsSubmitting(false);
      // noop
    }
  }, [recordId, selectedLogIds, sheetManager]);

  return (
    <Sheet
      loading={open && copyTargets.isLoading}
      onDismiss={close}
      open={open}
      portalName="record-copy-to"
      variant="list"
    >
      {!!visibleLogs.length && (
        <SheetListScrollView variant="rows">
          {visibleLogs.map((log) => {
            const isSelected = selectedLogIds.has(log.id);
            const color = SPECTRUM[colorScheme][log.color ?? 11];

            return (
              <View
                key={log.id}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 flex-row min-w-0 gap-2 items-center">
                  <Avatar
                    avatar={log.team.image?.uri ?? undefined}
                    className="border-border-secondary border"
                    fallback="gradient"
                    id={log.team.id}
                    size={19}
                  />
                  <Text className="text-placeholder">/</Text>
                  <View
                    className="size-4 border-continuous rounded-md shrink-0"
                    style={{ backgroundColor: color.default }}
                  />
                  <Text className="flex-1 min-w-0" numberOfLines={1}>
                    {log.name}
                  </Text>
                </View>
                <Checkbox
                  checked={isSelected}
                  className="size-8 border-0 shrink-0"
                  onCheckedChange={() => toggleLog(log.id)}
                />
              </View>
            );
          })}
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
          {isSubmitting ? <Spinner /> : <Text>Next</Text>}
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
