import { createRecordCopyDraft } from '@/features/records/mutations/create-record-copy-draft';
import { useCopyTargets } from '@/features/records/queries/use-copy-targets';
import { useNameSearch } from '@/hooks/use-name-search';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
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
  const sheetManager = useSheetManager();
  const recordId = sheetManager.getId('record-copy-to');
  const open = sheetManager.isOpen('record-copy-to');
  const { isSubmitting, runSubmit } = useSheetSubmitState({ isOpen: open });
  const [query, setQuery] = React.useState('');

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  const copyTargets = useCopyTargets({ enabled: open && !!recordId });
  const visibleLogs = useNameSearch(copyTargets.logs, query);

  React.useEffect(() => {
    if (!open) return;
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

    await runSubmit(
      async () => {
        const draft = await createRecordCopyDraft({
          id: recordId,
          logIds: [...selectedLogIds],
        });

        if (!draft) return;

        sheetManager.open('record-create', draft.draftRecordId, 'copy', {
          logIds: draft.targetLogIds,
        });
      },
      { suppressError: true }
    );
  }, [recordId, runSubmit, selectedLogIds, sheetManager]);

  return (
    <Sheet
      onDismiss={close}
      open={open}
      portalName="record-copy-to"
      variant="list"
    >
      {(copyTargets.isLoading || !!visibleLogs.length) && (
        <SheetListScrollView loading={copyTargets.isLoading} variant="rows">
          {visibleLogs.map((log) => {
            const isSelected = selectedLogIds.has(log.id);

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
                    size={20}
                  />
                  <Text className="text-placeholder">/</Text>
                  <View
                    className={cn(
                      'size-4 border-continuous rounded-md shrink-0',
                      getSpectrumBackgroundClassName(log.color)
                    )}
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
      <SheetFooter contentClassName="flex-row gap-3">
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
