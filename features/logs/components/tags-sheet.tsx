import { TagRow } from '@/features/logs/components/tag-row';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { addTagToLog } from '@/features/logs/mutations/add-tag';
import { createTag } from '@/features/logs/mutations/create-tag';
import { reorderTags } from '@/features/logs/mutations/reorder-tags';
import { useHasNoTags } from '@/features/logs/queries/use-has-no-tags';
import { useLog } from '@/features/logs/queries/use-log';
import { useTags } from '@/features/logs/queries/use-tags';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Plus, Tag } from 'phosphor-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
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
      addTagToLog({ logId: log.id, tagId: tags.queryExistingTagId });
    } else {
      createTag({ logId: log.id, name: query });
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
        ref={scrollViewRef}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cn(
          'p-8 sm:mx-auto',
          isEmpty && !rawQuery && 'mx-auto'
        )}
      >
        <View className="h-10">
          {isEmpty && !rawQuery && (
            <Icon
              aria-hidden
              className="text-primary"
              color={logColor.default}
              icon={Tag}
              size={48}
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
                <TagRow
                  key={tag.id}
                  id={tag.id}
                  isSelected={log.tagIdsSet.has(tag.id)}
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
      <View className="w-full p-8 pt-0 md:pt-0 sm:mx-auto sm:max-w-sm">
        <SearchInput
          ref={searchInputRef}
          actionIcon={!tags.queryExistingTagId && query ? Plus : undefined}
          maxLength={16}
          onSubmitEditing={handleCreateTag}
          placeholder="Type in a tag"
          query={rawQuery}
          setQuery={setRawQuery}
          size="sm"
          onActionPress={
            !tags.queryExistingTagId && query ? handleCreateTag : undefined
          }
        />
      </View>
    </Sheet>
  );
};
