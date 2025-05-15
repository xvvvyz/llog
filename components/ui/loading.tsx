import { cn } from '@/utilities/cn';
import { ActivityIndicator, View } from 'react-native';

export function Loading({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'flex-1 items-center justify-center bg-background',
        className
      )}
    >
      <ActivityIndicator />
    </View>
  );
}
