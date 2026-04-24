import { ActivityItemContent } from '@/features/activity/components/activity-item-content';
import { ActivityItemMedia } from '@/features/activity/components/activity-item-media';
import { ActivityItemName } from '@/features/activity/components/activity-item-name';
import { ActivityItemQuotedRecord } from '@/features/activity/components/activity-item-quoted-record';
import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { SPECTRUM } from '@/theme/spectrum';
import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

const CATEGORY_LABELS: Record<GroupedActivity['type'], string> = {
  record_published: 'Recorded',
  reply_posted: 'Replied',
  reaction_added: 'Reacted',
  member_joined: 'Joined',
  member_left: 'Left',
};

export const ActivityItem = ({
  className,
  group,
}: {
  className?: string;
  group: GroupedActivity;
}) => {
  const colorScheme = useColorScheme();
  const first = group.activities[0];
  const actor = first.actor;
  const log = first.log;
  const record = first.record;
  const team = first.team;
  const logColor = log?.color != null ? SPECTRUM[colorScheme][log.color] : null;
  const category = CATEGORY_LABELS[group.type];
  const isClickable = Boolean(record?.id);

  const handlePress = () => {
    const recordId = record?.id;
    if (recordId) router.setParams({ recordId });
  };

  const mediaSource =
    group.type === 'record_published'
      ? first.record?.media
      : group.type === 'reply_posted'
        ? first.reply?.media
        : undefined;

  const mediaProps =
    group.type === 'record_published'
      ? { media: mediaSource }
      : group.type === 'reply_posted'
        ? { media: mediaSource }
        : null;

  const hasVisualMedia = mediaSource?.some(
    (m) => m.type === 'image' || m.type === 'video'
  );

  const hasAudioMedia = mediaSource?.some((m) => m.type === 'audio');
  const mediaIsLast = hasVisualMedia && !hasAudioMedia;

  const showQuotedRecord =
    (group.type === 'reply_posted' || group.type === 'reaction_added') &&
    record;

  const quotedRecordText = trimDisplayText(record?.text);

  const content = (
    <Card className={cn('gap-4', !mediaIsLast && 'pb-4', className)}>
      <View className="flex-row p-4 pb-0 gap-3 items-start">
        <Avatar
          avatar={actor?.image?.uri}
          id={actor?.id}
          seedId={actor?.avatarSeedId}
          size={32}
        />
        <View className="flex-1">
          <View className="flex-row gap-3 items-baseline justify-between">
            <ActivityItemName group={group} />
            <View className="flex-1 flex-row min-w-32 gap-1 items-center justify-end">
              <Text
                className="text-muted-foreground text-xs shrink-0"
                numberOfLines={1}
              >
                {group.type === 'member_joined'
                  ? `Joined${team?.name ? '' : ' the team'}`
                  : group.type === 'member_left'
                    ? `Left${team?.name ? '' : ' the team'}`
                    : category + (log ? ' in' : '')}
              </Text>
              {log &&
                group.type !== 'member_joined' &&
                group.type !== 'member_left' && (
                  <View className="flex-row gap-1 items-center shrink">
                    <View
                      className="size-2.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: logColor?.default }}
                    />
                    <Text
                      className="text-muted-foreground text-xs shrink"
                      numberOfLines={1}
                    >
                      {log.name}
                    </Text>
                  </View>
                )}
              {(group.type === 'member_joined' ||
                group.type === 'member_left') &&
                team?.name && (
                  <View className="flex-row gap-1 items-center shrink">
                    <Avatar
                      avatar={team.image?.uri}
                      className="shrink-0"
                      fallback="gradient"
                      id={team.id}
                      size={10}
                    />
                    <Text
                      className="text-muted-foreground text-xs shrink"
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </View>
                )}
            </View>
          </View>
          <Text className="leading-tight text-muted-foreground text-xs">
            {formatDate(group.latestDate)}
          </Text>
        </View>
      </View>
      {showQuotedRecord && (
        <View className="px-4">
          <ActivityItemQuotedRecord
            logColor={logColor}
            media={record.media}
            text={quotedRecordText}
          />
        </View>
      )}
      <ActivityItemContent group={group} logColor={logColor} />
      {mediaProps && <ActivityItemMedia {...mediaProps} />}
    </Card>
  );

  if (!isClickable) return content;
  return <Pressable onPress={handlePress}>{content}</Pressable>;
};
