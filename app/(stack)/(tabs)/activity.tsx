import { useProfile } from '@/features/account/queries/use-profile';
import { ActivityItem } from '@/features/activity/components/activity-item';
import * as grouping from '@/features/activity/lib/group-activities';
import { markActivitiesRead } from '@/features/activity/mutations/mark-activities-read';
import { useActivities } from '@/features/activity/queries/use-activities';
import { cn } from '@/lib/cn';
import { useUi } from '@/queries/use-ui';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { useFocusEffect } from 'expo-router';
import { Sparkle } from 'phosphor-react-native/lib/module/icons/Sparkle';
import * as React from 'react';
import { View } from 'react-native';

export default function Activity() {
  const { activities, isLoading, loadNextPage } = useActivities();
  const profile = useProfile();
  const ui = useUi();

  const grouped = React.useMemo(
    () => grouping.groupActivities(activities, profile.id),
    [activities, profile.id]
  );

  const latestActivityDate = grouped[0]?.latestDate;

  useFocusEffect(
    React.useCallback(() => {
      if (
        latestActivityDate &&
        latestActivityDate !== ui.activityLastReadDate
      ) {
        markActivitiesRead({ uiId: ui.id, date: latestActivityDate });
      }
    }, [latestActivityDate, ui.activityLastReadDate, ui.id])
  );

  const renderItem = React.useCallback(
    ({ item, index }: { item: grouping.GroupedActivity; index: number }) => (
      <ActivityItem
        className={cn(
          'mt-4',
          index === 0 && 'md:mt-8',
          index === grouped.length - 1 && 'mb-4 md:mb-8'
        )}
        group={item}
      />
    ),
    [grouped.length]
  );

  return (
    <Page>
      <Header title="Activity" />
      {isLoading || profile.isLoading ? (
        <Loading />
      ) : !grouped.length ? (
        <View className="flex-1 items-center justify-center gap-8 py-8">
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
          waitForInitialLayout
        />
      )}
    </Page>
  );
}
