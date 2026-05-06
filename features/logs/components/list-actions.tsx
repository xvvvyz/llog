import { useUi } from '@/features/account/queries/use-ui';
import type { SortBy } from '@/features/logs/lib/sort';
import { updateUiLogsSort } from '@/features/logs/mutations/update-ui-sort';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import * as DropdownMenu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Text } from '@/ui/text';
import { View } from 'react-native';

import {
  Calendar,
  Palette,
  SortAscending,
  SortDescending,
  TextAa,
} from 'phosphor-react-native';

export const ListActions = ({
  className,
  query,
  setQuery,
}: {
  className?: string;
  query: string;
  setQuery: (query: string) => void;
}) => {
  const breakpoints = useBreakpoints();
  const ui = useUi();

  return (
    <View className={cn('flex-row gap-3', className)}>
      <SearchInput
        query={query}
        setQuery={setQuery}
        size={breakpoints.md ? 'sm' : 'default'}
        wrapperClassName="shrink w-full md:w-52"
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="md:size-10" size="icon" variant="secondary">
            <Icon
              className="text-secondary-foreground"
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
