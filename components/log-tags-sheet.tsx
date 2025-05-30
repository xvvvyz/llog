import { LogTagsSheetTag } from '@/components/log-tags-sheet-tag';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Sheet, SheetView } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { addLogTagToLog } from '@/mutations/add-log-tag-to-log';
import { createLogTag } from '@/mutations/create-log-tag';
import { reorderLogTags } from '@/mutations/reorder-log-tags';
import { useActiveTeamId } from '@/queries/use-active-team-id';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { Tags } from 'lucide-react-native';
import { ComponentRef, useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

export const LogTagsSheet = () => {
  const [rawQuery, setRawQuery] = useState('');
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const searchInputRef = useRef<ComponentRef<typeof SearchInput>>(null);
  const sheetManager = useSheetManager();
  const teamId = useActiveTeamId();

  const logId = sheetManager.getId('log-tags');
  const query = useMemo(() => rawQuery.trim(), [rawQuery]);

  const { data, isLoading } = db.useQuery(
    logId && teamId
      ? {
          logs: {
            $: { fields: ['id'], where: { id: logId } },
            logTags: { $: { fields: ['id'] } },
          },
          logTags: {
            $: {
              where: {
                team: teamId,
                ...(query ? { name: { $ilike: `%${query}%` } } : {}),
              },
            },
          },
        }
      : null
  );

  const log = data?.logs?.[0];

  const logTags = useMemo(
    // TODO: use order: { order: 'asc' } in the query when this is fixed:
    // https://discord.com/channels/1031957483243188235/1376250736416919567
    () => data?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [data?.logTags]
  );

  const selectedTagIds = useMemo(
    () => new Set(log?.logTags?.map((tag) => tag.id) ?? []),
    [log?.logTags]
  );

  const queryExistingTagId = useMemo(
    () =>
      logTags.find((tag) => tag.name.toLowerCase() === query.toLowerCase())?.id,
    [logTags, query]
  );

  const createTag = useCallback(async () => {
    if (!query) {
      searchInputRef.current?.blur();
      return;
    }

    if (queryExistingTagId) {
      addLogTagToLog({ logId: log?.id, tagId: queryExistingTagId });
    } else {
      createLogTag({ logId: log?.id, name: query });
    }

    setRawQuery('');
  }, [log, query, queryExistingTagId]);

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-tags')}
      open={sheetManager.isOpen('log-tags')}
      portalName="log-tags"
    >
      <SheetView>
        <ScrollView
          contentContainerClassName={cn(
            'p-8 xs:mx-auto',
            !logTags.length && 'mx-auto'
          )}
          horizontal
          keyboardShouldPersistTaps="always"
          ref={scrollViewRef}
          showsHorizontalScrollIndicator={false}
        >
          <View className="h-10">
            {!logTags.length && !query && (
              <Icon
                aria-hidden
                className="text-primary"
                icon={Tags}
                size={48}
              />
            )}
            {!isLoading && (
              <Sortable.Flex
                autoScrollActivationOffset={50}
                autoScrollDirection="horizontal"
                flexWrap="nowrap"
                gap={12}
                itemEntering={null}
                itemExiting={null}
                onDragEnd={reorderLogTags}
                scrollableRef={scrollViewRef}
                sortEnabled={!query}
              >
                {logTags.map((tag) => (
                  <LogTagsSheetTag
                    id={tag.id}
                    isSelected={selectedTagIds.has(tag.id)}
                    key={tag.id}
                    logId={log?.id}
                    name={tag.name}
                  />
                ))}
                {!!query && !queryExistingTagId && (
                  <Button onPress={createTag} size="sm" variant="secondary">
                    <Text numberOfLines={1}>
                      Create tag &ldquo;{query}&rdquo;
                    </Text>
                  </Button>
                )}
              </Sortable.Flex>
            )}
          </View>
        </ScrollView>
        <View className="mx-auto w-full max-w-md p-8 pt-0">
          <SearchInput
            bottomSheet
            maxLength={16}
            onSubmitEditing={createTag}
            placeholder="Type in a tag"
            query={rawQuery}
            ref={searchInputRef}
            setQuery={setRawQuery}
            submitBehavior="submit"
          />
        </View>
      </SheetView>
    </Sheet>
  );
};
