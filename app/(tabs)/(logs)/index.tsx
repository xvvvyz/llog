import { LogDropdownMenuForms } from '@/components/log-dropdown-menu-forms';
import { LogListActions, SortBy } from '@/components/log-list-actions';
import { LogListEmptyState } from '@/components/log-list-empty-state';
import { LogListLog } from '@/components/log-list-log';
import { Button } from '@/components/ui/button';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLogDropdownMenuForms } from '@/hooks/use-log-dropdown-menu-forms';
import { Log, LogTag } from '@/instant.schema';
import { SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

export default function Index() {
  const [query, setQuery] = useState('');
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const dropdownMenuForms = useLogDropdownMenuForms();
  const navigation = useNavigation();
  const router = useRouter();
  const { teamId } = useActiveTeamId();
  const { user } = db.useAuth();

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const { data: uiData, isLoading: isUiLoading } = db.useQuery(
    user
      ? {
          ui: {
            $: {
              where: { user: user.id },
              fields: ['logsSortBy', 'logsSortDirection'],
            },
            logTags: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const ui = uiData?.ui?.[0];
  const sortBy = (ui?.logsSortBy ?? 'serverCreatedAt') as SortBy;
  const sortDirection = (ui?.logsSortDirection ?? 'desc') as SortDirection;

  const selectedTagIds = useMemo(
    () => new Set(ui?.logTags?.map((tag) => tag.id) ?? []),
    [ui?.logTags]
  );

  const { data, isLoading } = db.useQuery(
    teamId && !isUiLoading
      ? {
          logs: {
            $: {
              order: { [sortBy]: sortDirection },
              where: {
                team: teamId,
                ...(selectedTagIds.size
                  ? { logTags: { $in: Array.from(selectedTagIds) } }
                  : {}),
                ...(trimmedQuery
                  ? { name: { $ilike: `%${trimmedQuery}%` } }
                  : {}),
              },
            },
            logTags: { $: { fields: ['id'] } },
          },
          logTags: { $: { where: { team: teamId } } },
        }
      : null
  );

  const logs = data?.logs ?? [];

  const logTags = useMemo(
    // https://discord.com/channels/1031957483243188235/1148284450992574535/threads/1376250736416919567/
    () => data?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [data?.logTags]
  );

  const isEmpty = !isLoading && !query && !selectedTagIds.size && !logs.length;

  const createLog = useCallback(() => {
    const logId = id();

    db.transact(
      db.tx.logs[logId]
        .update({ color: 11, name: 'New log' })
        .link({ team: teamId })
    );

    router.push(`/${logId}`);
  }, [router, teamId]);

  const sort = useCallback(
    (sort: [SortBy, SortDirection]) => {
      if (!user?.id) return;

      db.transact(
        db.tx.ui[user?.id].update({
          logsSortBy: sort[0],
          logsSortDirection: sort[1],
        })
      );
    },
    [user?.id]
  );

  const toggleTag = useCallback(
    (tagId: string) => {
      if (!user?.id) return;
      const action = selectedTagIds.has(tagId) ? 'unlink' : 'link';
      db.transact(db.tx.ui[user.id][action]({ logTags: tagId }));
    },
    [selectedTagIds, user?.id]
  );

  const renderLog = useCallback(
    ({ item: log }: { item: Log & { logTags: Pick<LogTag, 'id'>[] } }) => {
      const color =
        SPECTRUM[colorScheme][log.color] ?? SPECTRUM[colorScheme][0];

      const itemLogTagIds = new Set(log.logTags.map((tag) => tag.id));

      return (
        <LogListLog
          color={color.default}
          id={log.id}
          name={log.name}
          setDeleteFormId={dropdownMenuForms.setDeleteFormId}
          setEditFormId={dropdownMenuForms.setEditFormId}
          setTagsFormId={dropdownMenuForms.setTagsFormId}
          tags={logTags.filter((tag) => itemLogTagIds.has(tag.id))}
        />
      );
    },
    [colorScheme, dropdownMenuForms, logTags]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-3">
          <LogListActions
            className={cn('hidden md:flex', isEmpty && 'md:hidden')}
            filteredTagIds={selectedTagIds}
            logTags={logTags}
            onSort={sort}
            query={query}
            setQuery={setQuery}
            sortBy={[sortBy, sortDirection]}
            toggleTag={toggleTag}
          />
          <Button
            accessibilityHint="Opens a form to create a new log"
            accessibilityLabel="New log"
            className="size-14"
            onPress={createLog}
            size="icon"
            variant="link"
          >
            <Icon aria-hidden className="text-foreground" icon={Plus} />
          </Button>
        </View>
      ),
    });
  }, [
    breakpoints.md,
    createLog,
    isEmpty,
    logTags,
    navigation,
    query,
    selectedTagIds,
    sort,
    sortBy,
    sortDirection,
    toggleTag,
  ]);

  if (isEmpty) {
    return <LogListEmptyState createLog={createLog} />;
  }

  return (
    <List
      ListFooterComponent={
        <LogDropdownMenuForms
          deleteFormId={dropdownMenuForms.deleteFormId}
          editFormId={dropdownMenuForms.editFormId}
          setDeleteFormId={dropdownMenuForms.setDeleteFormId}
          setEditFormId={dropdownMenuForms.setEditFormId}
          setTagsFormId={dropdownMenuForms.setTagsFormId}
          tagsFormId={dropdownMenuForms.tagsFormId}
        />
      }
      ListHeaderComponent={
        <LogListActions
          className="p-1.5 md:hidden"
          filteredTagIds={selectedTagIds}
          logTags={logTags}
          onSort={sort}
          query={query}
          setQuery={setQuery}
          sortBy={[sortBy, sortDirection]}
          toggleTag={toggleTag}
        />
      }
      accessibilityLabel="Logs"
      accessibilityRole="list"
      contentContainerClassName="p-1.5 md:p-6"
      data={logs}
      extraData={[]}
      key={`grid-${columns}`}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always"
      numColumns={columns}
      renderItem={renderLog}
      showsVerticalScrollIndicator={false}
    />
  );
}
