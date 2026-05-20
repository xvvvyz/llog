import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import { EmptyState } from '@/features/logs/components/empty-state';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLog } from '@/features/logs/queries/use-log';
import { CardsHeader } from '@/features/cards/components/cards-header';
import { useLogCards } from '@/features/cards/queries/use-cards';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { Entry } from '@/features/records/components/entry';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { useRecords } from '@/features/records/queries/use-records';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { BackButton } from '@/ui/back-button';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import type { ListHandle } from '@/ui/list';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { NotFound } from '@/ui/not-found';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { useLocalSearchParams } from 'expo-router';
import { DotsThreeVertical, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

const TimelineRecordSeparator = () => <View className="h-4" />;

export default function Index() {
  const breakpoints = useBreakpoints();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ logId: string }>();
  const listRef = React.useRef<ListHandle>(null);
  const sheetManager = useSheetManager();
  const log = useLog({ id: params.logId });
  const logColor = useLogColor({ id: params.logId });
  const cards = useLogCards({ logId: params.logId });
  const records = useRecords({ logId: params.logId });
  const recordData = records.data;
  const cardsLoading = cards.isLoading;
  const recordsLoading = records.isLoading;
  const logNotFound = !params.logId || (!log.isLoading && !log.id);
  const hasRecords = recordData.length > 0;
  const showEmpty = !!log.id && records.isEmptyReady;
  const emptyStateTeamId = showEmpty ? (log.teamId ?? null) : null;
  const emptyStateRole = useMyRole({ teamId: emptyStateTeamId });

  const managedEmptyStateTeamId =
    showEmpty && emptyStateRole.canManage ? (log.teamId ?? null) : null;

  const emptyStateMembers = useTeamMembers({ teamId: managedEmptyStateTeamId });
  const emptyStateInvites = useTeamInvites({ teamId: managedEmptyStateTeamId });

  const emptyStateActionsLoading =
    showEmpty &&
    (!log.teamId ||
      !emptyStateRole.isReady ||
      emptyStateRole.isLoading ||
      (emptyStateRole.canManage &&
        (!emptyStateMembers.isReady ||
          emptyStateMembers.isLoading ||
          !emptyStateInvites.isReady ||
          emptyStateInvites.isLoading)));

  const showLoading =
    log.isLoading || cardsLoading || recordsLoading || emptyStateActionsLoading;

  const showFab = hasRecords && !breakpoints.md;
  const showEmptyManagerActions = emptyStateRole.canManage;

  const listFooterHeight =
    insets.bottom + (showFab ? 104 : breakpoints.md ? 32 : 16);

  const pendingScroll = scroll.usePostSubmitScroll({
    id: params.logId,
    scope: 'log',
  });

  React.useEffect(() => {
    if (pendingScroll !== 'top' || recordsLoading || !hasRecords) return;

    const frame = requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollToOffset({ animated: true, offset: 0 });
      scroll.clearPostSubmitScroll({ id: params.logId, scope: 'log' });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    hasRecords,
    params.logId,
    pendingScroll,
    recordData.length,
    recordsLoading,
  ]);

  return (
    <Page>
      <Header
        left={<BackButton />}
        title={log.name}
        right={
          !!log.id && (
            <View className="flex-row items-center">
              {hasRecords && (
                <Button
                  className="hidden active:opacity-90 md:flex web:hover:opacity-90"
                  size="xs"
                  style={{ backgroundColor: logColor.default }}
                  variant="secondary"
                  onPress={() =>
                    sheetManager.open(
                      'record-create',
                      params.logId,
                      undefined,
                      { teamId: log.teamId }
                    )
                  }
                >
                  <Icon className="-ml-0.5 text-white" icon={Plus} />
                  <Text className="text-white">Record</Text>
                </Button>
              )}
              <DropdownMenu
                contentClassName="mt-2"
                id={log.id}
                triggerWrapperClassName="md:-mr-4 md:ml-4"
                contentStyle={{
                  top: Platform.select({
                    default: headerHeight + insets.top,
                    web: 0,
                  }),
                }}
              >
                <Icon
                  className="text-foreground"
                  icon={DotsThreeVertical}
                  size={24}
                />
              </DropdownMenu>
            </View>
          )
        }
      />
      {logNotFound ? (
        <NotFound />
      ) : showLoading ? (
        <Loading />
      ) : showEmpty ? (
        <EmptyState
          canManage={emptyStateRole.canManage}
          invites={emptyStateInvites.invites}
          logId={params.logId}
          members={emptyStateMembers.members}
          showManagerActions={showEmptyManagerActions}
          teamId={log.teamId!}
        />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          data={recordData}
          ItemSeparatorComponent={TimelineRecordSeparator}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          keyExtractor={(record) => record.id}
          ListFooterComponent={<View style={{ height: listFooterHeight }} />}
          listRef={listRef}
          onEndReached={records.loadNextPage}
          onEndReachedThreshold={1}
          recycleItems={false}
          wrapperClassName="flex-1"
          ListHeaderComponent={
            <CardsHeader
              cards={cards.data}
              logColor={log.color}
              logId={params.logId}
              teamId={log.teamId}
            />
          }
          renderItem={({ item }) => (
            <Entry
              logId={params.logId}
              logName={log.name}
              numberOfLines={7}
              record={item}
            />
          )}
        />
      )}
      {showFab && (
        <View
          className="absolute bottom-8 right-8"
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="size-14 border-0 rounded-full active:opacity-90 web:hover:opacity-90"
            size="icon"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
            onPress={() =>
              sheetManager.open('record-create', params.logId, undefined, {
                teamId: log.teamId,
              })
            }
          >
            <Icon className="text-white" icon={Plus} />
          </Button>
        </View>
      )}
    </Page>
  );
}
