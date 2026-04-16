import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { updateUiLogsSort } from '@/mutations/update-ui-logs-sort';
import { useUi } from '@/queries/use-ui';
import { Tag } from '@/types/log-tag';
import { cn } from '@/utilities/cn';
import { Calendar } from 'phosphor-react-native/lib/module/icons/Calendar';
import { Funnel } from 'phosphor-react-native/lib/module/icons/Funnel';
import { Palette } from 'phosphor-react-native/lib/module/icons/Palette';
import { SortAscending } from 'phosphor-react-native/lib/module/icons/SortAscending';
import { SortDescending } from 'phosphor-react-native/lib/module/icons/SortDescending';
import { TextAa } from 'phosphor-react-native/lib/module/icons/TextAa';
import { View } from 'react-native';

export type SortBy = 'serverCreatedAt' | 'name' | 'color';

export const LogListActions = ({
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
                checked={tagIdSet.has(tag.id)}
                key={tag.id}
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
