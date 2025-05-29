import { LogTagsFormTag } from '@/components/log-tags-form-tag';
import { TagDeleteForm } from '@/components/tag-delete-form';
import { BottomSheet, BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { LogTag } from '@/instant.schema';
import { db } from '@/utilities/db';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { id } from '@instantdb/react-native';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import {
  ComponentRef,
  Fragment,
  startTransition,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

export const LogTagsForm = ({ logId }: { logId: string }) => {
  const [query, setQuery] = useState('');
  const [tagDeleteFormId, setTagDeleteFormId] = useState<string | null>(null);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const searchInputRef = useRef<ComponentRef<typeof SearchInput>>(null);
  const { teamId } = useActiveTeamId();

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const { data: logData, isLoading: isLogLoading } = db.useQuery({
    logs: {
      $: { fields: ['id'], where: { id: logId } },
      logTags: { $: { fields: ['id'] } },
    },
  });

  const log = logData?.logs?.[0];

  const selectedTags = useMemo(
    () => new Set(log?.logTags?.map((tag) => tag.id) ?? []),
    [log?.logTags]
  );

  const { data: logTagsData, isLoading: isLogTagsLoading } = db.useQuery(
    teamId ? { logTags: { $: { where: { team: teamId } } } } : null
  );

  const logTags = useMemo(
    () => logTagsData?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [logTagsData?.logTags]
  );

  const filteredTags = useMemo(
    () =>
      logTags.filter((tag) =>
        tag.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      ),
    [logTags, trimmedQuery]
  );

  const queryExistingTag = useMemo(
    () =>
      logTags.find(
        (tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase()
      ),
    [logTags, trimmedQuery]
  );

  const createTag = useCallback(async () => {
    if (!log || !trimmedQuery) {
      searchInputRef.current?.blur();
      return;
    }

    if (queryExistingTag) {
      db.transact(db.tx.logs[log.id].link({ logTags: queryExistingTag.id }));
    } else {
      db.transact([
        ...logTags.map((tag) =>
          db.tx.logTags[tag.id].update({ order: tag.order + 1 })
        ),
        db.tx.logTags[id()]
          .update({ name: trimmedQuery, order: 0 })
          .link({ logs: log.id, team: teamId }),
      ]);

      setQuery('');
    }
  }, [logTags, queryExistingTag, log, teamId, trimmedQuery]);

  const updateTag = useCallback((itemId: string, name: string) => {
    db.transact(db.tx.logTags[itemId].update({ name }));
  }, []);

  const toggleTag = useCallback(
    (itemId: string) => {
      if (!log) return;

      const action = log.logTags.some((t) => t.id === itemId)
        ? 'unlink'
        : 'link';

      db.transact(db.tx.logTags[itemId][action]({ logs: log.id }));
    },
    [log]
  );

  const reorderTag = useCallback(
    ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
      startTransition(() => {
        const newData = [...filteredTags];
        const [movedItem] = newData.splice(fromIndex, 1);
        newData.splice(toIndex, 0, movedItem);

        db.transact(
          newData.map((tag, index) =>
            db.tx.logTags[tag.id].update({ order: index })
          )
        );
      });
    },
    [filteredTags]
  );

  const renderTag = useCallback(
    ({ item: tag }: { item: LogTag }) => {
      const checked = selectedTags.has(tag.id);

      return (
        <LogTagsFormTag
          checked={checked}
          id={tag.id}
          name={tag.name}
          setDeleteFormId={setTagDeleteFormId}
          showHandle={!trimmedQuery}
          toggle={toggleTag}
          update={updateTag}
        />
      );
    },
    [selectedTags, setTagDeleteFormId, toggleTag, trimmedQuery, updateTag]
  );

  return (
    <Fragment>
      {(isLogLoading || isLogTagsLoading) && <BottomSheetLoading />}
      <BottomSheetScrollView
        keyboardShouldPersistTaps="always"
        ref={scrollViewRef}
      >
        <View className="mx-auto w-full max-w-md p-8">
          <SearchInput
            bottomSheet
            maxLength={20}
            onSubmitEditing={createTag}
            placeholder="Type in a tag"
            query={query}
            ref={searchInputRef}
            setQuery={setQuery}
            submitBehavior="submit"
          />
          <View className="mt-8 flex gap-2">
            <Sortable.PortalProvider enabled>
              <Sortable.Grid
                autoScrollSpeed={Platform.select({ android: 0.6, ios: 0.4 })}
                customHandle
                data={filteredTags}
                dragActivationDelay={0}
                itemEntering={null}
                keyExtractor={(tag) => tag.id}
                onDragEnd={reorderTag}
                renderItem={renderTag}
                rowGap={8}
                scrollableRef={scrollViewRef}
              />
            </Sortable.PortalProvider>
            {!!trimmedQuery && !queryExistingTag && (
              <Button onPress={createTag} size="sm" variant="secondary">
                <Text numberOfLines={1}>
                  Create tag &ldquo;{trimmedQuery}&rdquo;
                </Text>
              </Button>
            )}
          </View>
        </View>
      </BottomSheetScrollView>
      {tagDeleteFormId && (
        <BottomSheet
          onClose={() => setTagDeleteFormId(null)}
          portalName="delete-tag-form"
        >
          <TagDeleteForm tagId={tagDeleteFormId} />
        </BottomSheet>
      )}
    </Fragment>
  );
};
