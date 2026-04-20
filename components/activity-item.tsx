import { ActivityItemContent } from '@/components/activity-item-content';
import { ActivityItemMedia } from '@/components/activity-item-media';
import { ActivityItemName } from '@/components/activity-item-name';
import { ActivityItemQuotedRecord } from '@/components/activity-item-quoted-record';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { GroupedActivity } from '@/utilities/group-activities';
import { formatDate } from '@/utilities/time';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

const CATEGORY_LABELS: Record<GroupedActivity['type'], string> = {
  record_published: 'Recorded',
  reply_posted: 'Replied',
  reaction_added: 'Emoted',
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
    if (recordId) router.push(`/record/${recordId}`);
  };

  const mediaSource =
    group.type === 'record_published'
      ? first.record?.media
      : group.type === 'reply_posted'
        ? first.reply?.media
        : undefined;

  const mediaProps =
    group.type === 'record_published'
      ? { media: mediaSource, recordId: first.record?.id }
      : group.type === 'reply_posted'
        ? {
            media: mediaSource,
            recordId: first.record?.id,
            replyId: first.reply?.id,
          }
        : null;

  const hasVisualMedia = mediaSource?.some(
    (m) => m.type === 'image' || m.type === 'video'
  );

  const hasAudioMedia = mediaSource?.some((m) => m.type === 'audio');
  const mediaIsLast = hasVisualMedia && !hasAudioMedia;

  const showQuotedRecord =
    (group.type === 'reply_posted' || group.type === 'reaction_added') &&
    record;

  const content = (
    <Card className={cn('gap-4', !mediaIsLast && 'pb-4', className)}>
      <View className="flex-row items-start gap-3 p-4 pb-0">
        <Avatar avatar={actor?.image?.uri} id={actor?.id} size={38} />
        <View className="flex-1">
          <View className="flex-row items-baseline justify-between gap-3">
            <ActivityItemName group={group} />
            <View className="min-w-32 flex-1 flex-row items-center justify-end gap-1">
              <Text
                className="text-muted-foreground shrink-0 text-xs"
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
                  <View className="shrink flex-row items-center gap-1">
                    <View
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: logColor?.default,
                      }}
                    />
                    <Text
                      className="text-muted-foreground shrink text-xs"
                      numberOfLines={1}
                    >
                      {log.name}
                    </Text>
                  </View>
                )}
              {(group.type === 'member_joined' ||
                group.type === 'member_left') &&
                team?.name && (
                  <View className="shrink flex-row items-center gap-1">
                    <Avatar
                      avatar={team.image?.uri}
                      className="shrink-0"
                      id={team.id}
                      size={10}
                    />
                    <Text
                      className="text-muted-foreground shrink text-xs"
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                  </View>
                )}
            </View>
          </View>
          <Text className="text-muted-foreground text-xs">
            {formatDate(group.latestDate)}
          </Text>
        </View>
      </View>
      {showQuotedRecord && (
        <View className="px-4">
          <ActivityItemQuotedRecord
            logColor={logColor}
            media={record.media}
            recordId={record.id!}
            text={record.text}
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
