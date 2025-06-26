import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RatioImage } from '@/components/ui/fixed-ratio-image';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Comment } from '@/types/comment';
import { Image as ImageType } from '@/types/image';
import { Profile } from '@/types/profile';
import { Record } from '@/types/record';
import { cn } from '@/utilities/cn';
import { formatDate } from '@/utilities/time';
import { Link } from 'expo-router';
import { MessageCirclePlus, SmilePlus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export const RecordOrComment = ({
  className,
  numberOfLines,
  record,
}: {
  className?: string;
  numberOfLines?: number;
  record: Partial<
    (Record | Comment) & {
      author: Profile & { image?: ImageType };
      comments: Pick<Comment, 'id'>[];
      images: ImageType[];
    }
  >;
}) => {
  const sheetManager = useSheetManager();

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
      {!!record?.images?.length && (
        <List
          data={record.images}
          horizontal
          keyExtractor={(image) => image.id}
          renderItem={({ index, item }) => (
            <Pressable
              onPress={() =>
                sheetManager.open('record-images', record.id, item.id)
              }
            >
              <RatioImage
                className="h-44 xs:h-64"
                key={item.id}
                uri={item.uri}
                wrapperClassName={cn('rounded-xl mr-4', index === 0 && 'ml-4')}
              />
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />
      )}
      <View className="-mt-1 flex-row justify-between gap-3 p-2 pt-0">
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
