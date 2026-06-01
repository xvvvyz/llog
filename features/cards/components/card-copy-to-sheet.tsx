import * as cardMutations from '@/features/cards/mutations/cards';
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

export const LogCardCopyToSheet = () => {
  const sheetManager = useSheetManager();
  const cardId = sheetManager.getId('log-card-copy-to');
  const sourceLogId = sheetManager.getContext('log-card-copy-to');
  const open = sheetManager.isOpen('log-card-copy-to');
  const { isSubmitting, runSubmit } = useSheetSubmitState({ isOpen: open });
  const [query, setQuery] = React.useState('');

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  const copyTargets = useCopyTargets({
    enabled: open && !!cardId,
    requireCanManage: true,
  });

  const targetLogs = React.useMemo(
    () => copyTargets.logs.filter((log) => log.id !== sourceLogId),
    [copyTargets.logs, sourceLogId]
  );

  const visibleLogs = useNameSearch(targetLogs, query);

  React.useEffect(() => {
    if (!open) return;
    setSelectedLogIds(new Set());
    setQuery('');
  }, [open, cardId]);

  const close = React.useCallback(() => {
    sheetManager.close('log-card-copy-to');
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
    if (!cardId || selectedLogIds.size === 0) return;

    await runSubmit(
      async ({ keepPendingUntilClose }) => {
        await cardMutations.copyCard({
          id: cardId,
          logIds: [...selectedLogIds],
        });

        close();
        keepPendingUntilClose();
      },
      { suppressError: true }
    );
  }, [cardId, close, runSubmit, selectedLogIds]);

  return (
    <Sheet
      onDismiss={close}
      open={open}
      portalName="log-card-copy-to"
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
                    size={19}
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
          {isSubmitting ? <Spinner /> : <Text>Copy</Text>}
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
