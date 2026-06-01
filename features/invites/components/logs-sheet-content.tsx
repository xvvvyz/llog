import type { Log } from '@/features/logs/types/log';
import { useNameSearch } from '@/hooks/use-name-search';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { SearchInput } from '@/ui/search-input';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { View } from 'react-native';

type InviteLog = Pick<Log, 'color' | 'id' | 'name'>;

export const LogsSheetContent = ({
  isSheetLoading,
  isLoading,
  logs,
  onConfirm,
  onToggleLog,
  query,
  selectedLogIds,
  setQuery,
}: {
  isSheetLoading?: boolean;
  isLoading: boolean;
  logs: InviteLog[];
  onConfirm: () => void;
  onToggleLog: (logId: string) => void;
  query: string;
  selectedLogIds: Set<string>;
  setQuery: (query: string) => void;
}) => {
  const visibleLogs = useNameSearch(logs, query);

  return (
    <>
      {(isSheetLoading || !!visibleLogs.length) && (
        <SheetListScrollView
          contentContainerClassName="max-w-md"
          loading={isSheetLoading}
          variant="rows"
        >
          {visibleLogs.map((log) => {
            const isSelected = selectedLogIds.has(log.id);

            return (
              <View
                key={log.id}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row gap-3 items-center">
                  <View
                    className={cn(
                      'size-4 border-continuous rounded-md',
                      getSpectrumBackgroundClassName(log.color)
                    )}
                  />
                  <Text numberOfLines={1}>{log.name}</Text>
                </View>
                <Checkbox
                  checked={isSelected}
                  className="size-8 border-0"
                  onCheckedChange={() => onToggleLog(log.id)}
                />
              </View>
            );
          })}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="max-w-md flex-row gap-3">
        <SearchInput
          query={query}
          setQuery={setQuery}
          size="sm"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          disabled={selectedLogIds.size === 0 || isLoading}
          onPress={onConfirm}
          size="sm"
          wrapperClassName="shrink-0"
        >
          {isLoading ? <Spinner /> : <Text>Next</Text>}
        </Button>
      </SheetFooter>
    </>
  );
};
