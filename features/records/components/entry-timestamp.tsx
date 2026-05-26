import { type EntrySharedProps } from '@/features/records/types/entry';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/time';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Clock, ClockCountdown } from 'phosphor-react-native';
import { View } from 'react-native';

export const EntryTimestamp = ({
  accentTextClassName,
  className,
  date,
  isScheduled,
  syncStatus,
}: {
  accentTextClassName?: string;
  className?: string;
  date?: Date | string | number | null;
  isScheduled: boolean;
  syncStatus?: EntrySharedProps['syncStatus'];
}) => {
  const normalizedDate = date ?? undefined;

  const scheduledTimeLabel = isScheduled
    ? formatDateTime(normalizedDate)
    : undefined;

  const syncStatusLabel =
    syncStatus === 'uploading'
      ? 'Uploading...'
      : syncStatus === 'queued'
        ? 'Queued'
        : undefined;

  const timeLabel =
    syncStatusLabel ?? scheduledTimeLabel ?? formatDate(normalizedDate);

  const showScheduledTime = isScheduled && !syncStatusLabel;
  const showUploadingStatus = syncStatus === 'uploading';
  const showQueuedStatus = syncStatus === 'queued';

  const indicator = showUploadingStatus ? (
    <View className="absolute -left-px bottom-0 top-0 w-4 items-center justify-center">
      <Spinner className="text-muted-foreground" size="xxs" />
    </View>
  ) : showQueuedStatus ? (
    <View className="absolute -left-px bottom-0 top-0 w-4 items-center justify-center">
      <Icon className="text-muted-foreground" icon={ClockCountdown} size={16} />
    </View>
  ) : showScheduledTime ? (
    <View className="absolute -left-px bottom-0 top-0 w-4 items-center justify-center">
      <Icon
        className={accentTextClassName}
        icon={Clock}
        size={16}
        weight="fill"
      />
    </View>
  ) : null;

  return (
    <View
      className={cn(
        'relative flex-row items-baseline',
        indicator && 'pl-[21px]',
        className
      )}
    >
      <Text
        className={cn(
          'leading-snug text-sm',
          showScheduledTime ? accentTextClassName : 'text-muted-foreground'
        )}
      >
        {timeLabel}
      </Text>
      {indicator}
    </View>
  );
};
