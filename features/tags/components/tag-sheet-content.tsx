import { TagRow } from '@/features/tags/components/tag-row';
import type { Tag } from '@/features/tags/types/tag';
import type { Color } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import { Plus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import Sortable, {
  type SortableGridDragEndParams,
} from 'react-native-sortables';

export const TagSheetContent = ({
  canCreateTag,
  canManageColor,
  canManageDefinitions = true,
  canToggleTags = true,
  colorFallback,
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
  colorFallback: Color;
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

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const focusSearchInput = React.useCallback(() => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const handleSubmitTag = React.useCallback(() => {
    onSubmitTag();
    focusSearchInput();
  }, [focusSearchInput, onSubmitTag]);

  const handleDragEnd = React.useCallback(
    (params: SortableGridDragEndParams<Tag>) => {
      onReorder(params.data);
    },
    [onReorder]
  );

  const hasVisibleTags = visibleTags.length > 0;
  const showScrollArea = hasVisibleTags || canCreateTag;

  return (
    <>
      {showScrollArea && (
        <SheetListScrollView
          ref={scrollViewRef}
          keyboardDismissMode="none"
          contentContainerClassName={
            hasVisibleTags ? 'gap-3 py-8' : 'gap-3 pt-8 pb-8'
          }
        >
          {!isLoading && hasVisibleTags && (
            <Sortable.Grid
              activeItemShadowOpacity={0}
              autoScrollActivationOffset={50}
              autoScrollDirection="vertical"
              columns={1}
              customHandle
              data={visibleTags}
              dragActivationDelay={0}
              itemEntering={null}
              itemExiting={null}
              itemsLayoutTransitionMode="reorder"
              onDragEnd={handleDragEnd}
              rowGap={12}
              scrollableRef={scrollViewRef}
              sortEnabled={sortEnabled}
              renderItem={({ item: tag }) => (
                <TagRow
                  canManageColor={canManageColor}
                  canManageDefinitions={canManageDefinitions}
                  canToggle={canToggleTags}
                  color={tag.color}
                  colorFallback={colorFallback}
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
          {canCreateTag && (
            <Button
              className="pl-0 pr-4 rounded-full gap-0 justify-start"
              onPress={handleSubmitTag}
              size="sm"
              variant="secondary"
              wrapperClassName="self-start rounded-full"
            >
              <View className="size-10 items-center justify-center">
                <Icon className="text-placeholder" icon={Plus} />
              </View>
              <Text numberOfLines={1}>Create tag &ldquo;{query}&rdquo;</Text>
            </Button>
          )}
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="flex-row gap-4">
        <SearchInput
          ref={searchInputRef}
          actionIcon={canCreateTag ? Plus : undefined}
          maxLength={16}
          onActionPress={canCreateTag ? handleSubmitTag : undefined}
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
