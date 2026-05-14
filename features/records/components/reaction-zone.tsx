import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const ReactionZone = ({
  className,
  disabled,
  onDoubleTap,
}: {
  className?: string;
  disabled?: boolean;
  onDoubleTap: () => void;
}) => {
  const gesture = React.useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(260)
        .maxDistance(12)
        .onEnd(() => {
          if (disabled) return;
          onDoubleTap();
        })
        .runOnJS(true),
    [disabled, onDoubleTap]
  );

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View className={cn('min-h-8 flex-1 self-stretch', className)} />
    </GestureDetector>
  );
};
