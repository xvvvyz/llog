import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { toggleUiLogTag } from '@/mutations/toggle-ui-log-tag';
import { updateUiLogsSort } from '@/mutations/update-ui-logs-sort';
import { useUi } from '@/queries/use-ui';
import { LogTag } from '@/types/log-tag';
import { cn } from '@/utilities/cn';
import { View } from 'react-native';

import {
  Calendar,
  Funnel,
  Palette,
  SortAscending,
  SortDescending,
  Tag,
  TextAa,
} from 'phosphor-react-native';

export type SortBy = 'serverCreatedAt' | 'name' | 'color';

export const LogListActions = ({
  className,
  logTags,
  query,
  setQuery,
}: {
  className?: string;
  logTags: LogTag[];
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
      {!!logTags.length && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button className="md:size-10" size="icon" variant="secondary">
              <Icon className="text-secondary-foreground" icon={Funnel} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="mt-3 min-w-44">
            {logTags.map((tag) => (
              <DropdownMenu.CheckboxItem
                checked={ui.logsFilterByTagIdsSet.has(tag.id)}
                key={tag.id}
                onCheckedChange={() =>
                  toggleUiLogTag({
                    isSelected: ui.logsFilterByTagIdsSet.has(tag.id),
                    tagId: tag.id,
                  })
                }
              >
                <Icon className="text-placeholder" icon={Tag} />
                <Text>{tag.name}</Text>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}
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
        <DropdownMenu.Content align="end" className="mt-3 min-w-44">
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="serverCreatedAt"
          >
            <Icon className="text-placeholder" icon={Calendar} />
            <Text>Created</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="name"
          >
            <Icon className="text-placeholder" icon={TextAa} />
            <Text>Name</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="color"
          >
            <Icon className="text-placeholder" icon={Palette} />
            <Text>Color</Text>
          </DropdownMenu.SortItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {/* <Button
        className="size-10"
        size="icon"
        variant="secondary"
      >
        <Icon
          className="text-secondary-foreground"
          icon={Group}
         
        />
      </Button> */}
    </View>
  );
};
