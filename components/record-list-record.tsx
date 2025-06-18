import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import schema from '@/instant.schema';
import { formatDate } from '@/utilities/ui/time';
import { InstaQLEntity } from '@instantdb/react-native';
import { MessageCircle, SmilePlus } from 'lucide-react-native';
import { View } from 'react-native';

const RecordListRecord = ({
  record,
}: {
  record: InstaQLEntity<typeof schema, 'records'> & {
    author?: InstaQLEntity<typeof schema, 'profiles'>;
  };
}) => {
  return (
    <View
      className="mt-3 gap-3 rounded-2xl border border-border-secondary bg-card p-4"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="flex-row items-center gap-3">
        <Avatar
          avatar={record.author?.avatar}
          height={44}
          id={record.author?.id}
          width={44}
        />
        <View>
          <Text className="font-medium leading-5">{record.author?.name}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatDate(record.date)}
          </Text>
        </View>
      </View>
      <Text className="select-text" numberOfLines={3}>
        {record.text}
      </Text>
      <View className="mt-1 flex-row justify-end gap-3">
        <Button
          className="size-8 rounded-lg"
          size="icon"
          variant="secondary"
          wrapperClassName="rounded-lg"
        >
          <Icon icon={SmilePlus} size={16} />
        </Button>
        <Button size="xs" variant="secondary">
          <Icon className="-ml-0.5" icon={MessageCircle} size={16} />
          <Text>Comment</Text>
        </Button>
      </View>
    </View>
  );
};

export default RecordListRecord;
