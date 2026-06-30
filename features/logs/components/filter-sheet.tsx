import { useUi } from '@/features/account/queries/use-ui';
import { useTags } from '@/features/tags/queries/use-tags';
import { useNameSearch } from '@/hooks/use-name-search';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { resolveSpectrumColor } from '@/theme/spectrum';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import { Check, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import * as updateUiFilter from '@/features/logs/mutations/update-ui-filter';

export const LogsFilterSheet = () => {
  const [query, setQuery] = React.useState('');
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('logs-filter');
  const ui = useUi();
  const tags = useTags({ enabled: open });

  React.useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const selectedIds = React.useMemo(
    () => new Set(ui.logsFilterTagIds),
    [ui.logsFilterTagIds]
  );

  const { getSelected, setSelected } = useOptimisticSelection({
    onChange: React.useCallback(
      async (tagId: string, selected: boolean) => {
        await updateUiFilter.toggleUiLogsFilterTag({
          selected,
          tagId,
          uiId: ui.id,
        });
      },
      [ui.id]
    ),
    scopeKey: ui.id,
    selectedIds,
  });

  const visibleTags = useNameSearch(tags.data, query);
  const sheetIsLoading = tags.isLoading;

  return (
    <Sheet
      onDismiss={() => sheetManager.close('logs-filter')}
      open={open}
      portalName="logs-filter"
      variant="list"
      width="narrow"
    >
      {sheetIsLoading || !!visibleTags.length ? (
        <SheetListScrollView loading={sheetIsLoading} variant="rows">
          {visibleTags.map((tag) => {
            const isSelected = getSelected(tag.id);
            const colorValue = resolveSpectrumColor(tag.color);

            return (
              <Button
                key={tag.id}
                className="h-10 pl-3 pr-1 rounded-full bg-input select-none gap-3 justify-between"
                onPress={() => setSelected(tag.id, !isSelected)}
                variant="secondary"
                wrapperClassName="rounded-full"
              >
                <View className="flex-1 flex-row min-w-0 gap-3 items-center">
                  <View
                    className={cn(
                      'size-3 rounded-full',
                      getSpectrumBackgroundClassName(colorValue)
                    )}
                  />
                  <Text className="text-foreground shrink" numberOfLines={1}>
                    {tag.name}
                  </Text>
                </View>
                <View
                  className={cn(
                    'size-8 items-center justify-center rounded-full',
                    isSelected && getSpectrumBackgroundClassName(colorValue)
                  )}
                >
                  <Icon
                    icon={isSelected ? Check : Plus}
                    size={18}
                    className={cn(
                      isSelected
                        ? 'text-primary-foreground'
                        : 'text-placeholder'
                    )}
                  />
                </View>
              </Button>
            );
          })}
        </SheetListScrollView>
      ) : (
        <View className="px-8 py-12 items-center justify-center">
          <Text className="text-center text-muted-foreground">
            {query ? 'No tags match.' : 'No tags yet.'}
          </Text>
        </View>
      )}
      <SheetFooter contentClassName="flex-row gap-3">
        <SearchInput
          query={query}
          setQuery={setQuery}
          size="sm"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={() => sheetManager.close('logs-filter')}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
        >
          <Text>Done</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
