import { updateUiLogsSort } from '@/features/logs/mutations/update-ui-sort';
import { Tag } from '@/features/logs/types/tag';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/lib/cn';
import { useUi } from '@/queries/use-ui';
import { Button } from '@/ui/button';
import * as DropdownMenu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Text } from '@/ui/text';
import { View } from 'react-native';

import {
  Calendar,
  Funnel,
  Palette,
  SortAscending,
  SortDescending,
  TextAa,
} from 'phosphor-react-native';

export const LOG_SORT_VALUES = ['serverCreatedAt', 'name', 'color'] as const;
export type SortBy = (typeof LOG_SORT_VALUES)[number];

export const isSortBy = (value: unknown): value is SortBy =>
  typeof value === 'string' &&
  LOG_SORT_VALUES.some((sortValue) => sortValue === value);

export const ListActions = ({
  className,
  tags,
  query,
  selectedTagIds,
  setQuery,
  setSelectedTagIds,
}: {
  className?: string;
  tags: Tag[];
  query: string;
  selectedTagIds: string[];
  setQuery: (query: string) => void;
  setSelectedTagIds: (ids: string[]) => void;
}) => {
  const breakpoints = useBreakpoints();
  const ui = useUi();
  const tagIdSet = new Set(selectedTagIds);
  const hasFilters = selectedTagIds.length > 0;

  const toggleTagId = (id: string) => {
    setSelectedTagIds(
      tagIdSet.has(id)
        ? selectedTagIds.filter((t) => t !== id)
        : [...selectedTagIds, id]
    );
  };

  return (
    <View className={cn('flex-row gap-3', className)}>
      <SearchInput
        query={query}
        setQuery={setQuery}
        size={breakpoints.md ? 'sm' : 'default'}
        wrapperClassName="shrink w-full md:w-52"
      />
      {!!tags.length && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button className="md:size-10" size="icon" variant="secondary">
              <Icon className="text-secondary-foreground" icon={Funnel} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="min-w-44">
            <DropdownMenu.Label>Tags</DropdownMenu.Label>
            {tags.map((tag) => (
              <DropdownMenu.CheckboxItem
                key={tag.id}
                checked={tagIdSet.has(tag.id)}
                onCheckedChange={() => toggleTagId(tag.id)}
              >
                <Text>{tag.name}</Text>
              </DropdownMenu.CheckboxItem>
            ))}
            {hasFilters && (
              <>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onPress={() => setSelectedTagIds([])}>
                  <Text className="text-destructive">Clear filters</Text>
                </DropdownMenu.Item>
              </>
            )}
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
