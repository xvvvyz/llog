import { TagDeleteForm } from '@/components/tag-delete-form';
import { BottomSheet, BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { LogTag } from '@/instant.schema';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { id } from '@instantdb/react-native';
import { Check, GripVertical, Tag, X } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import {
  ComponentRef,
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

export function LogTagsForm({ logId }: { logId: string }) {
  const [query, setQuery] = useState('');
  const [tagDeleteFormId, setTagDeleteFormId] = useState<string | null>(null);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const searchInputRef = useRef<ComponentRef<typeof SearchInput>>(null);
  const { teamId } = useActiveTeamId();

  const { data: logData, isLoading: isLogLoading } = db.useQuery({
    logs: {
      $: { fields: ['id'], where: { id: logId } },
      logTags: { $: { fields: ['id'] } },
    },
  });

  const { data: logTagsData, isLoading: isLogTagsLoading } = db.useQuery(
    teamId ? { logTags: { $: { where: { team: teamId } } } } : null
  );

  const log = logData?.logs?.[0];

  const logTags = useMemo(
    () => logTagsData?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [logTagsData?.logTags]
  );

  const trimmedQuery = useMemo(() => query.trim(), [query]);

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
      await db.transact(
        db.tx.logs[log.id].link({ logTags: queryExistingTag.id })
      );
    } else {
      await db.transact([
        ...logTags.map((tag) =>
          db.tx.logTags[tag.id].update({ order: tag.order + 1 })
        ),
        db.tx.logTags[id()]
          .update({ name: trimmedQuery, order: 0 })
          .link({ logs: log.id, team: teamId }),
      ]);
    }

    setQuery('');
    searchInputRef.current?.focus();
  }, [logTags, queryExistingTag, log, teamId, trimmedQuery]);

  const toggleTag = useCallback(
    (itemId: string) => {
      if (!log) return;
      const isSelected = log.logTags.some((t) => t.id === itemId);

      if (isSelected) {
        const tag = log.logTags.find((t) => t.id === itemId);
        if (!tag) return;
        db.transact(db.tx.logTags[tag.id].unlink({ logs: log.id }));
      } else {
        const existing = logTags.find((t) => t.id === itemId);
        if (!existing) return;
        db.transact(db.tx.logTags[existing.id].link({ logs: log.id }));
      }
    },
    [log, logTags]
  );

  const reorderTags = useCallback(
    ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
      const newData = [...filteredTags];
      const [movedItem] = newData.splice(fromIndex, 1);
      newData.splice(toIndex, 0, movedItem);

      db.transact(
        newData.map((tag, index) =>
          db.tx.logTags[tag.id].update({ order: index })
        )
      );
    },
    [filteredTags]
  );

  const renderTag = useCallback(
    ({ item }: { item: LogTag }) => {
      const checked = log?.logTags?.some((t) => t.id === item.id) ?? false;

      return (
        <View className="flex-row gap-2">
          <View className="relative flex-1">
            {!trimmedQuery ? (
              <View className="absolute -left-1 -top-1 z-10">
                <Sortable.Handle>
                  <View className="flex size-12 cursor-grab items-center justify-center">
                    <Icon
                      aria-hidden
                      className="text-placeholder"
                      icon={GripVertical}
                      size={20}
                    />
                  </View>
                </Sortable.Handle>
              </View>
            ) : (
              <View className="absolute left-2.5 top-2.5">
                <Icon
                  aria-hidden
                  className="text-placeholder"
                  icon={Tag}
                  size={20}
                />
              </View>
            )}
            <Input
              bottomSheet
              className="px-10"
              defaultValue={item.name}
              maxLength={20}
              multiline={false}
              onChangeText={(name) =>
                db.transact(db.tx.logTags[item.id].update({ name }))
              }
              placeholder="Tag"
              returnKeyType="done"
              size="sm"
            />
            <Button
              accessibilityHint="Removes this tag"
              accessibilityLabel={`Remove ${item.name}`}
              className="size-8"
              onPress={() => setTagDeleteFormId(item.id)}
              size="icon"
              variant="ghost"
              wrapperClassName="rounded-full absolute right-1 top-1"
            >
              <Icon className="text-placeholder" icon={X} size={16} />
            </Button>
          </View>
          <Button
            aria-checked={checked}
            className={cn('size-10', checked && 'bg-primary')}
            onPress={() => toggleTag(item.id)}
            role="checkbox"
            size="icon"
            variant="secondary"
          >
            <Icon
              className={cn(checked ? 'text-white' : 'opacity-50')}
              icon={Check}
              size={20}
            />
          </Button>
        </View>
      );
    },
    [log, setTagDeleteFormId, toggleTag, trimmedQuery]
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
                onDragEnd={reorderTags}
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
}
