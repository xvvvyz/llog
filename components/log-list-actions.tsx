import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { LogTag } from '@/instant.schema';
import { toggleUiLogTag } from '@/mutations/toggle-ui-log-tag';
import { updateUiLogsSort } from '@/mutations/update-ui-logs-sort';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { View } from 'react-native';

import {
  Calendar,
  Filter,
  LetterText,
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
  selectedTagIds,
  setQuery,
  sortBy,
  sortDirection,
}: {
  className?: string;
  logTags: LogTag[];
  query: string;
  selectedTagIds: Set<string>;
  setQuery: (query: string) => void;
  sortBy: SortBy;
  sortDirection: DropdownMenu.SortDirection;
}) => {
  const { user } = db.useAuth();

  return (
    <View className={cn('flex-row gap-3', className)}>
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
          <DropdownMenu.Content align="start" className="mt-3 min-w-44">
            {logTags.map((tag) => (
              <DropdownMenu.CheckboxItem
                checked={selectedTagIds.has(tag.id)}
                key={tag.id}
                onCheckedChange={() =>
                  toggleUiLogTag({
                    isSelected: selectedTagIds.has(tag.id),
                    tagId: tag.id,
                    userId: user?.id,
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
              icon={sortDirection === 'asc' ? SortAsc : SortDesc}
              size={20}
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" className="mt-3 min-w-44">
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort, userId: user?.id })}
            sortBy={sortBy}
            sortDirection={sortDirection}
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
            onSort={(sort) => updateUiLogsSort({ sort, userId: user?.id })}
            sortBy={sortBy}
            sortDirection={sortDirection}
            value="name"
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={LetterText}
              size={20}
            />
            <Text>Name</Text>
          </DropdownMenu.SortItem>
          <DropdownMenu.SortItem<SortBy>
            onSort={(sort) => updateUiLogsSort({ sort, userId: user?.id })}
            sortBy={sortBy}
            sortDirection={sortDirection}
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
      <SearchInput
        query={query}
        setQuery={setQuery}
        wrapperClassName="shrink w-full md:w-52"
      />
    </View>
  );
};
