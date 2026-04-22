import { cn } from '@/lib/cn';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const Loading = ({ className }: { className?: string }) => {
  const [showTimeoutMessage, setShowTimeoutMessage] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowTimeoutMessage(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className={cn(
        'bg-background flex-1 items-center justify-center gap-6 p-3',
        className
      )}
    >
      <Spinner />
      {showTimeoutMessage && (
        <Text className="text-placeholder mx-auto max-w-[15rem] text-center text-sm">
          This is taking longer than it should. Is&nbsp;your internet working?
        </Text>
      )}
    </View>
  );
};
