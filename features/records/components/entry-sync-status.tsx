import { cn } from '@/lib/cn';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Icon } from '@/ui/icon';
import { Clock } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

const EntrySyncStatusComponent = ({
  className,
  status,
}: {
  className?: string;
  status: 'queued' | 'uploading';
}) => (
  <View className={cn('pointer-events-none', className)}>
    <View className="flex-row max-w-full min-w-0 px-1.5 py-0.5 border-continuous rounded-full bg-secondary gap-1.5 items-center">
      {status === 'uploading' ? (
        <View className="size-3 items-center justify-center">
          <Spinner className="text-muted-foreground" size="xxs" />
        </View>
      ) : (
        <View className="size-3 items-center justify-center">
          <Icon className="text-muted-foreground" icon={Clock} size={12} />
        </View>
      )}
      <Text
        className="font-normal text-muted-foreground text-xs shrink"
        numberOfLines={1}
      >
        {status === 'uploading' ? 'Uploading...' : 'Queued'}
      </Text>
    </View>
  </View>
);

export const EntrySyncStatus = React.memo(EntrySyncStatusComponent);
