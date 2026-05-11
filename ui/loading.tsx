import { cn } from '@/lib/cn';
import { Spinner } from '@/ui/spinner';
import { View } from 'react-native';

export const Loading = ({ className }: { className?: string }) => {
  return (
    <View
      className={cn(
        'bg-background flex-1 items-center justify-center gap-6 p-3',
        className
      )}
    >
      <Spinner />
    </View>
  );
};
