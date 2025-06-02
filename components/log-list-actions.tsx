import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { LogTag } from '@/instant.schema';
import { toggleUiLogTag } from '@/mutations/toggle-ui-log-tag';
import { updateUiLogsSort } from '@/mutations/update-ui-logs-sort';
import { useUi } from '@/queries/use-ui';
import { cn } from '@/utilities/cn';
import { View } from 'react-native';

import {
  BookA,
  Calendar,
  Filter,
  Palette,
  SortAsc,
  SortDesc,
  Tag,
} from 'lucide-react-native';

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
            <Button
              accessibilityLabel="Filter logs"
              className="md:size-10"
              size="icon"
              variant="secondary"
            >
              <Icon
                aria-hidden
                className="text-secondary-foreground"
                icon={Filter}
                size={20}
              />
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
                <Icon
                  aria-hidden
                  className="text-placeholder"
                  icon={Tag}
                  size={20}
                />
                <Text>{tag.name}</Text>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            accessibilityLabel="Sort logs"
            className="md:size-10"
            size="icon"
            variant="secondary"
          >
            <Icon
              aria-hidden
              className="text-secondary-foreground"
              icon={ui.logsSortDirection === 'asc' ? SortAsc : SortDesc}
              size={20}
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
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Calendar}
              size={20}
            />
            <Text>Created</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="name"
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={BookA}
              size={20}
            />
            <Text>Name</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort })}
            sortBy={ui.logsSortBy}
            sortDirection={ui.logsSortDirection}
            value="color"
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Palette}
              size={20}
            />
            <Text>Color</Text>
          </DropdownMenu.SortItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {/* <Button
        accessibilityLabel="Group logs"
        className="size-10"
        size="icon"
        variant="secondary"
      >
        <Icon
          aria-hidden
          className="text-secondary-foreground"
          icon={Group}
          size={20}
        />
      </Button> */}
    </View>
  );
};
