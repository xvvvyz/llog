import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { LogTag } from '@/instant.schema';
import { cn } from '@/utilities/cn';
import { Filter, SortAsc, SortDesc, Tag } from 'lucide-react-native';
import { View } from 'react-native';

export type SortBy = 'serverCreatedAt' | 'name' | 'color';

export const LogListActions = ({
  className,
  filteredTagIds,
  logTags,
  onSort,
  query,
  setQuery,
  sortBy,
  toggleTag,
}: {
  className?: string;
  filteredTagIds: Set<string>;
  logTags: LogTag[];
  onSort: (sort: [SortBy, DropdownMenu.SortDirection]) => void;
  query: string;
  setQuery: (query: string) => void;
  sortBy: [SortBy, DropdownMenu.SortDirection];
  toggleTag: (tagId: string) => void;
}) => {
  return (
    <View className={cn('flex-row gap-2', className)}>
      {!!logTags.length && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              accessibilityLabel="Filter logs"
              className="size-10"
              size="icon"
              variant="secondary"
            >
              <Icon
                aria-hidden
                className="text-secondary-foreground"
                icon={Filter}
                size={18}
              />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" className="mt-2">
            {logTags.map((tag) => (
              <DropdownMenu.CheckboxItem
                checked={filteredTagIds.has(tag.id)}
                key={tag.id}
                onCheckedChange={() => toggleTag(tag.id)}
              >
                <Icon
                  aria-hidden
                  className="text-placeholder"
                  icon={Tag}
                  size={18}
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
            className="size-10"
            size="icon"
            variant="secondary"
          >
            <Icon
              aria-hidden
              className="text-secondary-foreground"
              icon={sortBy[1] === 'asc' ? SortAsc : SortDesc}
              size={18}
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" className="mt-2">
          <DropdownMenu.SortItem<SortBy>
            currentSort={sortBy}
            onSort={onSort}
            value="serverCreatedAt"
          >
            <Text>Created</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            currentSort={sortBy}
            onSort={onSort}
            value="name"
          >
            <Text>Name</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            currentSort={sortBy}
            onSort={onSort}
            value="color"
          >
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
          size={18}
        />
      </Button> */}
      <SearchInput
        query={query}
        setQuery={setQuery}
        wrapperClassName="shrink w-full md:w-52 ml-1"
      />
    </View>
  );
};
