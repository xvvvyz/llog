import { ItemContent } from '@/features/activity/components/item-content';
import { ItemFiles } from '@/features/activity/components/item-files';
import { QuotedRecord } from '@/features/activity/components/quoted-record';
import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { openRecordDetail } from '@/features/records/lib/route';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { SPECTRUM } from '@/theme/spectrum';
import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { Pressable, View } from 'react-native';

const CATEGORY_LABELS: Record<GroupedActivity['type'], string> = {
  record_published: 'recorded',
  reply_posted: 'replied',
  reaction_added: 'reacted',
  member_joined: 'joined',
  member_left: 'left',
};

export const Item = ({
  canAnalyzeAudio,
  className,
  group,
}: {
  canAnalyzeAudio: boolean;
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
  const uniqueActors = [...new Set(group.activities.map((a) => a.actor?.id))];

  const othersCount =
    group.type === 'reaction_added' ? uniqueActors.length - 1 : 0;

  const activityLabel =
    group.type === 'member_joined'
      ? `joined${team?.name ? '' : ' the team'}`
      : group.type === 'member_left'
        ? `left${team?.name ? '' : ' the team'}`
        : category + (log ? ' in' : '');

  const handlePress = () => {
    openRecordDetail(record?.id, first.reply?.id);
  };

  const fileSource =
    group.type === 'record_published'
      ? first.record?.files
      : group.type === 'reply_posted'
        ? first.reply?.files
        : undefined;

  const linkSource =
    group.type === 'record_published'
      ? first.record?.links
      : group.type === 'reply_posted'
        ? first.reply?.links
        : undefined;

  const fileProps =
    group.type === 'record_published'
      ? { links: linkSource, files: fileSource, recordId: record?.id }
      : group.type === 'reply_posted'
        ? { links: linkSource, files: fileSource, recordId: record?.id }
        : null;

  const hasVisualFiles = fileSource?.some(
    (m) => m.type === 'image' || m.type === 'video'
  );

  const hasAudioFiles = fileSource?.some((m) => m.type === 'audio');
  const hasDocumentFiles = fileSource?.some((m) => m.type === 'document');

  const filesAreLast =
    hasVisualFiles &&
    !hasAudioFiles &&
    !hasDocumentFiles &&
    !linkSource?.length;

  const showQuotedRecord =
    (group.type === 'reply_posted' || group.type === 'reaction_added') &&
    record;

  const quotedRecordText = trimDisplayText(record?.text);

  const content = (
    <Card className={cn('gap-4', !filesAreLast && 'pb-4', className)}>
      <View className="flex-row p-4 pb-0 gap-2.5 items-center">
        <Avatar
          avatar={actor?.image?.uri}
          className="border-border-secondary border"
          id={actor?.id}
          seedId={actor?.avatarSeedId}
          size={32}
        />
        <View className="flex-1">
          <View className="flex-row gap-1 items-center">
            <Text className="text-xs shrink" numberOfLines={1}>
              {actor?.name}
              {othersCount > 0 && (
                <Text className="text-muted-foreground text-xs">{` +${othersCount}`}</Text>
              )}
              <Text className="text-muted-foreground text-xs">
                {' '}
                {activityLabel}
              </Text>
            </Text>
            {log &&
              group.type !== 'member_joined' &&
              group.type !== 'member_left' && (
                <View className="flex-row gap-1 items-center shrink">
                  <View
                    className="size-2.5 border-continuous rounded-xs shrink-0"
                    style={{ backgroundColor: logColor?.default }}
                  />
                  <Text className="text-xs shrink" numberOfLines={1}>
                    {log.name}
                  </Text>
                </View>
              )}
            {(group.type === 'member_joined' || group.type === 'member_left') &&
              team?.name && (
                <View className="flex-row gap-1 items-center shrink">
                  <Avatar
                    avatar={team.image?.uri}
                    className="shrink-0"
                    fallback="gradient"
                    id={team.id}
                    size={10}
                  />
                  <Text className="text-xs shrink" numberOfLines={1}>
                    {team.name}
                  </Text>
                </View>
              )}
          </View>
          <Text className="text-muted-foreground text-xs">
            {formatDate(group.latestDate)}
          </Text>
        </View>
      </View>
      {showQuotedRecord && (
        <View className="px-4">
          <QuotedRecord
            canAnalyzeAudio={canAnalyzeAudio}
            files={record.files}
            links={record.links}
            logColor={logColor}
            recordId={record.id}
            text={quotedRecordText}
          />
        </View>
      )}
      <ItemContent group={group} logColor={logColor} />
      {fileProps && (
        <ItemFiles canAnalyzeAudio={canAnalyzeAudio} {...fileProps} />
      )}
    </Card>
  );

  if (!isClickable) return content;
  return <Pressable onPress={handlePress}>{content}</Pressable>;
};
