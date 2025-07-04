import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { Comment } from '@/types/comment';
import { Image as ImageType } from '@/types/image';
import { Profile } from '@/types/profile';
import { Record as RecordType } from '@/types/record';
import { cn } from '@/utilities/cn';
import { formatDate } from '@/utilities/time';
import { Link, router } from 'expo-router';
import { MessageCirclePlus, SmilePlus } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';

export const RecordOrComment = ({
  className,
  numberOfLines,
  record,
}: {
  className?: string;
  numberOfLines?: number;
  record: Partial<
    (RecordType | Comment) & {
      author: Profile & { image?: ImageType };
      comments: Pick<Comment, 'id'>[];
      images: ImageType[];
    }
  >;
}) => {
  const idIndexMap = useMemo(
    () =>
      (record.images || []).reduce(
        (acc, image, index) => {
          acc[image.id] = index;
          return acc;
        },
        {} as Record<string, number>
      ),
    [record.images]
  );

  const renderImage = useCallback(
    (image: ImageType) => {
      return (
        <Pressable
          className="flex-1"
          key={image.id}
          onPress={() =>
            router.push(
              `/record/${record.id}/images?defaultIndex=${idIndexMap[image.id]}`
            )
          }
        >
          <Image
            contentFit="cover"
            height={record.images!.length < 4 ? 250 : 124}
            maintainAspectRatio={false}
            uri={image.uri}
            wrapperClassName="rounded-2xl"
          />
        </Pressable>
      );
    },
    [idIndexMap, record.id, record.images]
  );

  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row items-center gap-3 p-4 pb-0">
        <Avatar avatar={record.author?.image?.uri} id={record.author?.id} />
        <View>
          <Text className="font-medium leading-5">{record.author?.name}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatDate(record.date)}
          </Text>
        </View>
      </View>
      {record.text && (
        <Text className="select-text px-4" numberOfLines={numberOfLines}>
          {record.text}
        </Text>
      )}
      {!!record.images?.length && (
        <View className="gap-0.5">
          <View className="flex-row gap-0.5">
            {record.images.slice(0, 3).map(renderImage)}
          </View>
          {record.images.length > 3 && (
            <View className="flex-row gap-0.5">
              {record.images.slice(3, 5).map(renderImage)}
            </View>
          )}
        </View>
      )}
      <View className="-mt-1.5 flex-row justify-between gap-3 p-2 pt-0">
        <Button
          className="size-8 rounded-lg"
          size="icon"
          variant="ghost"
          wrapperClassName="rounded-lg"
        >
          <Icon icon={SmilePlus} size={20} />
        </Button>
        {!!record.comments && (
          <Link asChild href={`/record/${record.id}?focus=comment`}>
            <Button size="xs" variant="ghost">
              <Text className="text-sm font-normal text-muted-foreground">
                {record.comments.length} repl
                {record.comments.length === 1 ? 'y' : 'ies'}
              </Text>
              <Icon
                className="-mr-0.5 text-muted-foreground"
                icon={MessageCirclePlus}
                size={20}
              />
            </Button>
          </Link>
        )}
      </View>
    </Card>
  );
};
