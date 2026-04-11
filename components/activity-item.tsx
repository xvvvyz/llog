import { AudioPlaylist } from '@/components/ui/audio-player';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { REACTION_ICONS } from '@/enums/emojis';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { SPECTRUM } from '@/theme/spectrum';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { GroupedActivity } from '@/utilities/group-activities';
import { formatDate } from '@/utilities/time';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native';
import { Pressable, ScrollView, View } from 'react-native';

const CATEGORY_LABELS: Record<string, string> = {
  record_published: 'Record',
  comment_posted: 'Reply',
  reaction_added: 'Emote',
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
  if (!first) return null;
  const actor = first.actor;
  const log = first.log;
  const record = first.record;
  const team = first.team;
  const logColor = log?.color != null ? SPECTRUM[colorScheme][log.color] : null;
  const category = CATEGORY_LABELS[group.type] ?? '';

  const handlePress = () => {
    const recordId = record?.id;
    if (recordId) router.push(`/record/${recordId}`);
  };

  const mediaSource =
    group.type === 'record_published'
      ? first.record?.media
      : group.type === 'comment_posted'
        ? first.comment?.media
        : undefined;

  const mediaProps =
    group.type === 'record_published'
      ? { media: mediaSource, recordId: first.record?.id }
      : group.type === 'comment_posted'
        ? {
            media: mediaSource,
            recordId: first.record?.id,
            commentId: first.comment?.id,
          }
        : null;

  const hasVisualMedia = mediaSource?.some(
    (m) => m.type === 'image' || m.type === 'video'
  );

  const hasAudioMedia = mediaSource?.some((m) => m.type === 'audio');
  const mediaIsLast = hasVisualMedia && !hasAudioMedia;

  const showQuotedRecord =
    (group.type === 'comment_posted' || group.type === 'reaction_added') &&
    record;

  return (
    <Pressable onPress={handlePress}>
      <Card className={cn('gap-4', !mediaIsLast && 'pb-4', className)}>
        <View className="flex-row items-start gap-3 p-4 pb-0">
          <Avatar avatar={actor?.image?.uri} id={actor?.id} size={34} />
          <View className="-mt-0.5 flex-1">
            <View className="flex-row items-baseline justify-between gap-3">
              <ActivityName group={group} />
              <View className="min-w-32 flex-1 flex-row items-center justify-end gap-1">
                <Text
                  className="shrink-0 text-xs text-muted-foreground"
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
                          backgroundColor: logColor?.default ?? undefined,
                        }}
                      />
                      <Text
                        className="shrink text-xs text-muted-foreground"
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
                      <Avatar className="shrink-0" id={team.id} size={10} />
                      <Text
                        className="shrink text-xs text-muted-foreground"
                        numberOfLines={1}
                      >
                        {team.name}
                      </Text>
                    </View>
                  )}
              </View>
            </View>
            <Text className="text-xs text-muted-foreground">
              {formatDate(group.latestDate)}
            </Text>
          </View>
        </View>
        {showQuotedRecord && (
          <View className="px-4">
            <QuotedRecord
              logColor={logColor}
              media={record.media}
              recordId={record.id!}
              text={record.text}
            />
          </View>
        )}
        <ActivityContent group={group} logColor={logColor} />
        {mediaProps && <ActivityMedia {...mediaProps} />}
      </Card>
    </Pressable>
  );
};

const QuotedRecord = ({
  logColor,
  media,
  recordId,
  text,
}: {
  logColor: { lighter: string; default: string; darker: string } | null;
  media?: Media[];
  recordId: string;
  text?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
  if (!text && !visualMedia.length && !audioMedia.length) return null;

  return (
    <View
      className={cn(
        'max-w-full overflow-hidden rounded-xl bg-input',
        !audioMedia.length && 'self-start'
      )}
    >
      {!!text && (
        <View className="flex-row gap-3 p-3">
          <View
            className="w-1 self-stretch rounded-full bg-border"
            style={logColor ? { backgroundColor: logColor.default } : undefined}
          />
          <Text
            className="flex-1 text-sm text-muted-foreground"
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
      )}
      {!!visualMedia.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: text ? 0 : 12,
            paddingBottom: 12,
          }}
        >
          <View className="flex-row gap-0.5">
            {visualMedia.map((item) => (
              <Pressable
                key={item.id}
                className="overflow-hidden rounded-lg"
                style={{ width: 64, height: 64 }}
                onPress={() =>
                  router.push({
                    pathname: `/record/[recordId]/media`,
                    params: {
                      recordId,
                      defaultIndex: String(visualMedia.indexOf(item)),
                    },
                  })
                }
              >
                <Image
                  fill
                  uri={item.type === 'video' ? item.previewUri! : item.uri}
                />
                {item.type === 'video' && (
                  <View
                    className="absolute inset-0 items-center justify-center"
                    pointerEvents="none"
                  >
                    <View
                      className="items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      }}
                    >
                      <Icon
                        className="ml-0.5 text-white"
                        icon={Play}
                        size={12}
                        weight="fill"
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {audioMedia.length > 0 && (
        <View
          className={cn(
            'gap-2 px-3 pb-3',
            !text && !visualMedia.length && 'pt-3'
          )}
        >
          <AudioPlaylist clips={audioMedia} compact />
        </View>
      )}
    </View>
  );
};

const ActivityMedia = ({
  media,
  recordId,
  commentId,
}: {
  media?: Media[];
  recordId?: string;
  commentId?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
  if (!visualMedia.length && !audioMedia.length) return null;

  const renderMediaThumb = (item: Media) => (
    <Pressable
      className="flex-1"
      key={item.id}
      onPress={() =>
        recordId &&
        router.push({
          pathname: `/record/[recordId]/media`,
          params: {
            recordId,
            ...(commentId && { commentId }),
            defaultIndex: String(visualMedia.indexOf(item)),
          },
        })
      }
    >
      <Image
        fill
        uri={item.type === 'video' ? item.previewUri! : item.uri}
        wrapperClassName="rounded-2xl"
      />
      {item.type === 'video' && (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Icon
              className="ml-0.5 text-white"
              icon={Play}
              size={20}
              weight="fill"
            />
          </View>
        </View>
      )}
    </Pressable>
  );

  return (
    <>
      {!!visualMedia.length && (
        <View className="gap-0.5" style={{ aspectRatio: 3 / 2 }}>
          <View className="flex-1 flex-row gap-0.5">
            {visualMedia.slice(0, 3).map(renderMediaThumb)}
          </View>
          {visualMedia.length > 3 && (
            <View className="flex-1 flex-row gap-0.5">
              {visualMedia.slice(3, 6).map(renderMediaThumb)}
            </View>
          )}
        </View>
      )}
      {audioMedia.length > 0 && (
        <View className="gap-2 px-4">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
    </>
  );
};

const ActivityName = ({ group }: { group: GroupedActivity }) => {
  const { type, activities } = group;
  const first = activities[0];
  const actor = first?.actor;

  if (type === 'reaction_added') {
    const uniqueActors = [...new Set(activities.map((a) => a.actor?.id))];
    const othersCount = uniqueActors.length - 1;

    return (
      <Text className="shrink text-sm leading-5" numberOfLines={1}>
        <Text className="text-sm font-medium leading-5">{actor?.name}</Text>
        {othersCount > 0 && (
          <Text className="text-muted-foreground">{` +${othersCount}`}</Text>
        )}
      </Text>
    );
  }

  return (
    <Text className="shrink text-sm font-medium leading-5" numberOfLines={1}>
      {actor?.name}
    </Text>
  );
};

const ActivityContent = ({
  group,
  logColor,
}: {
  group: GroupedActivity;
  logColor: { lighter: string; default: string; darker: string } | null;
}) => {
  const { type, activities } = group;
  const first = activities[0];
  const commentText = first?.comment?.text;

  switch (type) {
    case 'record_published': {
      return first?.record?.text ? (
        <Text className="px-4" numberOfLines={2}>
          {first.record.text}
        </Text>
      ) : null;
    }

    case 'comment_posted': {
      return commentText ? (
        <Text className="px-4" numberOfLines={2}>
          {commentText}
        </Text>
      ) : null;
    }

    case 'reaction_added': {
      const emojis = [
        ...new Set(activities.map((a) => a.emoji).filter(Boolean)),
      ];

      const reactionIcons = emojis
        .map((e) => REACTION_ICONS[e as keyof typeof REACTION_ICONS])
        .filter(Boolean);

      return reactionIcons.length > 0 ? (
        <View className="flex-row gap-1 px-4">
          {reactionIcons.map((icon, i) => (
            <Icon
              key={emojis[i]}
              className="text-muted-foreground"
              icon={icon}
              style={logColor ? { color: logColor.default } : undefined}
              weight="fill"
            />
          ))}
        </View>
      ) : null;
    }

    case 'member_joined': {
      return null;
    }

    default: {
      return null;
    }
  }
};
