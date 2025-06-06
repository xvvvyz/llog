import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/ui/utils';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const Loading = ({ className }: { className?: string }) => {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTimeoutMessage(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className={cn('flex-1 items-center justify-center gap-6 p-3', className)}
    >
      <ActivityIndicator />
      {showTimeoutMessage && (
        <Text className="mx-auto max-w-[15rem] text-center text-sm text-placeholder">
          This is taking longer than it should. Is&nbsp;your internet working?
        </Text>
      )}
    </View>
  );
};
