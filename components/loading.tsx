import { View } from '@/components/ui/view';
import { cn } from '@/utilities/cn';
import { ActivityIndicator } from 'react-native';

export function Loading({ className }: { className?: string }) {
  return (
    <View className={cn('flex-1 items-center justify-center', className)}>
      <ActivityIndicator />
    </View>
  );
}
