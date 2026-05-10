import { TagRow } from '@/features/tags/components/tag-row';
import type { Tag } from '@/features/tags/types/tag';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SPECTRUM, type Color } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import * as Sortable from '@/ui/sortable';
import { Text } from '@/ui/text';
import { Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

export const TagSheetContent = ({
  canCreateTag,
  canManageColor,
  canManageDefinitions = true,
  canToggleTags = true,
  defaultTagColor,
  emptyStateText,
  getSelected,
  isLoading,
  onClose,
  onColorChange,
  onReorder,
  onSelectTag,
  onSubmitTag,
  query,
  rawQuery,
  setRawQuery,
  sortEnabled,
  visibleTags,
}: {
  canCreateTag: boolean;
  canManageColor?: boolean;
  canManageDefinitions?: boolean;
  canToggleTags?: boolean;
  defaultTagColor: Color;
  emptyStateText?: string;
  getSelected: (tagId: string) => boolean;
  isLoading: boolean;
  onClose: () => void;
  onColorChange?: (tagId: string, color: Color) => void;
  onReorder: (tags: Tag[]) => void;
  onSelectTag: (tagId: string, selected: boolean) => void;
  onSubmitTag: () => void;
  query: string;
  rawQuery: string;
  setRawQuery: (query: string) => void;
  sortEnabled: boolean;
  visibleTags: Tag[];
}) => {
  const searchInputRef =
    React.useRef<React.ComponentRef<typeof SearchInput>>(null);

  const colorScheme = useColorScheme();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const focusSearchInput = React.useCallback(() => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const handleSubmitTag = React.useCallback(() => {
    onSubmitTag();
    focusSearchInput();
  }, [focusSearchInput, onSubmitTag]);

  const handleDragEnd = React.useCallback(
    (params: Sortable.SortableGridDragEndParams<Tag>) => {
      onReorder(params.data);
    },
    [onReorder]
  );

  const hasVisibleTags = visibleTags.length > 0;
  const showCreateTag = canCreateTag && !hasVisibleTags;

  const showEmptyState =
    !isLoading && !rawQuery && !hasVisibleTags && !showCreateTag;

  const showScrollArea = hasVisibleTags || showCreateTag || showEmptyState;
  const defaultTagColorValue = SPECTRUM[colorScheme][defaultTagColor].default;

  return (
    <>
      {showScrollArea && (
        <SheetListScrollView
          ref={scrollViewRef}
          keyboardDismissMode="none"
          variant="rows"
        >
          {showCreateTag && (
            <Button
              className="w-full pl-0 pr-0 rounded-full gap-0 justify-between"
              onPress={handleSubmitTag}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full rounded-full"
            >
              <View className="h-10 w-10 items-center justify-center">
                <View
                  className="size-3.5 border-border-secondary border-continuous rounded-full border"
                  style={{ backgroundColor: defaultTagColorValue }}
                />
              </View>
              <Text className="flex-1 text-left" numberOfLines={1}>
                Create tag &ldquo;{query}&rdquo;
              </Text>
              <View className="size-10 items-center justify-center">
                <Icon className="text-placeholder" icon={Plus} />
              </View>
            </Button>
          )}
          {!isLoading && hasVisibleTags && (
            <Sortable.SortableGrid
              autoScrollDirection="vertical"
              columns={1}
              data={visibleTags}
              onDragEnd={handleDragEnd}
              rowGap={8}
              scrollableRef={scrollViewRef}
              sortEnabled={sortEnabled}
              renderItem={({ item: tag }) => (
                <TagRow
                  canManageColor={canManageColor}
                  canManageDefinitions={canManageDefinitions}
                  canToggle={canToggleTags}
                  color={tag.color}
                  id={tag.id}
                  isSelected={getSelected(tag.id)}
                  name={tag.name}
                  onCheckedChange={(selected) => {
                    onSelectTag(tag.id, selected);
                    focusSearchInput();
                  }}
                  onColorChange={
                    onColorChange
                      ? (color) => onColorChange(tag.id, color)
                      : undefined
                  }
                />
              )}
            />
          )}
          {showEmptyState && !!emptyStateText && (
            <Text className="mx-auto max-w-56 text-center text-muted-foreground md:py-6">
              {emptyStateText}
            </Text>
          )}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="flex-row gap-4">
        <SearchInput
          ref={searchInputRef}
          actionIcon={showCreateTag ? Plus : undefined}
          maxLength={16}
          onActionPress={showCreateTag ? handleSubmitTag : undefined}
          onSubmitEditing={handleSubmitTag}
          placeholder={canManageDefinitions ? 'Type in a tag' : 'Search'}
          query={rawQuery}
          setQuery={setRawQuery}
          size="sm"
          submitBehavior="submit"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={onClose}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
        >
          <Text>Done</Text>
        </Button>
      </SheetFooter>
    </>
  );
};
