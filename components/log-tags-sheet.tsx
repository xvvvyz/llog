import { LogTagsSheetTag } from '@/components/log-tags-sheet-tag';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { addLogTagToLog } from '@/mutations/add-log-tag-to-log';
import { createLogTag } from '@/mutations/create-log-tag';
import { reorderLogTags } from '@/mutations/reorder-log-tags';
import { useHasNoLogTags } from '@/queries/use-has-no-log-tags';
import { useLog } from '@/queries/use-log';
import { useLogTags } from '@/queries/use-log-tags';
import { cn } from '@/utilities/ui/utils';
import { Tags } from 'lucide-react-native';
import { ComponentRef, useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

export const LogTagsSheet = () => {
  const [rawQuery, setRawQuery] = useState('');
  const isEmpty = useHasNoLogTags();
  const searchInputRef = useRef<ComponentRef<typeof SearchInput>>(null);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const sheetManager = useSheetManager();

  const query = useMemo(() => rawQuery?.trim(), [rawQuery]);

  const log = useLog({ id: sheetManager.getId('log-tags') });
  const logTags = useLogTags({ query });

  const isLoading = log.isLoading || logTags.isLoading;

  const handleCreateTag = useCallback(() => {
    if (!query) return;

    if (logTags.queryExistingTagId) {
      addLogTagToLog({
        logId: log.id,
        tagId: logTags.queryExistingTagId,
      });
    } else {
      createLogTag({
        logId: log.id,
        name: query,
      });
    }

    setRawQuery('');
  }, [query, log.id, logTags.queryExistingTagId]);

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
            <Icon aria-hidden className="text-primary" icon={Tags} size={48} />
          )}
          {!isLoading && (
            <Sortable.Flex
              autoScrollActivationOffset={50}
              autoScrollDirection="horizontal"
              customHandle
              dragActivationDelay={0}
              flexWrap="nowrap"
              gap={12}
              itemEntering={null}
              itemExiting={null}
              onDragEnd={reorderLogTags}
              scrollableRef={scrollViewRef}
              sortEnabled={!rawQuery}
            >
              {logTags.data.map((tag) => (
                <LogTagsSheetTag
                  id={tag.id}
                  isSelected={log.logTagIdsSet.has(tag.id)}
                  key={tag.id}
                  logId={log.id}
                  name={tag.name}
                />
              ))}
              {!!rawQuery && !logTags.queryExistingTagId && (
                <Button onPress={handleCreateTag} size="sm" variant="secondary">
                  <Text numberOfLines={1}>
                    Create tag &ldquo;{rawQuery}&rdquo;
                  </Text>
                </Button>
              )}
            </Sortable.Flex>
          )}
        </View>
      </ScrollView>
      <View className="w-full p-8 pt-0 sm:mx-auto sm:max-w-sm">
        <SearchInput
          maxLength={16}
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
