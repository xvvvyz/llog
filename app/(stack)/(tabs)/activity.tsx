import { useProfile } from '@/features/account/queries/use-profile';
import { useUi } from '@/features/account/queries/use-ui';
import { Item } from '@/features/activity/components/item';
import * as grouping from '@/features/activity/lib/group-activities';
import { markActivitiesRead } from '@/features/activity/mutations/mark-activities-read';
import { useActivities } from '@/features/activity/queries/use-activities';
import { cn } from '@/lib/cn';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { useFocusEffect } from 'expo-router';
import { Sparkle } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

const ACTIVITY_MIN_RENDERED_GROUPS = 12;

export default function Activity() {
  const {
    activities,
    canLoadNextPage,
    isLoading,
    loadNextPage,
    manageableTeamIds,
  } = useActivities();

  const profile = useProfile();
  const ui = useUi();

  const grouped = React.useMemo(
    () => grouping.groupActivities(activities, profile.id),
    [activities, profile.id]
  );

  const showLoading = isLoading || profile.isLoading;
  const showEmpty = !showLoading && !grouped.length;

  const latestReadActivityDate = profile.id
    ? activities.find((activity) => activity.actor?.id !== profile.id)?.date
    : undefined;

  React.useEffect(() => {
    if (!canLoadNextPage || grouped.length >= ACTIVITY_MIN_RENDERED_GROUPS) {
      return;
    }

    loadNextPage();
  }, [canLoadNextPage, grouped.length, loadNextPage]);

  useFocusEffect(
    React.useCallback(() => {
      if (
        profile.id &&
        latestReadActivityDate &&
        latestReadActivityDate !== ui.activityLastReadDate
      ) {
        markActivitiesRead({ uiId: ui.id, date: latestReadActivityDate });
      }
    }, [latestReadActivityDate, profile.id, ui.activityLastReadDate, ui.id])
  );

  const renderItem = React.useCallback(
    ({ item, index }: { item: grouping.GroupedActivity; index: number }) => (
      <Item
        canAnalyzeAudio={manageableTeamIds.has(item.activities[0].teamId)}
        group={item}
        className={cn(
          'mt-4',
          index === 0 && 'md:mt-8',
          index === grouped.length - 1 && 'mb-4 md:mb-8'
        )}
      />
    ),
    [grouped.length, manageableTeamIds]
  );

  return (
    <Page>
      <Header title="Activity" />
      {showLoading ? (
        <Loading />
      ) : showEmpty ? (
        <View className="flex-1 py-8 gap-8 items-center justify-center">
          <Icon className="text-primary" icon={Sparkle} size={64} />
        </View>
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          data={grouped}
          estimatedItemSize={80}
          keyExtractor={(item) => item.key}
          onEndReached={loadNextPage}
          onEndReachedThreshold={1}
          renderItem={renderItem}
        />
      )}
    </Page>
  );
}
