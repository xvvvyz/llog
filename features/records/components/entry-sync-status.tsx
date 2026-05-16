import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { CloudSlash } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Icon } from '@/ui/icon';

const EntrySyncStatusComponent = ({
  className,
  status,
}: {
  className?: string;
  status: 'not-synced' | 'retrying' | 'syncing';
}) => (
  <View className={className} pointerEvents="none">
    <View className="flex-row max-w-full min-w-0 px-1.5 py-0.5 border-continuous rounded-full bg-secondary gap-1.5 items-center">
      {status === 'syncing' ? (
        <View className="size-3 items-center justify-center">
          <Spinner className="text-muted-foreground" size="xxs" />
        </View>
      ) : (
        <View className="size-3 items-center justify-center">
          <Icon className="text-muted-foreground" icon={CloudSlash} size={12} />
        </View>
      )}
      <Text
        className="font-normal text-muted-foreground text-xs shrink"
        numberOfLines={1}
      >
        {status === 'syncing'
          ? 'Uploading…'
          : status === 'retrying'
            ? 'Retrying…'
            : 'Queued'}
      </Text>
    </View>
  </View>
);

export const EntrySyncStatus = React.memo(EntrySyncStatusComponent);
