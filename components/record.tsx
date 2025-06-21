import { Avatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import schema from '@/instant.schema';
import { formatDate } from '@/utilities/ui/time';
import { InstaQLEntity } from '@instantdb/react-native';
import { Fragment } from 'react';
import { View } from 'react-native';

export const Record = ({
  record,
}: {
  record: Partial<
    InstaQLEntity<typeof schema, 'records'> & {
      author?: InstaQLEntity<typeof schema, 'profiles'>;
    }
  >;
}) => {
  return (
    <Fragment>
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
      <Text className="select-text">{record.text}</Text>
    </Fragment>
  );
};
