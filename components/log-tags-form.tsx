import { LogTagsFormTag } from '@/components/log-tags-form-tag';
import { TagDeleteForm } from '@/components/tag-delete-form';
import { BottomSheet, BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { id } from '@instantdb/react-native';
import { Tags } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import {
  Fragment,
  startTransition,
  useCallback,
  useMemo,
  useState,
} from 'react';

export const LogTagsForm = ({ logId }: { logId: string }) => {
  const [query, setQuery] = useState('');
  const [tagDeleteFormId, setTagDeleteFormId] = useState<string | null>(null);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const { teamId } = useActiveTeamId();

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const { data, isLoading } = db.useQuery(
    teamId
      ? {
          logs: {
            $: { fields: ['id'], where: { id: logId } },
            logTags: { $: { fields: ['id'] } },
          },
          logTags: { $: { where: { team: teamId } } },
        }
      : null
  );

  const log = data?.logs?.[0];

  const selectedTags = useMemo(
    () => new Set(log?.logTags?.map((tag) => tag.id) ?? []),
    [log?.logTags]
  );

  const logTags = useMemo(
    () => data?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [data?.logTags]
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
    if (!log || !trimmedQuery) return;

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
    }

    setQuery('');
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

  return (
    <Fragment>
      {isLoading && <BottomSheetLoading />}
      <BottomSheetView>
        <ScrollView
          contentContainerClassName={cn(
            'p-8 xs:mx-auto',
            !filteredTags.length && 'mx-auto'
          )}
          horizontal
          keyboardShouldPersistTaps="always"
          ref={scrollViewRef}
          showsHorizontalScrollIndicator={false}
        >
          <View className="h-10">
            {!filteredTags.length && !trimmedQuery && (
              <Icon
                aria-hidden
                className="text-primary"
                icon={Tags}
                size={48}
              />
            )}
            <Sortable.Flex
              autoScrollDirection="horizontal"
              flexWrap="nowrap"
              gap={12}
              itemEntering={null}
              itemExiting={null}
              itemsLayout={null}
              onDragEnd={reorderTag}
              scrollableRef={scrollViewRef}
            >
              {filteredTags.map((tag) => (
                <LogTagsFormTag
                  checked={selectedTags.has(tag.id)}
                  id={tag.id}
                  key={tag.id}
                  name={tag.name}
                  setDeleteFormId={setTagDeleteFormId}
                  toggle={toggleTag}
                  update={updateTag}
                />
              ))}
              {!!trimmedQuery && !queryExistingTag && (
                <Button onPress={createTag} size="sm" variant="secondary">
                  <Text numberOfLines={1}>
                    Create tag &ldquo;{trimmedQuery}&rdquo;
                  </Text>
                </Button>
              )}
            </Sortable.Flex>
          </View>
        </ScrollView>
        <View className="mx-auto w-full max-w-md p-8 pt-0">
          <SearchInput
            bottomSheet
            maxLength={16}
            onSubmitEditing={createTag}
            placeholder="Type in a tag"
            query={query}
            setQuery={setQuery}
            submitBehavior="submit"
          />
        </View>
      </BottomSheetView>
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
