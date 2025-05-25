import * as AlertDialog from '@/components/ui/alert-dialog';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { id } from '@instantdb/react-native';
import { Check, GripVertical, Search, Tag, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';

export function LogTagForm({
  logId,
  open,
  onClose,
}: {
  logId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const { teamId } = useActiveTeamId();

  const { data, isLoading } = db.useQuery(
    teamId
      ? {
          logs: {
            $: { where: { id: logId } },
            logTags: {},
          },
          logTags: {
            $: { where: { team: teamId } },
          },
        }
      : null
  );

  const log = data?.logs?.[0];

  const tags = useMemo(
    // manually sort, useQuery has a glitch where it will return
    // the incorrect number of tags briefly...
    () => data?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [data]
  );

  const trimmedQuery = query.trim();

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(query.toLowerCase())
  );

  const queryExistingTag = tags.find(
    (tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const newTag = useCallback(() => {
    if (!log) return;

    if (queryExistingTag) {
      db.transact(db.tx.logs[log.id].link({ logTags: queryExistingTag.id }));
    } else {
      db.transact(
        db.tx.logTags[id()]
          .update({ name: trimmedQuery, order: tags.length })
          .link({ logs: log?.id, team: teamId })
      );
    }

    setQuery('');
  }, [tags, queryExistingTag, log, teamId, trimmedQuery]);

  const renderItem = useCallback(
    ({ item }: { item: { id: string; name: string } }) => {
      const checked = log?.logTags?.some((t) => t.id === item.id) ?? false;

      return (
        <View className="flex-row gap-2">
          <View className="relative flex-1">
            {!trimmedQuery ? (
              <View className="absolute -left-0.5 -top-1 z-10">
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
              <View className="absolute left-3 top-2.5">
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
              className="flex-1 pl-11"
              onChangeText={(name) =>
                db.transact(db.tx.logTags[item.id].update({ name }))
              }
              placeholder="Tag"
              returnKeyType="done"
              size="sm"
              value={item.name}
            />
            <Button
              accessibilityHint="Removes this tag"
              accessibilityLabel={`Remove ${item.name}`}
              className="size-8"
              onPress={() => setTagToDelete(item.id)}
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
            onPress={() => {
              if (!log) return;
              const isSelected = log.logTags.some((t) => t.id === item.id);

              if (isSelected) {
                const tag = log.logTags.find((t) => t.id === item.id);
                if (!tag) return;
                db.transact(db.tx.logTags[tag.id].unlink({ logs: log.id }));
              } else {
                const existing = tags.find((t) => t.id === item.id);
                if (!existing) return;
                db.transact(db.tx.logTags[existing.id].link({ logs: log.id }));
              }
            }}
            role="checkbox"
            size="icon"
            variant="secondary"
          >
            <Icon
              className={cn(!checked && 'opacity-50')}
              icon={Check}
              size={20}
            />
          </Button>
          <AlertDialog.Root
            onClose={() => setTagToDelete(null)}
            open={tagToDelete === item.id}
          >
            <AlertDialog.Title>
              Delete &ldquo;{item.name}&rdquo;?
            </AlertDialog.Title>
            <AlertDialog.Description>
              To remove it from this log only, cancel and&nbsp;then tap the
              check icon.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <Button onPress={() => setTagToDelete(null)} variant="secondary">
                <Text>Cancel</Text>
              </Button>
              <Button
                onPress={() => {
                  db.transact(db.tx.logTags[item.id].delete());
                  setTagToDelete(null);
                }}
                variant="destructive"
              >
                <Text>Delete</Text>
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Root>
        </View>
      );
    },
    [log, tags, tagToDelete, trimmedQuery]
  );

  return (
    <BottomSheet isLoading={isLoading} open={open} onClose={onClose}>
      <BottomSheetView>
        <View className="mx-auto w-full max-w-md p-8">
          <View className="flex gap-2">
            {!!trimmedQuery && !queryExistingTag && (
              <Button onPress={newTag} size="sm" variant="secondary">
                <Text>Create tag &ldquo;{trimmedQuery}&rdquo;</Text>
              </Button>
            )}
            <Sortable.PortalProvider enabled>
              <Sortable.Grid
                autoScrollEnabled={false}
                customHandle
                data={filteredTags}
                dragActivationDelay={0}
                enableActiveItemSnap
                itemsLayoutTransitionMode="reorder"
                keyExtractor={(tag) => tag.id}
                onDragEnd={({ fromIndex, toIndex }) => {
                  const newData = [...filteredTags];
                  const [movedItem] = newData.splice(fromIndex, 1);
                  newData.splice(toIndex, 0, movedItem);

                  db.transact(
                    newData.map((tag, index) =>
                      db.tx.logTags[tag.id].update({ order: index })
                    )
                  );
                }}
                renderItem={renderItem}
                rowGap={8}
              />
            </Sortable.PortalProvider>
          </View>
          <View className="mt-8 space-y-2">
            <View className="relative">
              <View className="absolute left-3 top-2.5">
                <Icon
                  icon={Search}
                  className="text-placeholder"
                  size={20}
                  aria-hidden
                />
              </View>
              <Input
                bottomSheet
                className="pl-10"
                onChangeText={setQuery}
                onSubmitEditing={newTag}
                placeholder="Type in a tag"
                returnKeyType="done"
                size="sm"
                submitBehavior="submit"
                value={query}
              />
            </View>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
