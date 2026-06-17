import { TagRow } from '@/features/tags/components/tag-row';
import type { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import type { Color } from '@/theme/spectrum';
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
import * as spectrumClassNames from '@/theme/spectrum-class-names';

export const TagSheetContent = ({
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
  tagInputAction,
  visibleTags,
}: {
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
  tagInputAction: 'add' | 'create' | null;
  visibleTags: Tag[];
}) => {
  const searchInputRef =
    React.useRef<React.ComponentRef<typeof SearchInput>>(null);

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
  const showCreateTag = tagInputAction === 'create';

  const showEmptyState =
    !isLoading && !rawQuery && !hasVisibleTags && !showCreateTag;

  const showScrollArea =
    isLoading || hasVisibleTags || showCreateTag || showEmptyState;

  const footerActionLabel =
    tagInputAction === 'create'
      ? 'Create'
      : tagInputAction === 'add'
        ? 'Add'
        : 'Done';

  const handleFooterAction = tagInputAction ? handleSubmitTag : onClose;

  return (
    <>
      {showScrollArea && (
        <SheetListScrollView
          ref={scrollViewRef}
          keyboardDismissMode="none"
          loading={isLoading}
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
                  className={cn(
                    'size-3.5 border-border-secondary border-continuous rounded-full border',
                    spectrumClassNames.getSpectrumBackgroundClassName(
                      defaultTagColor
                    )
                  )}
                />
              </View>
              <Text className="flex-1 text-left" numberOfLines={1}>
                Create tag &ldquo;{query}&rdquo;
              </Text>
              <View className="mr-1 h-8 w-8 items-center justify-center">
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
                  canSort={sortEnabled}
                  canToggle={canToggleTags}
                  color={tag.color}
                  id={tag.id}
                  isSelected={getSelected(tag.id)}
                  name={tag.name}
                  onCheckedChange={(selected) => {
                    onSelectTag(tag.id, selected);
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
      <SheetFooter contentClassName="flex-row gap-3">
        <SearchInput
          ref={searchInputRef}
          maxLength={16}
          onSubmitEditing={handleSubmitTag}
          placeholder={canManageDefinitions ? 'Type in a tag' : 'Search'}
          query={rawQuery}
          setQuery={setRawQuery}
          size="sm"
          submitBehavior="submit"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={handleFooterAction}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
          className={
            tagInputAction
              ? spectrumClassNames.getSpectrumBackgroundClassName(
                  defaultTagColor
                )
              : undefined
          }
          interactiveClassName={
            tagInputAction
              ? cn(
                  'active:opacity-90 web:hover:opacity-90',
                  spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
                    defaultTagColor
                  )
                )
              : undefined
          }
        >
          <Text className={cn(tagInputAction && 'text-white')}>
            {footerActionLabel}
          </Text>
        </Button>
      </SheetFooter>
    </>
  );
};
