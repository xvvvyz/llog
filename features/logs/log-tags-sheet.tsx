import { LogTagsSheetTag } from '@/features/logs/log-tags-sheet-tag';
import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { addTagToLog } from '@/mutations/add-log-tag-to-log';
import { createTag } from '@/mutations/create-log-tag';
import { reorderTags } from '@/mutations/reorder-log-tags';
import { useHasNoTags } from '@/queries/use-has-no-log-tags';
import { useLog } from '@/queries/use-log';
import { useTags } from '@/queries/use-log-tags';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { Tag } from 'phosphor-react-native/lib/module/icons/Tag';
import * as React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

export const LogTagsSheet = () => {
  const [rawQuery, setRawQuery] = React.useState('');
  const isEmpty = useHasNoTags();

  const searchInputRef =
    React.useRef<React.ComponentRef<typeof SearchInput>>(null);

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const sheetManager = useSheetManager();

  const query = React.useMemo(() => rawQuery?.trim(), [rawQuery]);

  const log = useLog({ id: sheetManager.getId('log-tags') });
  const logColor = useLogColor({ id: log.id });
  const tags = useTags({ query });

  const isLoading = log.isLoading || (!query && tags.isLoading);

  const handleCreateTag = React.useCallback(() => {
    if (!query) return;

    if (tags.queryExistingTagId) {
      addTagToLog({
        logId: log.id,
        tagId: tags.queryExistingTagId,
      });
    } else {
      createTag({
        logId: log.id,
        name: query,
      });
    }

    setRawQuery('');
  }, [query, log.id, tags.queryExistingTagId]);

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-tags')}
      open={sheetManager.isOpen('log-tags')}
      portalName="log-tags"
    >
      <ScrollView
        contentContainerClassName={cn(
          'p-8 sm:mx-auto',
          isEmpty && !rawQuery && 'mx-auto'
        )}
        horizontal
        keyboardShouldPersistTaps="always"
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={false}
      >
        <View className="h-10">
          {isEmpty && !rawQuery && (
            <Icon
              aria-hidden
              className="text-primary"
              icon={Tag}
              size={48}
              style={{ color: logColor.default } as ViewStyle}
            />
          )}
          {!isLoading && (
            <Sortable.Flex
              activeItemShadowOpacity={0}
              autoScrollActivationOffset={50}
              autoScrollDirection="horizontal"
              customHandle
              dragActivationDelay={0}
              flexWrap="nowrap"
              gap={12}
              itemEntering={null}
              itemExiting={null}
              onDragEnd={reorderTags}
              scrollableRef={scrollViewRef}
              sortEnabled={!rawQuery}
            >
              {tags.data.map((tag) => (
                <LogTagsSheetTag
                  id={tag.id}
                  isSelected={log.tagIdsSet.has(tag.id)}
                  key={tag.id}
                  logId={log.id}
                  name={tag.name}
                />
              ))}
              {!!rawQuery && !tags.queryExistingTagId && (
                <Button
                  className="rounded-full"
                  onPress={handleCreateTag}
                  size="sm"
                  variant="secondary"
                  wrapperClassName="rounded-full"
                >
                  <Icon className="text-placeholder" icon={Plus} />
                  <Text numberOfLines={1}>
                    Create tag &ldquo;{rawQuery}&rdquo;
                  </Text>
                </Button>
              )}
            </Sortable.Flex>
          )}
        </View>
      </ScrollView>
      <View className="w-full p-8 pt-0 sm:mx-auto sm:max-w-sm md:pt-0">
        <SearchInput
          actionIcon={!tags.queryExistingTagId && query ? Plus : undefined}
          maxLength={16}
          onActionPress={
            !tags.queryExistingTagId && query ? handleCreateTag : undefined
          }
          onSubmitEditing={handleCreateTag}
          placeholder="Type in a tag"
          query={rawQuery}
          ref={searchInputRef}
          setQuery={setRawQuery}
          size="sm"
        />
      </View>
    </Sheet>
  );
};
