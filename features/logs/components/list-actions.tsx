import { useUi } from '@/features/account/queries/use-ui';
import { isDefaultLogsSort, type SortBy } from '@/features/logs/lib/sort';
import { updateUiLogsSort } from '@/features/logs/mutations/update-ui-sort';
import type { Tag } from '@/features/tags/types/tag';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as DropdownMenu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Text } from '@/ui/text';
import { View } from 'react-native';

import {
  Calendar,
  FunnelSimple,
  Palette,
  SortAscending,
  SortDescending,
  TextAa,
} from 'phosphor-react-native';

const activeIconClassName = (active: boolean) =>
  active ? 'text-primary' : 'text-secondary-foreground';

export const ListActions = ({
  className,
  query,
  setQuery,
  tags,
}: {
  className?: string;
  query: string;
  setQuery: (query: string) => void;
  tags: Tag[];
}) => {
  const breakpoints = useBreakpoints();
  const sheetManager = useSheetManager();
  const ui = useUi();
  const hasFilter = ui.logsFilterTagIds.length > 0;
  const hasSort = !isDefaultLogsSort(ui.logsSortBy, ui.logsSortDirection);

  return (
    <View className={cn('flex-row gap-3', className)}>
      <SearchInput
        query={query}
        setQuery={setQuery}
        size={breakpoints.md ? 'sm' : 'default'}
        wrapperClassName="shrink w-full md:w-52"
      />
      {tags.length > 0 && (
        <Button
          className="md:size-10"
          onPress={() => sheetManager.open('logs-filter')}
          size="icon"
          variant="secondary"
        >
          <Icon
            className={activeIconClassName(hasFilter)}
            icon={FunnelSimple}
          />
        </Button>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="md:size-10" size="icon" variant="secondary">
            <Icon
              className={activeIconClassName(hasSort)}
              icon={
                ui.logsSortDirection === 'asc' ? SortAscending : SortDescending
              }
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" className="min-w-44">
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort, uiId: ui.id })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="serverCreatedAt"
          >
            <Icon className="text-placeholder" icon={Calendar} />
            <Text>Created</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort, uiId: ui.id })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="name"
          >
            <Icon className="text-placeholder" icon={TextAa} />
            <Text>Name</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort, uiId: ui.id })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="color"
          >
            <Icon className="text-placeholder" icon={Palette} />
            <Text>Color</Text>
          </DropdownMenu.SortItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </View>
  );
};
