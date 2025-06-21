import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import schema from '@/instant.schema';
import { cn } from '@/utilities/ui/utils';
import { InstaQLEntity } from '@instantdb/react-native';
import { Link } from 'expo-router';
import { MessageCirclePlus, SmilePlus } from 'lucide-react-native';
import { View } from 'react-native';
import { Record } from './record';

const RecordListItem = ({
  className,
  record,
}: {
  className?: string;
  record: InstaQLEntity<typeof schema, 'records'> & {
    author?: InstaQLEntity<typeof schema, 'profiles'>;
    comments: { id: string }[];
  };
}) => (
  <Card className={cn('p-0', className)}>
    <Link href={`/record/${record.id}`} suppressHighlighting>
      <View className="gap-3 p-4 pb-2">
        <Record record={record} />
      </View>
    </Link>
    <View className="flex-row justify-between gap-3 px-4 pb-2">
      <Button
        className="size-8 rounded-lg"
        size="icon"
        variant="ghost"
        wrapperClassName="-ml-2 rounded-lg"
      >
        <Icon icon={SmilePlus} size={20} />
      </Button>
      <Link asChild href={`/record/${record.id}?focus=comment`}>
        <Button size="xs" variant="ghost" wrapperClassName="-mr-2">
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
    </View>
  </Card>
);

export default RecordListItem;
