import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { cn } from '@/lib/cn';
import { Paperclip } from 'phosphor-react-native';
import { View } from 'react-native';

export const AttachmentSummary = ({
  count,
  variant = 'default',
}: {
  count: number;
  variant?: 'compact' | 'default';
}) => {
  const isCompact = variant === 'compact';
  const label = `${count} attachment${count === 1 ? '' : 's'}`;

  return (
    <View
      className={cn('flex-row gap-2 items-center', isCompact ? 'h-6' : 'h-8')}
    >
      <Icon
        className="text-muted-foreground"
        icon={Paperclip}
        size={isCompact ? 16 : 18}
      />
      <Text
        numberOfLines={1}
        className={cn(
          'text-muted-foreground',
          isCompact ? 'text-xs' : 'text-sm'
        )}
      >
        {label}
      </Text>
    </View>
  );
};
