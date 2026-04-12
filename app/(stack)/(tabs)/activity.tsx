import { ActivityItem } from '@/components/activity-item';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { markActivitiesRead } from '@/mutations/mark-activities-read';
import { useActivities } from '@/queries/use-activities';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { cn } from '@/utilities/cn';
import * as ga from '@/utilities/group-activities';
import { useFocusEffect } from 'expo-router';
import { Sparkle } from 'phosphor-react-native/lib/module/icons/Sparkle';
import * as React from 'react';
import { View } from 'react-native';

export default function Activity() {
  const { activities, isLoading } = useActivities();
  const profile = useProfile();
  const ui = useUi();

  const grouped = React.useMemo(
    () => ga.groupActivities(activities, profile.id),
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
    ({ item, index }: { item: ga.GroupedActivity; index: number }) => (
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
          renderItem={renderItem}
        />
      )}
    </Page>
  );
}
