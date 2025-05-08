import { cn } from '@/lib/utils';
import { ActivityIndicator, View } from 'react-native';

interface LoadingProps {
  className?: string;
}

export function Loading({ className }: LoadingProps) {
  return (
    <View className={cn('flex-1 items-center justify-center', className)}>
      <ActivityIndicator />
    </View>
  );
}
